/**
 * SafeShift Policy Routes
 * Weekly policy creation, renewal, cancellation
 * AI premium calculation via FastAPI ML service
 * 
 * MongoDB Migration: All database operations now use Mongoose models
 */
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { connectMongoDB, getModels } = require('../db/mongodb');
const { authenticate } = require('../middleware/auth');

// MongoDB models - will be initialized after connection
let Worker, Policy;

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Zone tier configurations
const TIER_CONFIG = {
  basic: { premium: 29, coverage: 500 },
  standard: { premium: 49, coverage: 900 },
  pro: { premium: 79, coverage: 1500 },
};

/**
 * GET /api/policies/quote
 * Get AI-driven premium quote for a worker's zone
 */
router.get('/quote', authenticate, async (req, res) => {
  const zone_id = req.query.zone_id || req.user.zone_id || 'KOR-4B';
  let isAIScored = false;
  let cityTier = 'tier_2'; // Default
  let seasonFactor = 1.0;

  try {
    // Try ML service for dynamic pricing
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/score`, {
      zone_id,
      season: getSeason(),
      historical_claims: 3,
      zone_density: 120,
      infrastructure_score: 65,
      forecast_severity: 0.4,
      city: 'Bangalore', // Default city, could be derived from zone_id
    }, { timeout: 3000 });

    const riskScore = mlResponse.data.risk_score || 50;
    cityTier = mlResponse.data.city_tier || 'tier_2';
    seasonFactor = mlResponse.data.season_factor || 1.0;
    const premiums = calculateDynamicPremiums(riskScore, seasonFactor);
    isAIScored = true;

    console.log(`[POLICY] ✅ ML service responded: risk=${riskScore}, city_tier=${cityTier}, season_factor=${seasonFactor}`);

    return res.json({
      success: true,
      zone_id,
      risk_score: riskScore,
      risk_level: riskScore > 65 ? 'high' : riskScore > 30 ? 'medium' : 'low',
      city_tier: cityTier,
      season_factor: seasonFactor,
      tiers: premiums,
      model_version: mlResponse.data.model_version || 'v2.0',
      ai_scored: true,
      valid_until: getNextSunday(),
    });
  } catch (err) {
    // ML service unavailable — use rule-based fallback
    console.warn(`[POLICY] ⚠️ ML service unavailable (${err.message}), using rule-based pricing`);
    const riskScore = getFallbackRiskScore(zone_id);
    const premiums = calculateDynamicPremiums(riskScore, seasonFactor);

    return res.json({
      success: true,
      zone_id,
      risk_score: riskScore,
      risk_level: riskScore > 65 ? 'high' : riskScore > 30 ? 'medium' : 'low',
      city_tier: cityTier,
      season_factor: seasonFactor,
      tiers: premiums,
      model_version: 'fallback-v1',
      ai_scored: false,
      valid_until: getNextSunday(),
    });
  }
});

/**
 * POST /api/policies/create
 * Create a new weekly policy
 */
router.post('/create', authenticate, async (req, res) => {
  const { tier, payment_ref } = req.body;
  const workerId = req.user.id;

  if (!tier || !TIER_CONFIG[tier]) {
    return res.status(400).json({ error: 'Valid tier required: basic, standard, or pro' });
  }

  const zone_id = req.user.zone_id || 'KOR-4B';
  const riskScore = getFallbackRiskScore(zone_id);
  const premiums = calculateDynamicPremiums(riskScore);
  const selectedTier = premiums[tier];

  const weekStart = getNextMonday();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  try {
    const policy = await Policy.create({
      worker_id: workerId,
      tier,
      premium_inr: selectedTier.premium,
      coverage_inr: selectedTier.coverage,
      period: {
        week_start: weekStart,
        week_end: weekEnd
      },
      ai_risk_score: riskScore,
      status: 'active'
    });

    res.json({
      success: true,
      policy: policy.toObject(),
      message: `${tier.charAt(0).toUpperCase() + tier.slice(1)} plan activated! Coverage: ₹${selectedTier.coverage}/week`,
    });
  } catch (err) {
    console.error('[POLICY] Creation failed:', err.message);
    // Demo fallback
    const mockPolicy = {
      id: `policy-${Date.now()}`,
      worker_id: workerId,
      tier,
      premium_inr: selectedTier.premium,
      coverage_inr: selectedTier.coverage,
      period: {
        week_start: weekStart.toISOString(),
        week_end: weekEnd.toISOString()
      },
      ai_risk_score: riskScore,
      status: 'active',
      created_at: new Date().toISOString(),
    };
    res.json({ success: true, policy: mockPolicy, demo: true });
  }
});

/**
 * GET /api/policies/active
 * Get worker's currently active policy
 */
router.get('/active', authenticate, async (req, res) => {
  try {
    const policy = await Policy.findOne({
      worker_id: req.user.id,
      status: 'active'
    }).sort({ created_at: -1 });

    if (policy) {
      return res.json({ success: true, policy: policy.toObject() });
    }
  } catch (err) {
    // fallback
  }
  res.json({ success: true, policy: null, message: 'No active policy' });
});

/**
 * GET /api/policies/history
 * Get worker's policy history
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const policies = await Policy.find({
      worker_id: req.user.id
    }).sort({ created_at: -1 }).limit(20);

    return res.json({ success: true, policies: policies.map(p => p.toObject()) });
  } catch (err) {
    // fallback
  }
  res.json({ success: true, policies: [] });
});

/**
 * POST /api/policies/:id/cancel
 * Cancel an active policy
 */
router.post('/:id/cancel', authenticate, async (req, res) => {
  try {
    const policy = await Policy.findOneAndUpdate(
      { _id: req.params.id, worker_id: req.user.id },
      { status: 'cancelled' },
      { new: true }
    );

    if (policy) {
      return res.json({ success: true, policy: policy.toObject(), message: 'Policy cancelled. No penalty applied.' });
    }
  } catch (err) {
    // fallback
  }
  res.json({ success: true, message: 'Policy cancelled (demo mode)' });
});

// ─── Helper Functions ─────────────────────────────────────────────────────────

function calculateDynamicPremiums(riskScore, seasonFactor = 1.0) {
  const multiplier = 0.8 + (riskScore / 100) * 1.7; // 0.8–2.5 range

  return {
    basic: {
      premium: Math.round(29 * multiplier * seasonFactor),
      coverage: 500,
      per_event: Math.round(500 / 3),
    },
    standard: {
      premium: Math.round(49 * multiplier * seasonFactor),
      coverage: 900,
      per_event: Math.round(900 / 3),
    },
    pro: {
      premium: Math.round(79 * multiplier * seasonFactor),
      coverage: 1500,
      per_event: Math.round(1500 / 3),
    },
  };
}

function getFallbackRiskScore(zoneId) {
  // Deterministic score based on zone for consistent demo
  const zoneScores = {
    'KOR-4B': 62, 'HSR-2A': 55, 'BTM-1C': 45, 'IND-3D': 38,
    'WHT-5A': 71, 'MG-1B': 58, 'JAY-6C': 48, 'ELC-2B': 42,
  };
  return zoneScores[zoneId] || 50;
}

function getSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 6 && month <= 9) return 'monsoon';
  if (month >= 11 || month <= 1) return 'winter';
  return 'normal';
}

function getSeasonFactor() {
  const season = getSeason();
  if (season === 'monsoon') return 1.4;
  if (season === 'winter') return 1.2;
  return 1.0;
}

function getNextMonday() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntilMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getNextSunday() {
  const monday = getNextMonday();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() - 1);
  return sunday.toISOString();
}

// Initialize MongoDB models on router load
async function initializeModels() {
  try {
    await connectMongoDB();
    const models = getModels();
    Worker = models.Worker;
    Policy = models.Policy;
    console.log('[POLICIES] MongoDB models initialized');
  } catch (err) {
    console.error('[POLICIES] Failed to initialize MongoDB models:', err.message);
  }
}

// Initialize on module load
initializeModels();

module.exports = router;
