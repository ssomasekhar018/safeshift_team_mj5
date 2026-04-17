/**
 * SafeShift — Ring Detector Service (MongoDB/Mongoose version)
 * Detects coordinated fraud patterns:
 * Signal 1: Same device hash across multiple workers (device sharing)
 * Signal 2: Temporal clustering of claims
 * Signal 3: Enrollment surge before severe weather (3× registrations)
 * Signal 4: GPS coordinate clustering via DBSCAN
 * Signal 5: Cross-zone anomaly detection
 */
const { connectMongoDB, getModels } = require('../db/mongodb');

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
      await connectMongoDB();
      const { Claim } = getModels();
      const sixHoursAgo = new Date(Date.now() - 6 * 3600000);
      
      const recentClaims = await Claim.find({
        worker_id: workerId,
        created_at: { $gt: sixHoursAgo }
      }).populate('worker_id', 'zone_id');

      const distinctZones = new Set(recentClaims.map(c => c.worker_id?.zone_id).filter(Boolean));
      
      if (distinctZones.size > 2) {
        patterns.push({
          type: 'MULTI_ZONE_ANOMALY',
          detail: `Claims from ${distinctZones.size} different zones in 6h`,
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
      await connectMongoDB();
      const { Worker } = getModels();
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 3600000);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000);

      // Check new registrations in last 48h for this zone
      const recentCount = await Worker.countDocuments({
        zone_id: zoneId,
        created_at: { $gt: fortyEightHoursAgo }
      });

      // Check normal baseline (last 30 days average per 48h window)
      const totalLast30d = await Worker.countDocuments({
        zone_id: zoneId,
        created_at: { $gt: thirtyDaysAgo }
      });

      const avgPer48h = (Math.max(totalLast30d, 1) / 30) * 2; // average per 48h

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
   */
  _dbscanClusterCheck(lat, lon, zoneId) {
    if (!this._gpsPoints) this._gpsPoints = [];

    this._gpsPoints.push({ lat, lon, ts: Date.now(), zoneId });

    const now = Date.now();
    this._gpsPoints = this._gpsPoints.filter(p => now - p.ts < 24 * 3600000);

    const zonePoints = this._gpsPoints.filter(p => p.zoneId === zoneId);
    if (zonePoints.length < 3) return { isSuspicious: false };

    const eps = 0.0003; // ~30 meters
    const minPts = 3;

    const clusters = this._dbscan(zonePoints.map(p => [p.lat, p.lon]), eps, minPts);

    for (const cluster of clusters) {
      if (cluster.length >= minPts) {
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

  _dbscan(points, eps, minPts) {
    const n = points.length;
    const labels = new Array(n).fill(-1);
    const clusters = [];
    let clusterId = 0;

    for (let i = 0; i < n; i++) {
      if (labels[i] !== -1) continue;

      const neighbors = this._rangeQuery(points, i, eps);
      if (neighbors.length < minPts) {
        labels[i] = -2;
        continue;
      }

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