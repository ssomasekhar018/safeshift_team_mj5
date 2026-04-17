const express = require('express');
const router = express.Router();
const { connectMongoDB, getModels } = require('../db/mongodb');
const { authenticate } = require('../middleware/auth');

// MongoDB models
let Worker, Policy, Claim, TriggerEvent;

/**
 * Initialize models before each request
 */
router.use(async (req, res, next) => {
  try {
    await connectMongoDB();
    const models = getModels();
    Worker = models.Worker;
    Policy = models.Policy;
    Claim = models.Claim;
    TriggerEvent = models.TriggerEvent;
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/dashboard
 * Main dashboard KPIs
 */
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [workerCount, activePolicies, claimsByStatus, triggerCount, massDisruptionCount] = await Promise.all([
      Worker.countDocuments(),
      Policy.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, count: { $sum: 1 }, totalPremium: { $sum: '$premium_inr' } } }
      ]),
      Claim.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, totalPayout: { $sum: '$payout_inr' } } }
      ]),
      TriggerEvent.countDocuments({ triggered_at: { $gt: last7Days } }),
      TriggerEvent.countDocuments({ mass_disruption_mode: 1, triggered_at: { $gt: last24Hours } }),
    ]);

    const claimStats = {};
    let totalPayouts = 0;
    claimsByStatus.forEach(r => { 
      claimStats[r._id] = r.count; 
      totalPayouts += (r.totalPayout || 0); 
    });

    const activePolicyData = activePolicies[0] || { count: 0, totalPremium: 0 };

    return res.json({
      success: true,
      kpis: {
        total_workers: workerCount,
        active_policies: activePolicyData.count,
        total_premium_collected: activePolicyData.totalPremium,
        total_payouts: totalPayouts,
        loss_ratio: activePolicyData.totalPremium > 0 ? (totalPayouts / activePolicyData.totalPremium * 100).toFixed(1) : 0,
        triggers_this_week: triggerCount,
        claims_by_status: claimStats,
        mass_disruption_active: massDisruptionCount > 0,
      },
    });
  } catch (err) {
    console.error('[ADMIN] Dashboard error:', err.message);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

/**
 * GET /api/admin/loss-ratio
 * Weekly loss ratio trend (last 8 weeks)
 */
router.get('/loss-ratio', authenticate, async (req, res) => {
  try {
    const data = await Policy.aggregate([
      {
        $lookup: {
          from: 'claims',
          localField: '_id',
          foreignField: 'policy_id',
          as: 'claims'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: { $dateTrunc: { date: "$period.week_start", unit: "week" } } } },
          premiums: { $sum: "$premium_inr" },
          payouts: {
            $sum: {
              $reduce: {
                input: "$claims",
                initialValue: 0,
                in: { $add: ["$$value", { $cond: [{ $eq: ["$$this.status", "approved"] }, "$$this.payout.amount_inr", 0] }] }
              }
            }
          }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 8 },
      { $project: { week: "$_id", premiums: 1, payouts: 1, _id: 0 } }
    ]);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[ADMIN] Loss ratio error:', err.message);
    res.status(500).json({ error: 'Failed to fetch loss ratio data' });
  }
});

/**
 * GET /api/admin/fraud-queue
 * Get claims pending review
 */
router.get('/fraud-queue', authenticate, async (req, res) => {
  try {
    const queue = await Claim.find({ status: { $in: ['flagged', 'soft_hold'] } })
      .populate('worker_id')
      .populate('trigger_id')
      .sort({ 'trust_assessment.score': 1, created_at: -1 })
      .limit(50);
    
    const formattedQueue = queue.map(c => ({
      ...c.toObject(),
      id: c._id,
      name: c.worker_id?.name,
      phone: c.worker_id?.phone,
      zone_id: c.worker_id?.zone_id,
      platform: c.worker_id?.platform,
      trigger_type: c.trigger_id?.trigger_type,
      triggered_at: c.trigger_id?.triggered_at,
      threshold_value: c.trigger_id?.threshold_value,
      payout_inr: c.payout?.amount_inr,
      trust_score: c.trust_assessment?.score,
      trust_signals: c.trust_assessment?.signals
    }));

    return res.json({ success: true, queue: formattedQueue });
  } catch (err) {
    console.error('[ADMIN] Fraud queue error:', err.message);
    res.status(500).json({ error: 'Failed to fetch fraud queue' });
  }
});

/**
 * GET /api/admin/zone-analytics
 * Zone-level analytics for heatmap
 */
router.get('/zone-analytics', authenticate, async (req, res) => {
  try {
    const zones = await Worker.aggregate([
      {
        $lookup: {
          from: 'policies',
          localField: '_id',
          foreignField: 'worker_id',
          as: 'policies'
        }
      },
      {
        $lookup: {
          from: 'claims',
          localField: '_id',
          foreignField: 'worker_id',
          as: 'claims'
        }
      },
      {
        $group: {
          _id: "$zone_id",
          workers: { $sum: 1 },
          policies: { $sum: { $size: { $filter: { input: "$policies", as: "p", cond: { $eq: ["$$p.status", "active"] } } } } },
          claims: { $sum: { $size: "$claims" } },
          total_payouts: { $sum: { $reduce: { input: "$claims", initialValue: 0, in: { $add: ["$$value", { $ifNull: ["$$this.payout.amount_inr", 0] }] } } } },
          avg_trust: { $avg: { $reduce: { input: "$claims", initialValue: 0, in: { $add: ["$$value", { $ifNull: ["$$this.trust_assessment.score", 0] }] } } } }
        }
      },
      { $project: { zone_id: "$_id", workers: 1, policies: 1, claims: 1, total_payouts: 1, avg_trust: 1, _id: 0 } }
    ]);
    return res.json({ success: true, zones });
  } catch (err) {
    console.error('[ADMIN] Zone analytics error:', err.message);
    res.status(500).json({ error: 'Failed to fetch zone analytics' });
  }
});

/**
 * GET /api/admin/payout-trend
 * Daily payout amounts for the last 14 days
 */
router.get('/payout-trend', authenticate, async (req, res) => {
  try {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const data = await Claim.aggregate([
      { $match: { status: 'approved', 'payout.paid_at': { $gt: fourteenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$payout.paid_at" } },
          amount: { $sum: "$payout.amount_inr" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", amount: 1, count: 1, _id: 0 } }
    ]);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[ADMIN] Payout trend error:', err.message);
    res.status(500).json({ error: 'Failed to fetch payout trend' });
  }
});

/**
 * GET /api/admin/trigger-history
 * Trigger event history with claim outcomes
 */
router.get('/trigger-history', authenticate, async (req, res) => {
  try {
    const triggers = await TriggerEvent.aggregate([
      {
        $lookup: {
          from: 'claims',
          localField: '_id',
          foreignField: 'trigger_id',
          as: 'claims'
        }
      },
      {
        $project: {
          zone_id: 1,
          trigger_type: 1,
          threshold_value: 1,
          triggered_at: 1,
          mass_disruption_mode: 1,
          total_claims: { $size: "$claims" },
          approved_claims: { $size: { $filter: { input: "$claims", as: "c", cond: { $eq: ["$$c.status", "approved"] } } } },
          total_payout: { $sum: "$claims.payout.amount_inr" }
        }
      },
      { $sort: { triggered_at: -1 } },
      { $limit: 20 }
    ]);
    return res.json({ success: true, triggers });
  } catch (err) {
    console.error('[ADMIN] Trigger history error:', err.message);
    res.status(500).json({ error: 'Failed to fetch trigger history' });
  }
});

/**
 * GET /api/admin/predictive-risk
 * Predictive risk analysis using weather forecast and historical claim rates
 */
router.get('/predictive-risk', authenticate, async (req, res) => {
  try {
    // Demo data for predictive risk as weather APIs are external
    const zones = ['KOR-4B', 'HSR-2A', 'BTM-1C', 'IND-3D', 'WHT-5A', 'MG-1B', 'DL-CP', 'DL-RK'];
    const forecast = zones.map(z => ({
      zone_id: z,
      predicted_risk: Math.round(10 + Math.random() * 80),
      likely_trigger: Math.random() > 0.7 ? 'rain' : 'none',
      confidence: (0.6 + Math.random() * 0.3).toFixed(2)
    }));
    
    return res.json({ success: true, forecast });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch predictive risk' });
  }
});

module.exports = router;