/**
 * SafeShift Admin Routes
 * Insurer dashboard: KPIs, loss ratios, fraud queue, predictive analytics
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../db/init');
const { authenticate } = require('../middleware/auth');

/**
 * GET /api/admin/dashboard
 * Main dashboard KPIs
 */
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const [workers, policies, claims, triggers] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM workers'),
      pool.query(`SELECT COUNT(*) as count, SUM(premium_inr) as total_premium FROM policies WHERE status = 'active'`),
      pool.query(`SELECT status, COUNT(*) as count, SUM(payout_inr) as total_payout FROM claims GROUP BY status`),
      pool.query('SELECT COUNT(*) as count FROM trigger_events WHERE triggered_at > NOW() - INTERVAL \'7 days\''),
    ]);

    const claimStats = {};
    let totalPayouts = 0;
    claims.rows.forEach(r => { claimStats[r.status] = parseInt(r.count); totalPayouts += parseInt(r.total_payout || 0); });

    return res.json({
      success: true,
      kpis: {
        total_workers: parseInt(workers.rows[0].count),
        active_policies: parseInt(policies.rows[0].count),
        total_premium_collected: parseInt(policies.rows[0].total_premium || 0),
        total_payouts: totalPayouts,
        loss_ratio: policies.rows[0].total_premium > 0 ? (totalPayouts / parseInt(policies.rows[0].total_premium) * 100).toFixed(1) : 0,
        triggers_this_week: parseInt(triggers.rows[0].count),
        claims_by_status: claimStats,
      },
    });
  } catch (err) {
    // Demo KPIs
    res.json({
      success: true,
      kpis: {
        total_workers: 1247,
        active_policies: 892,
        total_premium_collected: 43708,
        total_payouts: 28640,
        loss_ratio: '65.5',
        triggers_this_week: 14,
        claims_by_status: { approved: 156, soft_hold: 12, flagged: 4, rejected: 2 },
      },
      demo: true,
    });
  }
});

/**
 * GET /api/admin/loss-ratio
 * Weekly loss ratio trend (last 8 weeks)
 */
router.get('/loss-ratio', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DATE_TRUNC('week', p.week_start) as week,
             SUM(p.premium_inr) as premiums,
             COALESCE(SUM(c.payout_inr), 0) as payouts
      FROM policies p
      LEFT JOIN claims c ON c.policy_id = p.id AND c.status = 'approved'
      GROUP BY DATE_TRUNC('week', p.week_start)
      ORDER BY week DESC LIMIT 8
    `);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    // Demo trend data
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i * 7);
      weeks.push({
        week: d.toISOString().split('T')[0],
        premiums: Math.round(35000 + Math.random() * 15000),
        payouts: Math.round(18000 + Math.random() * 20000),
      });
    }
    res.json({ success: true, data: weeks, demo: true });
  }
});

/**
 * GET /api/admin/fraud-queue
 * Get claims pending review
 */
router.get('/fraud-queue', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, w.name, w.phone, w.zone_id, w.platform, t.trigger_type, t.triggered_at, t.threshold_value
      FROM claims c
      JOIN workers w ON w.id = c.worker_id
      LEFT JOIN trigger_events t ON t.id = c.trigger_id
      WHERE c.status IN ('flagged', 'soft_hold')
      ORDER BY c.trust_score ASC, c.created_at DESC
      LIMIT 50
    `);
    return res.json({ success: true, queue: result.rows });
  } catch (err) {
    // Demo fraud queue
    res.json({
      success: true,
      queue: [
        { id: 'fq-1', name: 'Suspect Worker A', phone: '9876543210', zone_id: 'KOR-4B', trigger_type: 'rain', trust_score: 35, status: 'flagged', payout_inr: 300, created_at: new Date().toISOString(), trust_signals: { gps_jitter: 0.2, network_match: 0.3, signal_strength: 0.5, accelerometer: 0.1, zone_history: 0.4, platform_active: 0.3 } },
        { id: 'fq-2', name: 'Worker B', phone: '9876543211', zone_id: 'HSR-2A', trigger_type: 'rain', trust_score: 52, status: 'soft_hold', payout_inr: 300, created_at: new Date().toISOString(), trust_signals: { gps_jitter: 0.6, network_match: 0.5, signal_strength: 0.4, accelerometer: 0.7, zone_history: 0.5, platform_active: 0.6 } },
      ],
      demo: true,
    });
  }
});

/**
 * GET /api/admin/zone-analytics
 * Zone-level analytics for heatmap
 */
router.get('/zone-analytics', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT w.zone_id,
             COUNT(DISTINCT w.id) as workers,
             COUNT(DISTINCT p.id) as policies,
             COUNT(DISTINCT c.id) as claims,
             COALESCE(SUM(c.payout_inr), 0) as total_payouts,
             COALESCE(AVG(c.trust_score), 0) as avg_trust
      FROM workers w
      LEFT JOIN policies p ON p.worker_id = w.id AND p.status = 'active'
      LEFT JOIN claims c ON c.worker_id = w.id
      GROUP BY w.zone_id
    `);
    return res.json({ success: true, zones: result.rows });
  } catch (err) {
    // Demo zone analytics
    const zones = [
      { zone_id: 'KOR-4B', workers: 186, policies: 142, claims: 45, total_payouts: 14400, avg_trust: 76 },
      { zone_id: 'HSR-2A', workers: 154, policies: 118, claims: 32, total_payouts: 10240, avg_trust: 79 },
      { zone_id: 'BTM-1C', workers: 98, policies: 72, claims: 18, total_payouts: 5760, avg_trust: 82 },
      { zone_id: 'IND-3D', workers: 122, policies: 95, claims: 22, total_payouts: 7040, avg_trust: 81 },
      { zone_id: 'WHT-5A', workers: 210, policies: 168, claims: 58, total_payouts: 18560, avg_trust: 72 },
      { zone_id: 'MG-1B', workers: 145, policies: 112, claims: 28, total_payouts: 8960, avg_trust: 78 },
      { zone_id: 'DL-CP', workers: 178, policies: 134, claims: 42, total_payouts: 13440, avg_trust: 74 },
      { zone_id: 'DL-RK', workers: 195, policies: 156, claims: 62, total_payouts: 19840, avg_trust: 70 },
    ];
    res.json({ success: true, zones, demo: true });
  }
});

/**
 * GET /api/admin/payout-trend
 * Daily payout amounts for the last 14 days
 */
router.get('/payout-trend', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DATE(paid_at) as date, SUM(payout_inr) as amount, COUNT(*) as count
      FROM claims WHERE status = 'approved' AND paid_at > NOW() - INTERVAL '14 days'
      GROUP BY DATE(paid_at) ORDER BY date
    `);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push({
        date: d.toISOString().split('T')[0],
        amount: Math.round(1500 + Math.random() * 5000),
        count: Math.round(5 + Math.random() * 20),
      });
    }
    res.json({ success: true, data: days, demo: true });
  }
});

/**
 * GET /api/admin/trigger-history
 * Trigger event history with claim outcomes
 */
router.get('/trigger-history', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*,
             COUNT(c.id) as total_claims,
             COUNT(CASE WHEN c.status = 'approved' THEN 1 END) as approved_claims,
             SUM(CASE WHEN c.status = 'approved' THEN c.payout_inr ELSE 0 END) as total_payout
      FROM trigger_events t
      LEFT JOIN claims c ON c.trigger_id = t.id
      GROUP BY t.id
      ORDER BY t.triggered_at DESC LIMIT 20
    `);
    return res.json({ success: true, triggers: result.rows });
  } catch (err) {
    res.json({
      success: true,
      triggers: [
        { id: 'th-1', zone_id: 'KOR-4B', trigger_type: 'rain', threshold_value: 18.4, triggered_at: new Date(Date.now() - 3600000).toISOString(), total_claims: 15, approved_claims: 12, total_payout: 3840 },
        { id: 'th-2', zone_id: 'DL-RK', trigger_type: 'aqi', threshold_value: 450, triggered_at: new Date(Date.now() - 86400000).toISOString(), total_claims: 22, approved_claims: 19, total_payout: 6080 },
        { id: 'th-3', zone_id: 'WHT-5A', trigger_type: 'heat', threshold_value: 47.2, triggered_at: new Date(Date.now() - 172800000).toISOString(), total_claims: 18, approved_claims: 16, total_payout: 5120 },
      ],
      demo: true,
    });
  }
});

module.exports = router;
