/**
 * SafeShift — Main Server Entry Point
 * AI-Powered Parametric Income Insurance for Q-Commerce Workers
 * DEVTrails 2026 Hackathon Submission
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Initialize configuration manager (loads dotenv internally)
const config = require('./utils/config');

const { connectMongoDB, seedMongoAccounts, getModels } = require('./db/mongodb');
const TriggerMonitor = require('./services/triggerMonitor');
const RetrainingScheduler = require('./services/retrainingScheduler');

const app = express();

// Initialize and validate configuration
const appConfig = config.initialize();
const PORT = appConfig.server.port;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.set('trust proxy', 1);          // Required: correct IP for proxy detection
app.disable('x-powered-by');        // Don't expose Express.js version
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.openweathermap.org', 'https://api.waqi.info'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      appConfig.server.clientUrl,
      'https://safeshift-team-mj5.vercel.app',
      'https://safeshift-team-mj5-fiue2hre4-ssomasekhar018s-projects.vercel.app'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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
app.use('/api/security', require('./routes/security'));

// ─── Configuration Endpoint ──────────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  res.json({
    status: 'ok',
    config: config.getFrontendConfig(),
    timestamp: new Date().toISOString()
  });
});

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
  // Validate and print configuration status
  config.printStatus();
  
  // Initialize MongoDB connection centrally
  try {
    await connectMongoDB();
    const { Worker, Admin } = getModels();
    const mongoWorkerCount = await Worker.countDocuments();
    const mongoAdminCount = await Admin.countDocuments();

    // Always run seed in demo/development to ensure cleanup of TEST- data
    if (mongoWorkerCount === 0 && mongoAdminCount === 0) {
      await seedMongoAccounts();
    } else if (appConfig.server.nodeEnv !== 'production') {
      // In development/demo, ensure cleanup runs
      await seedMongoAccounts();
    }

    console.log('[MongoDB] Central connection and seeding complete');
  } catch (err) {
    console.error('[MongoDB] Central initialization failed:', err.message);
  }

  // Start HTTP server
  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║          🛡️  SafeShift API Server  🛡️            ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Port:     ${PORT}                                 ║`);
    console.log(`║  Mode:     ${appConfig.server.nodeEnv}                       ║`);
    console.log('║  API:      http://localhost:' + PORT + '/api/health     ║');
    console.log('║  Client:   http://localhost:5173               ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
  });

  // Start trigger monitor (polls weather/AQI APIs)
  const monitor = new TriggerMonitor();
  app.locals.monitor = monitor; // Expose for route access
  if (appConfig.server.nodeEnv === 'production') {
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
