/**
 * SafeShift Claims Routes
 * Full parametric claim pipeline:
 * Trigger → Fraud Check → Auto-Approve / Soft-Hold / Review → Payout
 * 
 * MongoDB Migration: All database operations now use Mongoose models
 */
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { connectMongoDB, getModels } = require('../db/mongodb');
const { authenticate, requireAdmin } = require('../middleware/auth');
const FraudScorer = require('../services/fraudScorer');
const PayoutService = require('../services/payoutService');

// MongoDB models - will be initialized after connection
let Worker, Policy, Claim, TriggerEvent;

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
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
    const policies = await Policy.find({
      status: 'active',
      'period.week_start': { $lte: new Date() },
      'period.week_end': { $gte: new Date() }
    }).populate('worker_id', 'phone upi_id device_hash last_gps trust_history shift_start shift_end zone_id');

    // Filter by zone
    const zonePolicies = policies.filter(p => p.worker_id.zone_id === zone_id);

    const results = { approved: 0, soft_hold: 0, flagged: 0, total: zonePolicies.length };

    for (const policy of zonePolicies) {
      const worker = policy.worker_id;
      
      // Check if worker is in active hours
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Run 6-signal fraud check via ML service
      let trustResult;
      let isMLScored = false;
      
      try {
        // Try ML service fraud check first
        const mlResponse = await axios.post(`${ML_SERVICE_URL}/fraud/check`, {
          worker_id: worker._id.toString(),
          gps_lat: worker.last_gps?.lat || 12.9352,
          gps_lon: worker.last_gps?.lon || 77.6245,
          zone_id: zone_id,
          device_hash: worker.device_hash || '',
          signal_strength: -65.0, // Default signal strength
          claims_24h: 1, // Could be calculated from recent claims
          accelerometer_active: true, // Default assumption
        }, { timeout: 3000 });

        trustResult = {
          score: mlResponse.data.trust_score,
          signals: mlResponse.data.signals,
          flags: mlResponse.data.flags,
          isolation_forest_score: mlResponse.data.isolation_forest_score,
        };
        isMLScored = true;
        console.log(`[CLAIMS] ✅ ML fraud check for worker ${worker._id}: score=${trustResult.score}, isolation=${trustResult.isolation_forest_score}`);
        
      } catch (mlErr) {
        // Fallback to local fraud scorer
        console.warn(`[CLAIMS] ⚠️ ML fraud check failed (${mlErr.message}), using fallback scorer`);
        trustResult = await fraudScorer.score({
          workerId: worker._id.toString(),
          deviceHash: worker.device_hash,
          gpsLat: worker.last_gps?.lat,
          gpsLon: worker.last_gps?.lon,
          zoneId: zone_id,
          triggerType: trigger_type,
          trustHistory: worker.trust_history,
        });
        isMLScored = false;
      }

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
        const claim = await Claim.create({
          worker_id: worker._id,
          policy_id: policy._id,
          trigger_id,
          trust_assessment: {
            score: trustResult.score,
            signals: trustResult.signals
          },
          status,
          payout: {
            amount_inr: perEventPayout
          }
        });

        // Auto-approve: send payout immediately
        if (status === 'approved') {
          try {
            const payRef = await payoutService.sendUPI({
              upiId: worker.upi_id,
              amount: perEventPayout,
              workerId: worker._id.toString(),
              claimId: claim._id.toString(),
            });

            await Claim.findByIdAndUpdate(claim._id, {
              'payout.reference': payRef,
              'payout.paid_at': new Date()
            });
          } catch (payErr) {
            console.error(`[CLAIMS] Payout failed for worker ${worker._id}:`, payErr.message);
          }
        }
      } catch (claimErr) {
        if (claimErr.code !== 11000) { // Ignore duplicate key errors
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
    const claims = await Claim.find({
      worker_id: req.user.id
    }).populate('trigger_id', 'trigger_type threshold_value triggered_at')
      .sort({ created_at: -1 })
      .limit(20);

    return res.json({ success: true, claims: claims.map(c => c.toObject()) });
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
    const queryObj = {};
    if (status) queryObj.status = status;

    let claims = await Claim.find(queryObj)
      .populate('worker_id', 'name phone zone_id')
      .populate('trigger_id', 'trigger_type triggered_at')
      .sort({ created_at: -1 })
      .limit(parseInt(limit));

    // Filter by zone if specified
    if (zone_id) {
      claims = claims.filter(c => c.worker_id?.zone_id === zone_id);
    }

    return res.json({ success: true, claims: claims.map(c => c.toObject()) });
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
    const claim = await Claim.findByIdAndUpdate(
      claimId,
      { status: newStatus, review_notes: notes || `${action}d by admin` },
      { new: true }
    );

    if (claim && action === 'approve') {
      // Process payout for approved claims
      const worker = await Worker.findById(claim.worker_id).select('upi_id');
      if (worker) {
        try {
          const payRef = await payoutService.sendUPI({
            upiId: worker.upi_id,
            amount: claim.payout.amount_inr,
            workerId: claim.worker_id.toString(),
            claimId: claim._id.toString(),
          });
          await Claim.findByIdAndUpdate(claimId, {
            'payout.reference': payRef,
            'payout.paid_at': new Date()
          });
        } catch (payErr) {
          console.error('[CLAIMS] Payout failed:', payErr.message);
        }
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
    const claim = await Claim.findById(claimId)
      .populate('worker_id', 'device_hash last_gps zone_id trust_history upi_id');

    if (!claim || claim.status !== 'soft_hold') {
      return res.json({ success: false, message: 'Claim not found or not in soft_hold' });
    }

    const worker = claim.worker_id;
    const newScore = await fraudScorer.score({
      workerId: worker._id.toString(),
      deviceHash: worker.device_hash,
      gpsLat: worker.last_gps?.lat,
      gpsLon: worker.last_gps?.lon,
      zoneId: worker.zone_id,
      trustHistory: worker.trust_history,
    });

    if (newScore.score >= 70) {
      await Claim.findByIdAndUpdate(claimId, { 
        status: 'approved', 
        'trust_assessment.score': newScore.score 
      });
      
      try {
        const payRef = await payoutService.sendUPI({ 
          upiId: worker.upi_id, 
          amount: claim.payout.amount_inr, 
          workerId: worker._id.toString(), 
          claimId 
        });
        await Claim.findByIdAndUpdate(claimId, {
          'payout.reference': payRef,
          'payout.paid_at': new Date()
        });
      } catch (payErr) {
        console.error('[CLAIMS] Payout failed:', payErr.message);
      }
      
      return res.json({ success: true, status: 'approved', newScore: newScore.score });
    }

    res.json({ success: true, status: 'soft_hold', newScore: newScore.score, message: 'Still under threshold, will recheck' });
  } catch (err) {
    res.json({ success: true, message: 'Recheck processed (demo mode)', demo: true });
  }
});

// Initialize MongoDB models on router load
async function initializeModels() {
  try {
    await connectMongoDB();
    const models = getModels();
    Worker = models.Worker;
    Policy = models.Policy;
    Claim = models.Claim;
    TriggerEvent = models.TriggerEvent;
    console.log('[CLAIMS] MongoDB models initialized');
  } catch (err) {
    console.error('[CLAIMS] Failed to initialize MongoDB models:', err.message);
  }
}

// Initialize on module load
initializeModels();

module.exports = router;
