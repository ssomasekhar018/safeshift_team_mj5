/**
 * SafeShift — Database Initialization (SQLite)
 * Persistent file-based database using better-sqlite3.
 * Zero setup required — no external database server needed.
 * Data stored at: server/data/safeshift.db
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'safeshift.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/** Generate a UUID v4 */
function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : (
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    })
  );
}

// ─── Schema Creation ─────────────────────────────────────────────────────────

function createSchema() {
  db.exec(`
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
    CREATE INDEX IF NOT EXISTS idx_policies_worker ON policies(worker_id);
    CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
    CREATE INDEX IF NOT EXISTS idx_claims_worker ON claims(worker_id);
    CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
    CREATE INDEX IF NOT EXISTS idx_trigger_events_zone ON trigger_events(zone_id);
    CREATE INDEX IF NOT EXISTS idx_fraud_flags_claim ON fraud_flags(claim_id);
    CREATE INDEX IF NOT EXISTS idx_admins_phone ON admins(phone);
  `);
}

// ─── Seed Demo Data ──────────────────────────────────────────────────────────

function seedDemoData() {
  const workerCount = db.prepare('SELECT COUNT(*) as count FROM workers').get();
  if (workerCount.count > 0) {
    console.log('[DB] Data already exists, skipping seed');
    return;
  }

  console.log('[DB] Seeding demo data...');

  const workerId = uuid();
  const workerPasswordHash = bcrypt.hashSync('demo123', 10);

  // Demo worker
  db.prepare(`
    INSERT INTO workers (id, phone, password_hash, name, platform, zone_id, zone_pincode, shift_start, shift_end, upi_id, device_hash, last_gps_lat, last_gps_lon, trust_history)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    workerId, '9876543210', workerPasswordHash, 'Demo Worker', 'zepto',
    'KOR-4B', '560034', '06:00', '22:00', '9876543210@upi',
    'demo_device_hash_001', 12.9352, 77.6245, '[]'
  );

  // Demo admin
  const adminId = uuid();
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO admins (id, phone, password_hash, name)
    VALUES (?, ?, ?, ?)
  `).run(adminId, '9999999999', adminPasswordHash, 'Admin User');

  // Active policy for demo worker
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const policyId = uuid();
  db.prepare(`
    INSERT INTO policies (id, worker_id, tier, premium_inr, coverage_inr, week_start, week_end, status, ai_risk_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    policyId, workerId, 'standard', 49, 900,
    weekStart.toISOString().split('T')[0],
    weekEnd.toISOString().split('T')[0],
    'active', 55
  );

  // Demo trigger events
  const triggers = [
    { zone_id: 'KOR-4B', trigger_type: 'rain', threshold_value: 18.4, threshold_unit: 'mm/hr', hours_ago: 24 },
    { zone_id: 'DL-RK', trigger_type: 'aqi', threshold_value: 450, threshold_unit: 'AQI', hours_ago: 72 },
    { zone_id: 'HSR-2A', trigger_type: 'rain', threshold_value: 22.1, threshold_unit: 'mm/hr', hours_ago: 120 },
  ];

  const triggerIds = [];
  const insertTrigger = db.prepare(`
    INSERT INTO trigger_events (id, zone_id, trigger_type, triggered_at, api_payload, threshold_value, threshold_unit)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  triggers.forEach(t => {
    const tid = uuid();
    triggerIds.push(tid);
    insertTrigger.run(
      tid, t.zone_id, t.trigger_type,
      new Date(Date.now() - t.hours_ago * 3600000).toISOString(),
      JSON.stringify({ simulated: true }), t.threshold_value, t.threshold_unit
    );
  });

  // Demo claims
  const claimsData = [
    { trigger_idx: 0, trust_score: 85, status: 'approved', payout_inr: 300 },
    { trigger_idx: 1, trust_score: 78, status: 'approved', payout_inr: 300 },
    { trigger_idx: 2, trust_score: 91, status: 'approved', payout_inr: 300 },
  ];

  const insertClaim = db.prepare(`
    INSERT INTO claims (id, worker_id, policy_id, trigger_id, trust_score, trust_signals, status, payout_inr, payout_ref, paid_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  claimsData.forEach(c => {
    insertClaim.run(
      uuid(), workerId, policyId, triggerIds[c.trigger_idx],
      c.trust_score,
      JSON.stringify({
        gps_jitter: 0.92, network_match: 0.88, signal_strength: 0.78,
        accelerometer: 0.85, zone_history: 0.95, platform_active: 0.90,
      }),
      c.status, c.payout_inr,
      `MOCK_PAY_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      c.status === 'approved' ? new Date(Date.now() - Math.random() * 86400000 * 3).toISOString() : null
    );
  });

  console.log('[DB] Seeded demo data: 1 worker (demo123), 1 admin (admin123), 1 policy, 3 triggers, 3 claims');
}

// ─── Query Wrapper ───────────────────────────────────────────────────────────
// Returns { rows, rowCount } to match the PostgreSQL-style API used by routes

function query(text, params = []) {
  const sql = text.trim();

  // Replace PostgreSQL parameter markers ($1, $2, ...) with SQLite markers (?)
  let sqliteSql = sql;
  const paramMap = [];
  const paramRegex = /\$(\d+)/g;
  let match;
  const usedParams = [];

  // Collect all parameter references
  while ((match = paramRegex.exec(sql)) !== null) {
    usedParams.push({ index: parseInt(match[1]) - 1, position: match.index });
  }

  // Replace $N with ? and build ordered param array
  if (usedParams.length > 0) {
    sqliteSql = sql.replace(/\$(\d+)/g, '?');
    // Build params in order of appearance
    const orderedParams = [];
    const regex2 = /\$(\d+)/g;
    let m2;
    const tempSql = sql;
    while ((m2 = regex2.exec(tempSql)) !== null) {
      const idx = parseInt(m2[1]) - 1;
      let val = params[idx];
      // Convert objects/arrays to JSON strings for SQLite
      if (val !== null && val !== undefined && typeof val === 'object') {
        val = JSON.stringify(val);
      }
      orderedParams.push(val === undefined ? null : val);
    }
    params = orderedParams;
  }

  // Remove PostgreSQL-specific syntax
  sqliteSql = sqliteSql.replace(/::jsonb/gi, '');
  sqliteSql = sqliteSql.replace(/::text/gi, '');
  sqliteSql = sqliteSql.replace(/::integer/gi, '');
  sqliteSql = sqliteSql.replace(/TIMESTAMPTZ/gi, 'TEXT');
  sqliteSql = sqliteSql.replace(/JSONB/gi, 'TEXT');

  // Replace NOW() with datetime('now')
  sqliteSql = sqliteSql.replace(/NOW\(\)/gi, "datetime('now')");

  // Replace CURRENT_DATE with date('now')
  sqliteSql = sqliteSql.replace(/CURRENT_DATE/gi, "date('now')");

  // Replace gen_random_uuid() — we handle UUIDs in JS
  sqliteSql = sqliteSql.replace(/DEFAULT gen_random_uuid\(\)/gi, '');

  // Handle ON CONFLICT ... RETURNING * (SQLite needs different syntax)
  // Remove RETURNING * for INSERT/UPDATE with ON CONFLICT
  const hasReturning = /RETURNING\s+\*/i.test(sqliteSql);
  let returningSql = sqliteSql;
  if (hasReturning) {
    returningSql = sqliteSql.replace(/\s+RETURNING\s+\*/i, '');
  }

  // Handle trust_history = trust_history || ?  (JSON array append)
  const appendMatch = returningSql.match(/(\w+)\s*=\s*\1\s*\|\|\s*\?/);
  if (appendMatch) {
    const col = appendMatch[1];
    // Need to handle JSON append differently in SQLite
    const appendIdx = returningSql.indexOf(appendMatch[0]);
    returningSql = returningSql.replace(
      appendMatch[0],
      `${col} = json_insert(${col}, '$[#]', json(?))`
    );
  }

  const upperSql = returningSql.trim().toUpperCase();

  try {
    if (upperSql.startsWith('SELECT') || upperSql.startsWith('WITH')) {
      const rows = db.prepare(returningSql).all(...params);
      // Parse JSON fields
      rows.forEach(row => {
        parseJsonFields(row);
      });
      return { rows, rowCount: rows.length };
    }

    if (upperSql.startsWith('INSERT')) {
      // For INSERT, generate ID if needed
      const tableMatch = returningSql.match(/INSERT INTO\s+(\w+)/i);
      const tableName = tableMatch ? tableMatch[1] : '';

      // Check if we need to generate an ID
      const colMatch = returningSql.match(/\(([^)]+)\)\s*VALUES/i);
      const columns = colMatch ? colMatch[1].split(',').map(c => c.trim()) : [];

      if (!columns.includes('id')) {
        // Add id to columns and value
        const id = uuid();
        const insertSql = returningSql.replace(
          /\(([^)]+)\)\s*VALUES\s*\(([^)]*)\)/i,
          (match, cols, vals) => `(id, ${cols}) VALUES ('${id}', ${vals})`
        );
        try {
          const info = db.prepare(insertSql).run(...params);
          if (hasReturning) {
            const row = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(id);
            if (row) parseJsonFields(row);
            return { rows: row ? [row] : [], rowCount: info.changes };
          }
          return { rows: [], rowCount: info.changes };
        } catch (e) {
          // ON CONFLICT DO NOTHING
          if (e.message.includes('UNIQUE constraint failed')) {
            return { rows: [], rowCount: 0 };
          }
          throw e;
        }
      }

      try {
        const info = db.prepare(returningSql).run(...params);
        if (hasReturning) {
          // Try to get the inserted/updated row
          const idIdx = columns.indexOf('id');
          const rowId = idIdx >= 0 ? params[idIdx] : null;
          if (rowId) {
            const row = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(rowId);
            if (row) parseJsonFields(row);
            return { rows: row ? [row] : [], rowCount: info.changes };
          }
          // Fallback: get by phone for workers
          if (tableName === 'workers' && columns.includes('phone')) {
            const phoneIdx = columns.indexOf('phone');
            const phone = params[phoneIdx];
            const row = db.prepare(`SELECT * FROM ${tableName} WHERE phone = ?`).get(phone);
            if (row) parseJsonFields(row);
            return { rows: row ? [row] : [], rowCount: info.changes };
          }
        }
        return { rows: [], rowCount: info.changes };
      } catch (e) {
        if (e.message.includes('UNIQUE constraint failed')) {
          // Handle ON CONFLICT DO UPDATE — try to get existing row
          if (returningSql.toUpperCase().includes('ON CONFLICT')) {
            // Re-run as upsert
            try {
              db.prepare(returningSql).run(...params);
            } catch (e2) { /* ignore */ }
          }
          return { rows: [], rowCount: 0 };
        }
        throw e;
      }
    }

    if (upperSql.startsWith('UPDATE')) {
      const tableMatch = returningSql.match(/UPDATE\s+(\w+)/i);
      const tableName = tableMatch ? tableMatch[1] : '';

      const info = db.prepare(returningSql).run(...params);

      if (hasReturning) {
        // Try to get the updated row by extracting WHERE clause params
        const whereMatch = sql.match(/WHERE\s+.*?(\w+)\s*=\s*\$(\d+)/i);
        if (whereMatch) {
          const paramIdx = parseInt(whereMatch[2]) - 1;
          const whereCol = whereMatch[1];
          const whereVal = params.find((_, i) => {
            // Find the param that corresponds to the WHERE clause
            const allParams = [...sql.matchAll(/\$(\d+)/g)];
            const whereParamOrder = allParams.findIndex(m => parseInt(m[1]) - 1 === paramIdx);
            return i === whereParamOrder;
          });
          // Simpler approach: just get by the last param which is typically the WHERE id
          try {
            const row = db.prepare(`SELECT * FROM ${tableName} WHERE ${whereCol} = ?`).get(params[params.length - 1]);
            if (row) parseJsonFields(row);
            return { rows: row ? [row] : [], rowCount: info.changes };
          } catch (e) { /* fallback */ }
        }
      }

      return { rows: [], rowCount: info.changes };
    }

    if (upperSql.startsWith('DELETE')) {
      const info = db.prepare(returningSql).run(...params);
      return { rows: [], rowCount: info.changes };
    }

    // DDL (CREATE, ALTER, etc.)
    db.exec(returningSql);
    return { rows: [], rowCount: 0 };

  } catch (err) {
    console.error('[DB] Query error:', err.message);
    console.error('[DB] SQL:', returningSql.substring(0, 200));
    throw err;
  }
}

/** Parse JSON string fields back to objects */
function parseJsonFields(row) {
  const jsonFields = ['trust_history', 'trust_signals', 'api_payload', 'flag_detail'];
  jsonFields.forEach(field => {
    if (row[field] && typeof row[field] === 'string') {
      try {
        row[field] = JSON.parse(row[field]);
      } catch (e) { /* keep as string */ }
    }
  });
  // Convert SQLite integer booleans
  if (row.resolved !== undefined) {
    row.resolved = !!row.resolved;
  }
}

// ─── Initialization ──────────────────────────────────────────────────────────

async function initDB() {
  try {
    console.log('[DB] Initializing SQLite database...');
    console.log(`[DB] Database file: ${dbPath}`);

    createSchema();
    console.log('[DB] Schema created successfully');

    seedDemoData();

    const workerCount = db.prepare('SELECT COUNT(*) as count FROM workers').get();
    const policyCount = db.prepare('SELECT COUNT(*) as count FROM policies').get();
    const claimCount = db.prepare('SELECT COUNT(*) as count FROM claims').get();
    console.log(`[DB] Current data: ${workerCount.count} workers, ${policyCount.count} policies, ${claimCount.count} claims`);

    return true;
  } catch (err) {
    console.error('[DB] Failed to initialize SQLite:', err.message);
    throw err;
  }
}

// Export the raw db instance for direct access when needed
module.exports = { db, initDB, query, isInMemory: () => false };
