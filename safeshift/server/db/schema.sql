-- SafeShift Database Schema (SQLite)
-- Persistent file-based database for parametric insurance platform

CREATE TABLE IF NOT EXISTS workers (
  id              TEXT PRIMARY KEY,
  phone           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  name            TEXT NOT NULL,
  platform        TEXT NOT NULL DEFAULT 'zepto',
  zone_id         TEXT NOT NULL DEFAULT 'KOR-4B',
  zone_pincode    TEXT NOT NULL DEFAULT '560034',
  shift_start     TEXT NOT NULL DEFAULT '06:00',
  shift_end       TEXT NOT NULL DEFAULT '22:00',
  upi_id          TEXT NOT NULL DEFAULT 'worker@upi',
  device_hash     TEXT,
  last_gps_lat    REAL DEFAULT 12.9352,
  last_gps_lon    REAL DEFAULT 77.6245,
  trust_history   TEXT DEFAULT '[]',
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admins (
  id              TEXT PRIMARY KEY,
  phone           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  name            TEXT NOT NULL DEFAULT 'Admin',
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS policies (
  id              TEXT PRIMARY KEY,
  worker_id       TEXT REFERENCES workers(id),
  tier            TEXT NOT NULL,
  premium_inr     INTEGER NOT NULL,
  coverage_inr    INTEGER NOT NULL,
  week_start      TEXT NOT NULL,
  week_end        TEXT NOT NULL,
  status          TEXT DEFAULT 'active',
  ai_risk_score   INTEGER DEFAULT 50,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trigger_events (
  id              TEXT PRIMARY KEY,
  zone_id         TEXT NOT NULL,
  trigger_type    TEXT NOT NULL,
  triggered_at    TEXT NOT NULL DEFAULT (datetime('now')),
  api_payload     TEXT NOT NULL DEFAULT '{}',
  threshold_value REAL NOT NULL DEFAULT 0,
  threshold_unit  TEXT NOT NULL DEFAULT 'mm/hr',
  resolved_at     TEXT
);

CREATE TABLE IF NOT EXISTS claims (
  id              TEXT PRIMARY KEY,
  worker_id       TEXT REFERENCES workers(id),
  policy_id       TEXT REFERENCES policies(id),
  trigger_id      TEXT REFERENCES trigger_events(id),
  trust_score     INTEGER NOT NULL DEFAULT 75,
  trust_signals   TEXT NOT NULL DEFAULT '{}',
  status          TEXT DEFAULT 'pending',
  payout_inr      INTEGER,
  payout_ref      TEXT,
  paid_at         TEXT,
  review_notes    TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  UNIQUE(worker_id, trigger_id)
);

CREATE TABLE IF NOT EXISTS fraud_flags (
  id              TEXT PRIMARY KEY,
  claim_id        TEXT REFERENCES claims(id),
  worker_id       TEXT REFERENCES workers(id),
  flag_type       TEXT NOT NULL,
  flag_detail     TEXT NOT NULL DEFAULT '{}',
  resolved        INTEGER DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS zone_risk_scores (
  id              TEXT PRIMARY KEY,
  zone_id         TEXT NOT NULL,
  week_start      TEXT NOT NULL,
  risk_score      INTEGER NOT NULL DEFAULT 50,
  premium_basic   INTEGER NOT NULL DEFAULT 29,
  premium_std     INTEGER NOT NULL DEFAULT 49,
  premium_pro     INTEGER NOT NULL DEFAULT 79,
  model_version   TEXT DEFAULT 'v2.0',
  computed_at     TEXT DEFAULT (datetime('now')),
  UNIQUE(zone_id, week_start)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workers_phone ON workers(phone);
CREATE INDEX IF NOT EXISTS idx_workers_zone ON workers(zone_id);
CREATE INDEX IF NOT EXISTS idx_admins_phone ON admins(phone);
CREATE INDEX IF NOT EXISTS idx_policies_worker ON policies(worker_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE INDEX IF NOT EXISTS idx_claims_worker ON claims(worker_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_trigger_events_zone ON trigger_events(zone_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_claim ON fraud_flags(claim_id);
