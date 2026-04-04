/**
 * SafeShift — Ring Detector Service
 * Detects coordinated fraud patterns:
 * Signal 1: Same device hash across multiple workers (device sharing)
 * Signal 2: Temporal clustering of claims
 * Signal 3: Enrollment surge before severe weather (3× registrations)
 * Signal 4: GPS coordinate clustering via DBSCAN
 * Signal 5: Cross-zone anomaly detection
 */
const { pool } = require('../db/init');

class RingDetector {
  constructor() {
    this.deviceMap = new Map(); // deviceHash -> [workerIds]
    this.claimTimestamps = new Map(); // workerId -> [timestamps]
    this.enrollmentHistory = []; // { ts, zoneId }
  }

  /**
   * Analyze a claim for ring fraud patterns
   * Returns { isRing: boolean, confidence: 0-1, patterns: [...] }
   */
  async analyze({ workerId, deviceHash, claimTimestamp, zoneId, gpsLat, gpsLon }) {
    const patterns = [];
    let confidence = 0;

    // 1. Device sharing detection
    if (deviceHash) {
      if (!this.deviceMap.has(deviceHash)) {
        this.deviceMap.set(deviceHash, new Set());
      }
      this.deviceMap.get(deviceHash).add(workerId);
      const sharedCount = this.deviceMap.get(deviceHash).size;
      if (sharedCount > 1) {
        patterns.push({
          type: 'DEVICE_SHARING',
          detail: `Device shared by ${sharedCount} workers`,
          severity: sharedCount > 3 ? 'critical' : 'high',
        });
        confidence += 0.4;
      }
    }

    // 2. Temporal clustering — multiple claims in short window
    const now = Date.now();
    if (!this.claimTimestamps.has(workerId)) {
      this.claimTimestamps.set(workerId, []);
    }
    const timestamps = this.claimTimestamps.get(workerId);
    timestamps.push(now);
    // Keep only last 24h
    const recent = timestamps.filter(t => now - t < 24 * 3600000);
    this.claimTimestamps.set(workerId, recent);

    if (recent.length > 5) {
      patterns.push({
        type: 'TEMPORAL_CLUSTER',
        detail: `${recent.length} claims in 24h window`,
        severity: recent.length > 10 ? 'critical' : 'medium',
      });
      confidence += 0.3;
    }

    // 3. Enrollment Surge Detection — 3× new registrations before forecast severe weather
    const surgeResult = await this._checkEnrollmentSurge(zoneId);
    if (surgeResult.isSurge) {
      patterns.push({
        type: 'ENROLLMENT_SURGE',
        detail: surgeResult.detail,
        severity: 'high',
      });
      confidence += 0.25;
    }

    // 4. DBSCAN GPS Clustering — detect spoofed coordinates
    if (gpsLat && gpsLon) {
      const dbscanResult = this._dbscanClusterCheck(gpsLat, gpsLon, zoneId);
      if (dbscanResult.isSuspicious) {
        patterns.push({
          type: 'GPS_CLUSTER_ANOMALY',
          detail: dbscanResult.detail,
          severity: 'high',
        });
        confidence += 0.3;
      }
    }

    // 5. Cross-zone anomaly — claims from different cities simultaneously
    try {
      const result = await pool.query(
        `SELECT DISTINCT w.zone_id FROM claims c
         JOIN workers w ON w.id = c.worker_id
         WHERE c.worker_id = $1 AND c.created_at > NOW() - INTERVAL '6 hours'`,
        [workerId]
      );
      if (result.rows.length > 2) {
        patterns.push({
          type: 'MULTI_ZONE_ANOMALY',
          detail: `Claims from ${result.rows.length} different zones in 6h`,
          severity: 'critical',
        });
        confidence += 0.5;
      }
    } catch (err) {
      // DB not available — skip cross-zone check
    }

    confidence = Math.min(1, confidence);

    return {
      isRing: confidence > 0.5,
      confidence,
      patterns,
      recommendation: confidence > 0.7 ? 'BLOCK' : confidence > 0.5 ? 'FLAG_FOR_REVIEW' : 'ALLOW',
    };
  }

  /**
   * Signal 3 — Enrollment Surge Detection
   * Flag if zone sees 3× the normal registration rate within 48h before severe weather
   */
  async _checkEnrollmentSurge(zoneId) {
    try {
      // Check new registrations in last 48h for this zone
      const recentResult = await pool.query(
        `SELECT COUNT(*) as count FROM workers
         WHERE zone_id = $1 AND created_at > NOW() - INTERVAL '48 hours'`,
        [zoneId]
      );
      // Check normal baseline (last 30 days average per 48h window)
      const baselineResult = await pool.query(
        `SELECT COUNT(*) as count FROM workers
         WHERE zone_id = $1 AND created_at > NOW() - INTERVAL '30 days'`,
        [zoneId]
      );

      const recentCount = parseInt(recentResult.rows[0].count || 0);
      const totalLast30d = parseInt(baselineResult.rows[0].count || 1);
      const avgPer48h = (totalLast30d / 30) * 2; // average per 48h

      if (recentCount > avgPer48h * 3 && recentCount >= 5) {
        return {
          isSurge: true,
          detail: `${recentCount} new registrations in 48h (${(recentCount / Math.max(avgPer48h, 1) * 100).toFixed(0)}% of normal rate)`,
        };
      }
    } catch (err) {
      // DB unavailable — use in-memory tracking
      const now = Date.now();
      this.enrollmentHistory.push({ ts: now, zoneId });
      // Keep only last 48h
      const recent48h = this.enrollmentHistory.filter(e => now - e.ts < 48 * 3600000 && e.zoneId === zoneId);
      if (recent48h.length > 15) {
        return {
          isSurge: true,
          detail: `${recent48h.length} enrollment events tracked in zone in 48h window`,
        };
      }
    }
    return { isSurge: false };
  }

  /**
   * DBSCAN-based GPS clustering
   * Clusters claim GPS coordinates and flags if too many claims come from
   * identical/near-identical coordinates (spoofing indicator)
   *
   * DBSCAN params:
   *   eps: 0.0003 (~30m radius)
   *   minPts: 3 (minimum 3 claims from same spot = suspicious)
   */
  _dbscanClusterCheck(lat, lon, zoneId) {
    // Collect recent GPS coords from claimTimestamps contextually
    // In this simplified version, we track GPS in-memory
    if (!this._gpsPoints) this._gpsPoints = [];

    this._gpsPoints.push({ lat, lon, ts: Date.now(), zoneId });

    // Prune old points (keep last 24h)
    const now = Date.now();
    this._gpsPoints = this._gpsPoints.filter(p => now - p.ts < 24 * 3600000);

    // Run DBSCAN on points in this zone
    const zonePoints = this._gpsPoints.filter(p => p.zoneId === zoneId);
    if (zonePoints.length < 3) return { isSuspicious: false };

    const eps = 0.0003; // ~30 meters
    const minPts = 3;

    // Find clusters using DBSCAN
    const clusters = this._dbscan(zonePoints.map(p => [p.lat, p.lon]), eps, minPts);

    // Check if any cluster has too many points (spoofed coordinates)
    for (const cluster of clusters) {
      if (cluster.length >= minPts) {
        // Check if the current point is in this suspicious cluster
        const currentInCluster = cluster.some(idx => {
          const p = zonePoints[idx];
          const dist = Math.sqrt(Math.pow(p.lat - lat, 2) + Math.pow(p.lon - lon, 2));
          return dist < eps;
        });
        if (currentInCluster) {
          return {
            isSuspicious: true,
            detail: `GPS coordinates cluster detected: ${cluster.length} claims within ${Math.round(eps * 111000)}m radius`,
          };
        }
      }
    }

    return { isSuspicious: false };
  }

  /**
   * DBSCAN algorithm implementation
   * @param {number[][]} points - Array of [lat, lon] pairs
   * @param {number} eps - Maximum distance between two points
   * @param {number} minPts - Minimum points to form a dense cluster
   * @returns {number[][]} Array of clusters (each cluster is array of point indices)
   */
  _dbscan(points, eps, minPts) {
    const n = points.length;
    const labels = new Array(n).fill(-1); // -1 = unvisited
    const clusters = [];
    let clusterId = 0;

    for (let i = 0; i < n; i++) {
      if (labels[i] !== -1) continue; // Already visited

      const neighbors = this._rangeQuery(points, i, eps);
      if (neighbors.length < minPts) {
        labels[i] = -2; // Noise
        continue;
      }

      // Start new cluster
      const cluster = [];
      labels[i] = clusterId;
      cluster.push(i);

      const queue = [...neighbors];
      while (queue.length > 0) {
        const j = queue.shift();
        if (labels[j] === -2) {
          labels[j] = clusterId;
          cluster.push(j);
        }
        if (labels[j] !== -1) continue;

        labels[j] = clusterId;
        cluster.push(j);

        const jNeighbors = this._rangeQuery(points, j, eps);
        if (jNeighbors.length >= minPts) {
          queue.push(...jNeighbors);
        }
      }

      clusters.push(cluster);
      clusterId++;
    }

    return clusters;
  }

  /**
   * Find all points within eps distance of point at index
   */
  _rangeQuery(points, index, eps) {
    const neighbors = [];
    for (let i = 0; i < points.length; i++) {
      if (i === index) continue;
      const dist = Math.sqrt(
        Math.pow(points[i][0] - points[index][0], 2) +
        Math.pow(points[i][1] - points[index][1], 2)
      );
      if (dist <= eps) {
        neighbors.push(i);
      }
    }
    return neighbors;
  }

  /**
   * Get full ring analysis report for admin dashboard
   */
  getReport() {
    const sharedDevices = [];
    for (const [hash, workers] of this.deviceMap.entries()) {
      if (workers.size > 1) {
        sharedDevices.push({
          deviceHash: hash,
          workerCount: workers.size,
          workerIds: Array.from(workers),
        });
      }
    }

    return {
      sharedDevices,
      totalDevicesTracked: this.deviceMap.size,
      totalWorkersTracked: this.claimTimestamps.size,
      gpsPointsTracked: this._gpsPoints ? this._gpsPoints.length : 0,
    };
  }
}

module.exports = RingDetector;
