/**
 * SafeShift Auth Routes
 * Password-based authentication for workers and admins
 * Passwords hashed with bcryptjs
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query, db } = require('../db/init');
const { generateToken, authenticate } = require('../middleware/auth');

// ─── Worker Login ────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Worker login with phone + password
 */
router.post('/login', async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone and password are required' });
  }

  try {
    // Look up worker by phone
    const worker = db.prepare('SELECT * FROM workers WHERE phone = ?').get(phone);

    if (!worker) {
      return res.status(401).json({ error: 'No account found with this phone number' });
    }

    // Compare password
    const isMatch = bcrypt.compareSync(password, worker.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Parse JSON fields
    if (worker.trust_history && typeof worker.trust_history === 'string') {
      try { worker.trust_history = JSON.parse(worker.trust_history); } catch (e) {}
    }

    // Don't send password hash to client
    delete worker.password_hash;

    const token = generateToken({
      phone: worker.phone,
      role: 'worker',
      id: worker.id,
      zone_id: worker.zone_id,
    });

    console.log(`[AUTH] Worker login: ${phone}`);
    res.json({ success: true, token, role: 'worker', worker });
  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── Admin Login ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/admin/login
 * Admin login with phone + password
 */
router.post('/admin/login', async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone and password are required' });
  }

  try {
    const admin = db.prepare('SELECT * FROM admins WHERE phone = ?').get(phone);

    if (!admin) {
      return res.status(401).json({ error: 'Admin account not found' });
    }

    const isMatch = bcrypt.compareSync(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    delete admin.password_hash;

    const token = generateToken({
      phone: admin.phone,
      role: 'admin',
      id: admin.id,
    });

    console.log(`[AUTH] Admin login: ${phone}`);
    res.json({ success: true, token, role: 'admin' });
  } catch (err) {
    console.error('[AUTH] Admin login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── Worker Registration ─────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Register a new worker with phone, password, and profile details
 */
router.post('/register', async (req, res) => {
  const { phone, password, name, platform, zone_id, zone_pincode, shift_start, shift_end, upi_id } = req.body;

  if (!phone || !password || !name) {
    return res.status(400).json({ error: 'Phone, password, and name are required' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  try {
    // Check if phone already exists
    const existing = db.prepare('SELECT id FROM workers WHERE phone = ?').get(phone);
    if (existing) {
      return res.status(409).json({ error: 'An account with this phone number already exists' });
    }

    const id = require('crypto').randomUUID();
    const password_hash = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO workers (id, phone, password_hash, name, platform, zone_id, zone_pincode, shift_start, shift_end, upi_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, phone, password_hash, name,
      platform || 'zepto',
      zone_id || 'KOR-4B',
      zone_pincode || '560034',
      shift_start || '06:00',
      shift_end || '22:00',
      upi_id || `${phone}@upi`
    );

    const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(id);
    delete worker.password_hash;

    // Parse JSON fields
    if (worker.trust_history && typeof worker.trust_history === 'string') {
      try { worker.trust_history = JSON.parse(worker.trust_history); } catch (e) {}
    }

    const token = generateToken({
      phone: worker.phone,
      role: 'worker',
      id: worker.id,
      zone_id: worker.zone_id,
    });

    console.log(`[AUTH] New worker registered: ${phone} (${name})`);
    res.json({ success: true, token, worker });
  } catch (err) {
    console.error('[AUTH] Registration failed:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── Profile ─────────────────────────────────────────────────────────────────

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req, res) => {
  if (req.user.role === 'admin') {
    try {
      const admin = db.prepare('SELECT id, phone, name, created_at FROM admins WHERE id = ?').get(req.user.id);
      return res.json({ role: 'admin', phone: req.user.phone, admin });
    } catch (e) {}
    return res.json({ role: 'admin', phone: req.user.phone });
  }

  try {
    const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(req.user.id);
    if (worker) {
      delete worker.password_hash;
      if (worker.trust_history && typeof worker.trust_history === 'string') {
        try { worker.trust_history = JSON.parse(worker.trust_history); } catch (e) {}
      }
      return res.json({ role: 'worker', worker });
    }
  } catch (err) {
    // fallback
  }

  res.json({ role: 'worker', worker: { id: req.user.id, phone: req.user.phone, zone_id: req.user.zone_id || 'KOR-4B' } });
});

// ─── eKYC ────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/ekyc
 * Mock eKYC verification (Aadhaar-based)
 */
router.post('/ekyc', authenticate, (req, res) => {
  const { aadhaar_last4 } = req.body;
  const verified = aadhaar_last4 && aadhaar_last4.length === 4;
  res.json({
    success: true,
    ekyc_status: verified ? 'verified' : 'pending',
    message: verified ? 'eKYC verification complete' : 'Invalid Aadhaar details',
  });
});

module.exports = router;
