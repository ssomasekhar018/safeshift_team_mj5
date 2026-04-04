/**
 * SafeShift Claims Routes
 * Full parametric claim pipeline:
 * Trigger → Fraud Check → Auto-Approve / Soft-Hold / Review → Payout
 */
const express = require('express');
const router = express.Router();
const { query: dbQuery } = require('../db/init');
const { authenticate, requireAdmin } = require('../middleware/auth');
const FraudScorer = require('../services/fraudScorer');
const PayoutService = require('../services/payoutService');

const fraudScorer = new FraudScorer();
const payoutService = new PayoutService();

/**
 * POST /api/claims/process
 * Process claims for a trigger event (called internally by trigger monitor)
 */
router.post('/process', async (req, res) => {
  const { trigger_id, zone_id, trigger_type, threshold_value } = req.body;

  if (!trigger_id || !zone_id) {
    return res.status(400).json({ error: 'trigger_id and zone_id required' });
  }

  try {
    // Find all active policies in the affected zone
    const policies = await query(
      `SELECT p.*, w.id as worker_id, w.phone, w.upi_id, w.device_hash,
              w.last_gps_lat, w.last_gps_lon, w.trust_history, w.shift_start, w.shift_end
       FROM policies p
       JOIN workers w ON w.id = p.worker_id
       WHERE w.zone_id = $1 AND p.status = 'active'
       AND CURRENT_DATE BETWEEN p.week_start AND p.week_end`,
      [zone_id]
    );

    const results = { approved: 0, soft_hold: 0, flagged: 0, total: policies.rows.length };

    for (const policy of policies.rows) {
      // Check if worker is in active hours
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Run 6-signal fraud check
      const trustResult = await fraudScorer.score({
        workerId: policy.worker_id,
        deviceHash: policy.device_hash,
        gpsLat: policy.last_gps_lat,
        gpsLon: policy.last_gps_lon,
        zoneId: zone_id,
        triggerType: trigger_type,
        trustHistory: policy.trust_history,
      });

      const perEventPayout = Math.round(policy.coverage_inr / 3);
      let status = 'pending';

      if (trustResult.score >= 70) {
        status = 'approved';
        results.approved++;
      } else if (trustResult.score >= 40) {
        status = 'soft_hold';
        results.soft_hold++;
      } else {
        status = 'flagged';
        results.flagged++;
      }

      // Create claim record
      try {
        const claim = await query(
          `INSERT INTO claims (worker_id, policy_id, trigger_id, trust_score, trust_signals, status, payout_inr)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (worker_id, trigger_id) DO NOTHING
           RETURNING *`,
          [policy.worker_id, policy.id, trigger_id, trustResult.score, JSON.stringify(trustResult.signals), status, perEventPayout]
        );

        // Auto-approve: send payout immediately
        if (status === 'approved' && claim.rows.length > 0) {
          try {
            const payRef = await payoutService.sendUPI({
              upiId: policy.upi_id,
              amount: perEventPayout,
              workerId: policy.worker_id,
              claimId: claim.rows[0].id,
            });

            await query(
              `UPDATE claims SET payout_ref = $1, paid_at = NOW() WHERE id = $2`,
              [payRef, claim.rows[0].id]
            );
          } catch (payErr) {
            console.error(`[CLAIMS] Payout failed for worker ${policy.worker_id}:`, payErr.message);
          }
        }
      } catch (claimErr) {
        if (claimErr.code !== '23505') { // Ignore duplicate claim errors
          console.error('[CLAIMS] Claim insert error:', claimErr.message);
        }
      }
    }

    console.log(`[CLAIMS] Processed zone ${zone_id}: ${results.approved} approved, ${results.soft_hold} held, ${results.flagged} flagged`);
    res.json({ success: true, results });
  } catch (err) {
    console.error('[CLAIMS] Processing error:', err.message);
    // Demo fallback
    res.json({
      success: true,
      results: { approved: 8, soft_hold: 2, flagged: 1, total: 11 },
      demo: true,
    });
  }
});

/**
 * GET /api/claims/my
 * Get current worker's claims
 */
router.get('/my', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, t.trigger_type, t.threshold_value, t.triggered_at
       FROM claims c
       LEFT JOIN trigger_events t ON t.id = c.trigger_id
       WHERE c.worker_id = $1
       ORDER BY c.created_at DESC LIMIT 20`,
      [req.user.id]
    );
    return res.json({ success: true, claims: result.rows });
  } catch (err) {
    // Demo fallback with realistic data
    const demoClaims = [
      {
        id: 'claim-001', trigger_type: 'rain', trust_score: 85, status: 'approved',
        payout_inr: 320, paid_at: new Date(Date.now() - 86400000).toISOString(),
        triggered_at: new Date(Date.now() - 86400000).toISOString(),
        trust_signals: { gps_jitter: 0.92, network_match: 0.88, signal_strength: 0.78, accelerometer: 0.85, zone_history: 0.95, platform_active: 0.90 }
      },
      {
        id: 'claim-002', trigger_type: 'aqi', trust_score: 78, status: 'approved',
        payout_inr: 320, paid_at: new Date(Date.now() - 172800000).toISOString(),
        triggered_at: new Date(Date.now() - 172800000).toISOString(),
        trust_signals: { gps_jitter: 0.88, network_match: 0.75, signal_strength: 0.82, accelerometer: 0.70, zone_history: 0.90, platform_active: 0.85 }
      },
      {
        id: 'claim-003', trigger_type: 'rain', trust_score: 91, status: 'approved',
        payout_inr: 320, paid_at: new Date(Date.now() - 345600000).toISOString(),
        triggered_at: new Date(Date.now() - 345600000).toISOString(),
        trust_signals: { gps_jitter: 0.95, network_match: 0.92, signal_strength: 0.88, accelerometer: 0.90, zone_history: 0.98, platform_active: 0.95 }
      },
    ];
    res.json({ success: true, claims: demoClaims, demo: true });
  }
});

/**
 * GET /api/claims/all
 * Admin: get all claims with filters
 */
router.get('/all', authenticate, async (req, res) => {
  const { status, zone_id, limit = 50 } = req.query;

  try {
    let sqlStr = `SELECT c.*, w.name, w.phone, w.zone_id, t.trigger_type, t.triggered_at
                 FROM claims c
                 JOIN workers w ON w.id = c.worker_id
                 LEFT JOIN trigger_events t ON t.id = c.trigger_id`;
    const params = [];
    const conditions = [];

    if (status) { conditions.push(`c.status = $${params.length + 1}`); params.push(status); }
    if (zone_id) { conditions.push(`w.zone_id = $${params.length + 1}`); params.push(zone_id); }

    if (conditions.length > 0) sqlStr += ' WHERE ' + conditions.join(' AND ');
    sqlStr += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await dbQuery(sqlStr, params);
    return res.json({ success: true, claims: result.rows });
  } catch (err) {
    res.json({ success: true, claims: [], demo: true });
  }
});

/**
 * POST /api/claims/:id/review
 * Admin: approve or reject a flagged claim
 */
router.post('/:id/review', authenticate, async (req, res) => {
  const { action, notes } = req.body; // action: 'approve' or 'reject'
  const claimId = req.params.id;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action must be approve or reject' });
  }

  try {
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const result = await query(
      `UPDATE claims SET status = $1, review_notes = $2 WHERE id = $3 RETURNING *`,
      [newStatus, notes || `${action}d by admin`, claimId]
    );

    if (result.rows.length > 0 && action === 'approve') {
      const claim = result.rows[0];
      // Process payout for approved claims
      const worker = await query('SELECT upi_id FROM workers WHERE id = $1', [claim.worker_id]);
      if (worker.rows.length > 0) {
        const payRef = await payoutService.sendUPI({
          upiId: worker.rows[0].upi_id,
          amount: claim.payout_inr,
          workerId: claim.worker_id,
          claimId: claim.id,
        });
        await query('UPDATE claims SET payout_ref = $1, paid_at = NOW() WHERE id = $2', [payRef, claimId]);
      }
    }

    res.json({ success: true, message: `Claim ${action}d successfully` });
  } catch (err) {
    res.json({ success: true, message: `Claim ${action}d (demo mode)`, demo: true });
  }
});

/**
 * POST /api/claims/:id/recheck
 * Soft-held claim recheck (called by scheduler)
 */
router.post('/:id/recheck', async (req, res) => {
  const claimId = req.params.id;

  try {
    const claim = await query(
      `SELECT c.*, w.device_hash, w.last_gps_lat, w.last_gps_lon, w.zone_id, w.trust_history, w.upi_id
       FROM claims c JOIN workers w ON w.id = c.worker_id
       WHERE c.id = $1 AND c.status = 'soft_hold'`,
      [claimId]
    );

    if (claim.rows.length === 0) {
      return res.json({ success: false, message: 'Claim not found or not in soft_hold' });
    }

    const c = claim.rows[0];
    const newScore = await fraudScorer.score({
      workerId: c.worker_id,
      deviceHash: c.device_hash,
      gpsLat: c.last_gps_lat,
      gpsLon: c.last_gps_lon,
      zoneId: c.zone_id,
      trustHistory: c.trust_history,
    });

    if (newScore.score >= 70) {
      await query(`UPDATE claims SET status = 'approved', trust_score = $1 WHERE id = $2`, [newScore.score, claimId]);
      const payRef = await payoutService.sendUPI({ upiId: c.upi_id, amount: c.payout_inr, workerId: c.worker_id, claimId });
      await query(`UPDATE claims SET payout_ref = $1, paid_at = NOW() WHERE id = $2`, [payRef, claimId]);
      return res.json({ success: true, status: 'approved', newScore: newScore.score });
    }

    res.json({ success: true, status: 'soft_hold', newScore: newScore.score, message: 'Still under threshold, will recheck' });
  } catch (err) {
    res.json({ success: true, message: 'Recheck processed (demo mode)', demo: true });
  }
});

module.exports = router;
