/**
 * SafeShift — Security Monitoring Routes (MongoDB/Mongoose version)
 * Administrative endpoints for monitoring security events,
 * account lockouts, and suspicious activity.
 */
const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const SecurityService = require('../services/securityService');
const { connectMongoDB, getModels } = require('../db/mongodb');

// ─── GET /api/security/metrics ───────────────────────────────────────────────

router.get('/metrics', authenticate, requireAdmin, async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '24h';
    const metrics = await SecurityService.getSecurityMetrics(timeframe);
    
    return res.json({
      success: true,
      timeframe,
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[SECURITY] Metrics error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve security metrics.' });
  }
});

// ─── GET /api/security/audit-log ─────────────────────────────────────────────

router.get('/audit-log', authenticate, requireAdmin, async (req, res) => {
  try {
    await connectMongoDB();
    const { AuthAuditLog } = getModels();

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;
    const eventType = req.query.event_type;
    const workerId = req.query.worker_id;
    const riskLevel = req.query.risk_level; // LOW, MEDIUM, HIGH

    let query = {};

    if (eventType) {
      query.event_type = { $regex: eventType, $options: 'i' };
    }

    if (workerId) {
      query.worker_id = workerId;
    }

    if (riskLevel) {
      query.event_type = { $regex: `_${riskLevel.toUpperCase()}$` };
    }

    const [auditLogs, totalCount] = await Promise.all([
      AuthAuditLog.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      AuthAuditLog.countDocuments(query)
    ]);

    return res.json({
      success: true,
      data: auditLogs,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error('[SECURITY] Audit log error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
});

// ─── GET /api/security/locked-accounts ──────────────────────────────────────

router.get('/locked-accounts', authenticate, requireAdmin, async (req, res) => {
  try {
    await connectMongoDB();
    const { Worker } = getModels();

    const lockedAccounts = await Worker.find({
      'security.locked_until': { $gt: new Date() }
    }, 'phone name security.failed_attempts security.locked_until security.last_login_at security.last_login_ip device_hash')
    .sort({ 'security.locked_until': -1 });

    const formattedAccounts = lockedAccounts.map(w => ({
      id: w._id,
      phone: w.phone,
      name: w.name,
      failed_attempts: w.security?.failed_attempts,
      locked_until: w.security?.locked_until,
      last_login_at: w.security?.last_login_at,
      last_login_ip: w.security?.last_login_ip,
      device_hash: w.device_hash
    }));

    return res.json({
      success: true,
      data: formattedAccounts
    });
  } catch (err) {
    console.error('[SECURITY] Locked accounts error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve locked accounts.' });
  }
});

module.exports = router;