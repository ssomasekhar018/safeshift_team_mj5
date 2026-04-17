/**
 * SafeShift — MongoDB Connection and Schema Configuration
 * Handles MongoDB connection, schema definitions, and data models
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

// MongoDB connection configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/safeshift';

// Connection options for optimal performance
const connectionOptions = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000 // Close sockets after 45 seconds of inactivity
};

// ─── Schema Definitions ──────────────────────────────────────────────────────

// Workers Schema - Enhanced with nested objects and better indexing
const workerSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => crypto.randomUUID()
  },
  phone: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  password_hash: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  platform: { 
    type: String, 
    required: true, 
    default: 'zepto' 
  },
  zone_id: { 
    type: String, 
    required: true, 
    default: 'KOR-4B',
    index: true 
  },
  zone_pincode: { 
    type: String, 
    required: true, 
    default: '560034' 
  },
  shift_start: { 
    type: String, 
    required: true, 
    default: '06:00' 
  },
  shift_end: { 
    type: String, 
    required: true, 
    default: '22:00' 
  },
  upi_id: { 
    type: String, 
    required: true, 
    default: 'worker@upi' 
  },
  device_hash: { 
    type: String,
    index: true 
  },
  last_gps: {
    lat: { type: Number, default: 12.9352 },
    lon: { type: Number, default: 77.6245 },
    updated_at: { type: Date, default: Date.now }
  },
  trust_history: [{
    score: Number,
    factors: [String],
    recorded_at: { type: Date, default: Date.now }
  }],
  // DPDP Act 2023 Compliance
  consent_given: { 
    type: Boolean, 
    default: false 
  },
  consent_timestamp: Date,
  consent_details: {
    gps_location: { type: Boolean, default: false },
    bank_upi: { type: Boolean, default: false },
    platform_activity: { type: Boolean, default: false }
  },
  // Enhanced security fields
  security: {
    failed_attempts: { type: Number, default: 0 },
    locked_until: Date,
    last_login_at: Date,
    last_login_ip: String
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound indexes for optimal query performance
workerSchema.index({ zone_id: 1, zone_pincode: 1 });
workerSchema.index({ 'security.last_login_at': -1 });

// Pre-save middleware to ensure indexes are created
workerSchema.pre('save', function() {
  // This will trigger index creation when first document is saved
});

// Policies Schema - Enhanced with nested period object
const policySchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => crypto.randomUUID()
  },
  worker_id: { 
    type: String, 
    ref: 'Worker', 
    required: true,
    index: true 
  },
  tier: { 
    type: String, 
    required: true 
  },
  premium_inr: { 
    type: Number, 
    required: true 
  },
  coverage_inr: { 
    type: Number, 
    required: true 
  },
  period: {
    week_start: { type: Date, required: true },
    week_end: { type: Date, required: true }
  },
  status: { 
    type: String, 
    default: 'active',
    index: true 
  },
  ai_risk_score: { 
    type: Number, 
    default: 50 
  },
  metadata: {
    model_version: { type: String, default: 'v2.0' },
    risk_factors: [String],
    computed_at: { type: Date, default: Date.now }
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound indexes for policies
policySchema.index({ 'period.week_start': 1, 'period.week_end': 1 });

// Pre-save middleware to ensure indexes are created
policySchema.pre('save', function() {
  // This will trigger index creation when first document is saved
});

// Claims Schema - Enhanced with nested trust assessment and payout objects
const claimSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => crypto.randomUUID()
  },
  worker_id: { 
    type: String, 
    ref: 'Worker', 
    required: true,
    index: true 
  },
  policy_id: { 
    type: String, 
    ref: 'Policy', 
    required: true 
  },
  trigger_id: { 
    type: String, 
    ref: 'TriggerEvent', 
    required: true 
  },
  trust_assessment: {
    score: { type: Number, required: true, default: 75 },
    signals: {
      gps_jitter: Number,
      network_match: Number,
      signal_strength: Number,
      accelerometer: Number,
      zone_history: Number,
      platform_active: Number
    },
    computed_at: { type: Date, default: Date.now }
  },
  status: { 
    type: String, 
    default: 'pending',
    index: true 
  },
  payout: {
    amount_inr: Number,
    reference: String,
    paid_at: Date
  },
  review_notes: String,
  created_at: { 
    type: Date, 
    default: Date.now,
    index: -1 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Unique constraint for worker-trigger combination
claimSchema.index({ worker_id: 1, trigger_id: 1 }, { unique: true });

// Pre-save middleware to ensure indexes are created
claimSchema.pre('save', function() {
  // This will trigger index creation when first document is saved
});

// Trigger Events Schema - Enhanced with nested API payload
const triggerEventSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => crypto.randomUUID()
  },
  zone_id: { 
    type: String, 
    required: true,
    index: true 
  },
  trigger_type: { 
    type: String, 
    required: true 
  },
  triggered_at: { 
    type: Date, 
    required: true, 
    default: Date.now 
  },
  api_payload: {
    simulated: Boolean,
    source: String,
    raw_data: mongoose.Schema.Types.Mixed
  },
  threshold_value: { 
    type: Number, 
    required: true, 
    default: 0 
  },
  threshold_unit: { 
    type: String, 
    required: true, 
    default: 'mm/hr' 
  },
  resolved_at: Date,
  created_at: { 
    type: Date, 
    default: Date.now 
  }
});

// Refresh Tokens Schema
const refreshTokenSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => crypto.randomUUID()
  },
  worker_id: { 
    type: String, 
    ref: 'Worker', 
    required: true,
    index: true 
  },
  token_hash: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  expires_at: { 
    type: Date, 
    required: true 
  },
  revoked: { 
    type: Boolean, 
    default: false 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  }
});

// TTL index for automatic cleanup of expired tokens
refreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// OTP Verifications Schema
const otpVerificationSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => crypto.randomUUID()
  },
  phone: { 
    type: String, 
    required: true,
    index: true 
  },
  otp_hash: { 
    type: String, 
    required: true 
  },
  expires_at: { 
    type: Date, 
    required: true 
  },
  used: { 
    type: Boolean, 
    default: false 
  },
  attempts: { 
    type: Number, 
    default: 0 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  }
});

// TTL index for automatic cleanup of expired OTPs
otpVerificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
otpVerificationSchema.index({ phone: 1, expires_at: 1 });

// Auth Audit Log Schema - Immutable with TTL
const authAuditLogSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => crypto.randomUUID()
  },
  event_type: { 
    type: String, 
    required: true 
  },
  worker_id: { 
    type: String, 
    ref: 'Worker' 
  },
  ip_address: String,
  user_agent: String,
  success: { 
    type: Boolean, 
    required: true, 
    default: false 
  },
  failure_reason: String,
  created_at: { 
    type: Date, 
    default: Date.now,
    index: -1 
  }
});

// TTL index for audit log cleanup (keep for 1 year)
authAuditLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 31536000 });
authAuditLogSchema.index({ worker_id: 1, created_at: -1 });

// Admins Schema
const adminSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => crypto.randomUUID()
  },
  phone: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  password_hash: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String, 
    required: true, 
    default: 'Admin' 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  }
});

// ─── Model Creation ──────────────────────────────────────────────────────────

let Worker, Policy, Claim, TriggerEvent, RefreshToken, OtpVerification, AuthAuditLog, Admin;

// Connection management
let mongoConnection = null;

async function connectMongoDB() {
  try {
    if (mongoConnection && mongoConnection.readyState === 1) {
      console.log('[MongoDB] Using existing connection');
      return mongoConnection;
    }

    console.log('[MongoDB] Connecting to database...');
    console.log(`[MongoDB] URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`);
    
    mongoConnection = await mongoose.connect(MONGODB_URI, connectionOptions);
    
    // Create models after connection (reuse if already registered)
    Worker = mongoose.models.Worker || mongoose.model('Worker', workerSchema);
    Policy = mongoose.models.Policy || mongoose.model('Policy', policySchema);
    Claim = mongoose.models.Claim || mongoose.model('Claim', claimSchema);
    TriggerEvent = mongoose.models.TriggerEvent || mongoose.model('TriggerEvent', triggerEventSchema);
    RefreshToken = mongoose.models.RefreshToken || mongoose.model('RefreshToken', refreshTokenSchema);
    OtpVerification = mongoose.models.OtpVerification || mongoose.model('OtpVerification', otpVerificationSchema);
    AuthAuditLog = mongoose.models.AuthAuditLog || mongoose.model('AuthAuditLog', authAuditLogSchema);
    Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

    // Ensure all indexes are created
    await Promise.all([
      Worker.createIndexes(),
      Policy.createIndexes(),
      Claim.createIndexes(),
      TriggerEvent.createIndexes(),
      RefreshToken.createIndexes(),
      OtpVerification.createIndexes(),
      AuthAuditLog.createIndexes(),
      Admin.createIndexes()
    ]);

    console.log('[MongoDB] Connected successfully');
    console.log(`[MongoDB] Database: ${mongoose.connection.db.databaseName}`);
    console.log('[MongoDB] All indexes created successfully');
    
    return mongoConnection;
  } catch (error) {
    console.error('[MongoDB] Connection failed:', error.message);
    throw error;
  }
}

async function disconnectMongoDB() {
  try {
    if (mongoConnection) {
      await mongoose.disconnect();
      mongoConnection = null;
      console.log('[MongoDB] Disconnected successfully');
    }
  } catch (error) {
    console.error('[MongoDB] Disconnect failed:', error.message);
    throw error;
  }
}

function getModels() {
  return {
    Worker,
    Policy,
    Claim,
    TriggerEvent,
    RefreshToken,
    OtpVerification,
    AuthAuditLog,
    Admin
  };
}

// Health check function
async function checkMongoDBHealth() {
  try {
    if (!mongoConnection || mongoConnection.readyState !== 1) {
      return { status: 'disconnected', error: 'No active connection' };
    }

    // Simple ping to check connection
    await mongoose.connection.db.admin().ping();
    
    return {
      status: 'connected',
      database: mongoose.connection.db.databaseName,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      readyState: mongoose.connection.readyState
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[MongoDB] Received SIGINT, closing connection...');
  await disconnectMongoDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[MongoDB] Received SIGTERM, closing connection...');
  await disconnectMongoDB();
  process.exit(0);
});

// ─── Seed Demo Accounts into MongoDB ─────────────────────────────────────────

async function seedMongoAccounts() {
  try {
    const bcrypt = require('bcryptjs');
    const models = getModels();
    if (!models.Worker || !models.Admin) {
      console.warn('[MongoDB] Models not initialized, skipping seed');
      return;
    }

    // Demo worker: 9876543210 / demo123
    const existingWorker = await models.Worker.findOne({ phone: '9876543210' });
    if (!existingWorker) {
      const hash = await bcrypt.hash('demo123', 10);
      await models.Worker.create({
        phone: '9876543210',
        password_hash: hash,
        name: 'Demo Worker',
        platform: 'zepto',
        zone_id: 'KOR-4B',
        zone_pincode: '560034',
        shift_start: '06:00',
        shift_end: '22:00',
        upi_id: '9876543210@upi',
        device_hash: 'demo_device_hash_001',
        last_gps: { lat: 12.9352, lon: 77.6245 },
        trust_history: [],
        consent_given: true,
        consent_timestamp: new Date(),
        consent_details: { gps_location: true, bank_upi: true, platform_activity: true },
        security: { failed_attempts: 0 }
      });
      console.log('✅ [MongoDB] Demo worker seeded (9876543210 / demo123)');
    }

    // Demo admin: 9999999999 / admin123
    const existingAdmin = await models.Admin.findOne({ phone: '9999999999' });
    if (!existingAdmin) {
      const hash = await bcrypt.hash('admin123', 10);
      await models.Admin.create({
        phone: '9999999999',
        password_hash: hash,
        name: 'Demo Admin'
      });
      console.log('✅ [MongoDB] Demo admin seeded (9999999999 / admin123)');
    }
  } catch (err) {
    console.error('[MongoDB] Seed failed:', err.message);
  }
}

module.exports = {
  connectMongoDB,
  disconnectMongoDB,
  checkMongoDBHealth,
  seedMongoAccounts,
  // Models (available after connection)
  getModels,
  // Schema access for migration
  schemas: {
    workerSchema,
    policySchema,
    claimSchema,
    triggerEventSchema,
    refreshTokenSchema,
    otpVerificationSchema,
    authAuditLogSchema,
    adminSchema
  }
};
