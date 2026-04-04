/**
 * SafeShift — Main Server Entry Point
 * AI-Powered Parametric Income Insurance for Q-Commerce Workers
 * DEVTrails 2026 Hackathon Submission
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { initDB } = require('./db/init');
const TriggerMonitor = require('./services/triggerMonitor');
const RetrainingScheduler = require('./services/retrainingScheduler');

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/policies', require('./routes/policies'));
app.use('/api/claims', require('./routes/claims'));
app.use('/api/triggers', require('./routes/triggers'));
app.use('/api/admin', require('./routes/admin'));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SafeShift API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── 404 Fallback (API only — frontend is on Vercel) ────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ─── Start Server ────────────────────────────────────────────────────────────
async function start() {
  // Initialize database
  await initDB();

  // Start HTTP server
  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║          🛡️  SafeShift API Server  🛡️            ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Port:     ${PORT}                                 ║`);
    console.log(`║  Mode:     ${process.env.NODE_ENV || 'development'}                       ║`);
    console.log('║  API:      http://localhost:' + PORT + '/api/health     ║');
    console.log('║  Client:   http://localhost:5173               ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
  });

  // Start trigger monitor (polls weather/AQI APIs)
  const monitor = new TriggerMonitor();
  if (process.env.NODE_ENV === 'production') {
    monitor.start(300000); // Every 5 min in production
  }

  // Start model retraining scheduler (every Sunday 10 PM IST)
  const retrainer = new RetrainingScheduler();
  retrainer.start();
}

start().catch(err => {
  console.error('[FATAL] Failed to start server:', err);
  process.exit(1);
});
