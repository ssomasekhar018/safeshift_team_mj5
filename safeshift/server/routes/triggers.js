/**
 * SafeShift Trigger Routes
 * Zone status, trigger simulation, and zone check-in
 * 
 * MongoDB Migration: All database operations now use Mongoose models
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { connectMongoDB, getModels } = require('../db/mongodb');
const { authenticate } = require('../middleware/auth');

// MongoDB models - will be initialized after connection
let Worker, TriggerEvent;

// Demo zone data
const DEMO_ZONES = {
  'KOR-4B': { name: 'Koramangala', city: 'Bangalore', pincode: '560034', lat: 12.9352, lon: 77.6245, risk: 62 },
  'HSR-2A': { name: 'HSR Layout', city: 'Bangalore', pincode: '560102', lat: 12.9116, lon: 77.6389, risk: 55 },
  'BTM-1C': { name: 'BTM Layout', city: 'Bangalore', pincode: '560076', lat: 12.9166, lon: 77.6101, risk: 45 },
  'IND-3D': { name: 'Indiranagar', city: 'Bangalore', pincode: '560038', lat: 12.9784, lon: 77.6408, risk: 38 },
  'WHT-5A': { name: 'Whitefield', city: 'Bangalore', pincode: '560066', lat: 12.9698, lon: 77.7500, risk: 71 },
  'MG-1B': { name: 'MG Road', city: 'Bangalore', pincode: '560001', lat: 12.9756, lon: 77.6066, risk: 58 },
  'DL-CP': { name: 'Connaught Place', city: 'Delhi', pincode: '110001', lat: 28.6315, lon: 77.2167, risk: 68 },
  'DL-RK': { name: 'RK Puram', city: 'Delhi', pincode: '110022', lat: 28.5635, lon: 77.1724, risk: 75 },
};

/**
 * GET /api/triggers/live-conditions/:zoneId
 * Get live weather conditions for a specific zone from TriggerMonitor cache
 */
router.get('/live-conditions/:zoneId', (req, res) => {
  const { zoneId } = req.params;
  
  // Access TriggerMonitor from app.locals
  const monitor = req.app.locals.monitor;
  
  if (!monitor) {
    return res.status(503).json({ 
      error: 'TriggerMonitor not available',
      message: 'Weather monitoring service is not running'
    });
  }
  
  const conditions = monitor.getCurrentConditions(zoneId);
  
  if (!conditions) {
    // Return demo data if no cached conditions
    return res.json({
      success: true,
      zone_id: zoneId,
      rainfall_mm: 0,
      temperature_c: 28,
      feels_like_c: 30,
      humidity: 65,
      aqi: 120,
      pm25: 45,
      pm10: 60,
      source: 'demo',
      aqi_source: 'demo',
      timestamp: new Date().toISOString(),
      message: 'No live data available yet - using demo values'
    });
  }
  
  res.json({
    success: true,
    ...conditions
  });
});

/**
 * GET /api/triggers/all-conditions
 * Get live weather conditions for all zones from TriggerMonitor cache
 */
router.get('/all-conditions', (req, res) => {
  // Access TriggerMonitor from app.locals
  const monitor = req.app.locals.monitor;
  
  if (!monitor) {
    return res.status(503).json({ 
      error: 'TriggerMonitor not available',
      message: 'Weather monitoring service is not running'
    });
  }
  
  const allConditions = monitor.getAllConditions();
  
  // Convert Map to object for JSON response
  const conditionsObj = {};
  allConditions.forEach((value, key) => {
    conditionsObj[key] = value;
  });
  
  res.json({
    success: true,
    zones: conditionsObj,
    count: allConditions.size,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/triggers/zones
 * Get all available zones with risk data
 */
router.get('/zones', (req, res) => {
  const zones = Object.entries(DEMO_ZONES).map(([id, data]) => ({
    id, ...data,
    risk_level: data.risk > 65 ? 'high' : data.risk > 35 ? 'medium' : 'low',
  }));
  res.json({ success: true, zones });
});

/**
 * GET /api/triggers/zone/:id
 * Get specific zone status with current conditions
 */
router.get('/zone/:id', async (req, res) => {
  const zoneId = req.params.id;
  const zone = DEMO_ZONES[zoneId];

  if (!zone) {
    return res.status(404).json({ error: 'Zone not found' });
  }

  // Get recent triggers for this zone
  let recentTriggers = [];
  try {
    recentTriggers = await TriggerEvent.find({ zone_id: zoneId })
      .sort({ triggered_at: -1 })
      .limit(10)
      .lean();
  } catch (err) {
    // Demo triggers
    recentTriggers = [
      { id: 'trig-1', trigger_type: 'rain', threshold_value: 18.4, threshold_unit: 'mm/hr', triggered_at: new Date(Date.now() - 86400000).toISOString() },
      { id: 'trig-2', trigger_type: 'aqi', threshold_value: 420, threshold_unit: 'AQI', triggered_at: new Date(Date.now() - 259200000).toISOString() },
    ];
  }

  res.json({
    success: true,
    zone: { id: zoneId, ...zone, risk_level: zone.risk > 65 ? 'high' : zone.risk > 35 ? 'medium' : 'low' },
    recent_triggers: recentTriggers,
    current_conditions: {
      rainfall_mm: Math.round(Math.random() * 5 * 10) / 10,
      aqi: Math.round(80 + Math.random() * 150),
      temperature_c: Math.round(28 + Math.random() * 8),
      feels_like_c: Math.round(30 + Math.random() * 10),
    },
  });
});

/**
 * POST /api/triggers/simulate
 * Simulate a trigger event (for demo/testing)
 */
router.post('/simulate', async (req, res) => {
  const { zone_id, trigger_type, threshold_value } = req.body;

  if (!zone_id || !trigger_type) {
    return res.status(400).json({ error: 'zone_id and trigger_type required' });
  }

  const TRIGGER_DEFAULTS = {
    rain: { value: 18.4, unit: 'mm/hr' },
    aqi: { value: 420, unit: 'AQI' },
    heat: { value: 47.2, unit: '°C' },
    closure: { value: 1, unit: 'boolean' },
    shutdown: { value: 1, unit: 'boolean' },
  };

  const defaults = TRIGGER_DEFAULTS[trigger_type] || { value: 1, unit: 'unknown' };
  const value = threshold_value || defaults.value;

  // Create trigger event
  let triggerId = `trigger-${Date.now()}`;
  try {
    const triggerEvent = await TriggerEvent.create({
      zone_id,
      trigger_type,
      threshold_value: value,
      threshold_unit: defaults.unit,
      api_payload: {
        simulated: true,
        source: 'demo',
        raw_data: { zone_id, trigger_type, value, timestamp: new Date().toISOString() }
      }
    });
    triggerId = triggerEvent._id.toString();
  } catch (err) {
    console.warn('[TRIGGER] DB insert failed, using mock ID');
  }

  // Process claims pipeline
  const axios = require('axios');
  const PORT = process.env.PORT || 4000;
  let claimResults = { approved: 0, soft_hold: 0, flagged: 0, total: 0 };

  try {
    const claimResp = await axios.post(`http://localhost:${PORT}/api/claims/process`, {
      trigger_id: triggerId,
      zone_id,
      trigger_type,
      threshold_value: value,
    }, { timeout: 15000 });
    claimResults = claimResp.data.results || claimResults;
  } catch (err) {
    console.warn('[TRIGGER] Claims processing call failed:', err.message);
    // Demo results
    claimResults = {
      approved: Math.floor(Math.random() * 15) + 5,
      soft_hold: Math.floor(Math.random() * 4),
      flagged: Math.floor(Math.random() * 2),
      total: 0,
    };
    claimResults.total = claimResults.approved + claimResults.soft_hold + claimResults.flagged;
  }

  console.log(`[TRIGGER] ⚡ ${trigger_type.toUpperCase()} fired in ${zone_id} | value: ${value} ${defaults.unit}`);

  res.json({
    success: true,
    trigger: {
      id: triggerId,
      zone_id,
      trigger_type,
      threshold_value: value,
      threshold_unit: defaults.unit,
      triggered_at: new Date().toISOString(),
    },
    claim_results: claimResults,
    message: `${trigger_type.toUpperCase()} trigger fired in ${zone_id}! ${claimResults.approved} claims auto-approved, ${claimResults.soft_hold} soft-held, ${claimResults.flagged} flagged.`,
  });
});

/**
 * POST /api/triggers/checkin
 * Worker zone check-in (GPS + device signals)
 */
router.post('/checkin', authenticate, async (req, res) => {
  const { lat, lon, network_type, signal_strength, battery_level } = req.body;

  try {
    await Worker.findByIdAndUpdate(req.user.id, {
      'last_gps.lat': lat || 12.9352,
      'last_gps.lon': lon || 77.6245,
      'last_gps.updated_at': new Date(),
      $push: {
        trust_history: {
          lat, lon, 
          ts: new Date().toISOString(), 
          network_type, 
          signal_strength
        }
      }
    });
  } catch (err) {
    // ignore
  }

  res.json({ success: true, message: 'Check-in recorded' });
});

/**
 * GET /api/triggers/recent
 * Get recent trigger events across all zones
 */
router.get('/recent', async (req, res) => {
  try {
    const triggers = await TriggerEvent.find()
      .sort({ triggered_at: -1 })
      .limit(20)
      .lean();
    return res.json({ success: true, triggers });
  } catch (err) {
    // Demo data
    res.json({
      success: true,
      triggers: [
        { id: 't1', zone_id: 'KOR-4B', trigger_type: 'rain', threshold_value: 18.4, threshold_unit: 'mm/hr', triggered_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 't2', zone_id: 'DL-RK', trigger_type: 'aqi', threshold_value: 450, threshold_unit: 'AQI', triggered_at: new Date(Date.now() - 86400000).toISOString() },
        { id: 't3', zone_id: 'HSR-2A', trigger_type: 'rain', threshold_value: 22.1, threshold_unit: 'mm/hr', triggered_at: new Date(Date.now() - 172800000).toISOString() },
      ],
      demo: true,
    });
  }
});

// Initialize MongoDB models on router load
async function initializeModels() {
  try {
    await connectMongoDB();
    const models = getModels();
    Worker = models.Worker;
    TriggerEvent = models.TriggerEvent;
    console.log('[TRIGGERS] MongoDB models initialized');
  } catch (err) {
    console.error('[TRIGGERS] Failed to initialize MongoDB models:', err.message);
  }
}

// Initialize on module load
initializeModels();

module.exports = router;
