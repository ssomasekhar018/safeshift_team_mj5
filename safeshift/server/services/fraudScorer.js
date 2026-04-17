/**
 * SafeShift — Fraud Scorer Service
 * 6-signal trust scoring engine
 * Signals: GPS jitter, network match, signal strength, accelerometer, zone history, platform active
 *
 * Weights (as documented):
 *   gps_jitter:       0.20
 *   network_match:    0.15
 *   signal_strength:  0.15
 *   accelerometer:    0.15
 *   zone_history:     0.20
 *   platform_active:  0.15
 */

class FraudScorer {
  constructor() {
    // ── Weights aligned with README specification ──
    this.weights = {
      gps_jitter: 0.20,
      network_match: 0.15,
      signal_strength: 0.15,
      accelerometer: 0.15,
      zone_history: 0.20,
      platform_active: 0.15,
    };
  }

  /**
   * Score a claim based on 6 device/behavior signals
   * Returns { score: 0–100, signals: { ... }, flags: [...] }
   * @param {object} options - Scoring options
   * @param {boolean} options.massDisruptionMode - Whether mass disruption is active (lowers thresholds)
   * @param {object} options.pool - Database pool for ring detection queries
   */
  async score({ workerId, deviceHash, gpsLat, gpsLon, zoneId, triggerType, trustHistory, massDisruptionMode = false, pool = null }) {
    const signals = {};
    const flags = [];

    // 1. GPS Jitter Analysis — is the device actually in the zone?
    signals.gps_jitter = this._analyzeGPSJitter(gpsLat, gpsLon, zoneId);

    // 2. Network consistency — same cell tower / WiFi?
    signals.network_match = this._analyzeNetworkMatch(trustHistory);

    // 3. Signal strength realism — is it plausible outdoor signal?
    signals.signal_strength = this._analyzeSignalStrength(trustHistory);

    // 4. Accelerometer data — is the device in motion (delivery)?
    signals.accelerometer = this._analyzeAccelerometer(trustHistory);

    // 5. Zone history — previous check-ins in this zone
    signals.zone_history = this._analyzeZoneHistory(trustHistory, zoneId);

    // 6. Platform active check — is the worker currently online on delivery app?
    signals.platform_active = this._analyzePlatformActive(trustHistory);

    // Calculate weighted score
    let score = 0;
    for (const [key, weight] of Object.entries(this.weights)) {
      score += (signals[key] || 0) * weight * 100;
    }
    score = Math.round(Math.min(100, Math.max(0, score)));

    // Adjust thresholds for mass disruption mode (lower by 15 points)
    const gpsThreshold = massDisruptionMode ? 0.25 : 0.4;
    const networkThreshold = massDisruptionMode ? 0.15 : 0.3;
    const accelThreshold = massDisruptionMode ? 0.05 : 0.2;
    const zoneThreshold = massDisruptionMode ? 0.15 : 0.3;
    const platformThreshold = massDisruptionMode ? 0.15 : 0.3;

    // Flag suspicious patterns with adjusted thresholds
    if (signals.gps_jitter < gpsThreshold) flags.push('GPS_SPOOF_SUSPECTED');
    if (signals.network_match < networkThreshold) flags.push('NETWORK_MISMATCH');
    if (signals.accelerometer < accelThreshold) flags.push('DEVICE_STATIONARY');
    if (signals.zone_history < zoneThreshold) flags.push('NEW_ZONE_NO_HISTORY');
    if (signals.platform_active < platformThreshold) flags.push('PLATFORM_OFFLINE');

    // Ring detection — enhanced in mass disruption mode
    if (massDisruptionMode && pool && gpsLat && gpsLon) {
      try {
        // Call ML service ring detection endpoint
        const axios = require('axios');
        const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
        
        // Get all recent claims in zone with GPS coordinates
        const claimsResult = await pool.query(
          `SELECT id as claim_id, gps_lat, gps_lon 
           FROM claims 
           WHERE zone_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
           AND gps_lat IS NOT NULL AND gps_lon IS NOT NULL`,
          [zoneId]
        );
        
        if (claimsResult.rows.length >= 3) {
          const ringResponse = await axios.post(`${ML_SERVICE_URL}/ring-detect`, {
            claims: claimsResult.rows,
            eps: 0.01,
            min_samples: 3,
          }, { timeout: 5000 });
          
          if (ringResponse.data.dbscan_clusters > 0) {
            flags.push('RING_PATTERN_DETECTED');
            console.log(`[FRAUD] Ring detection: ${ringResponse.data.dbscan_clusters} clusters found in ${zoneId}`);
          }
        }
      } catch (err) {
        console.warn(`[FRAUD] Ring detection failed: ${err.message}`);
      }
    } else if (deviceHash) {
      // Fallback ring detection
      const ringRisk = this._checkRingPatterns(workerId, deviceHash);
      if (ringRisk > 0.7) {
        flags.push('RING_PATTERN_DETECTED');
        score = Math.round(score * 0.5);
      }
    }

    if (massDisruptionMode) {
      console.log(`[FRAUD] Worker ${workerId}: score=${score}, flags=[${flags.join(', ')}] (MASS DISRUPTION MODE)`);
    } else {
      console.log(`[FRAUD] Worker ${workerId}: score=${score}, flags=[${flags.join(', ')}]`);
    }

    return { score, signals, flags };
  }

  _analyzeGPSJitter(lat, lon, zoneId) {
    // Check if GPS coordinates are within expected zone bounds
    const ZONE_CENTERS = {
      'KOR-4B': { lat: 12.9352, lon: 77.6245, radius: 0.02 },
      'HSR-2A': { lat: 12.9116, lon: 77.6389, radius: 0.02 },
      'BTM-1C': { lat: 12.9166, lon: 77.6101, radius: 0.02 },
      'IND-3D': { lat: 12.9784, lon: 77.6408, radius: 0.02 },
      'WHT-5A': { lat: 12.9698, lon: 77.7500, radius: 0.025 },
      'MG-1B': { lat: 12.9756, lon: 77.6066, radius: 0.015 },
      'DL-CP': { lat: 28.6315, lon: 77.2167, radius: 0.02 },
      'DL-RK': { lat: 28.5635, lon: 77.1724, radius: 0.02 },
    };

    const zone = ZONE_CENTERS[zoneId];
    if (!zone || !lat || !lon) return 0.7; // Default moderate score

    const distance = Math.sqrt(Math.pow(lat - zone.lat, 2) + Math.pow(lon - zone.lon, 2));
    if (distance <= zone.radius) return 0.95;
    if (distance <= zone.radius * 2) return 0.7;
    if (distance <= zone.radius * 5) return 0.4;
    return 0.15; // Too far from zone
  }

  _analyzeNetworkMatch(trustHistory) {
    if (!trustHistory || !Array.isArray(trustHistory) || trustHistory.length === 0) {
      return 0.6; // No history, moderate score
    }
    // Check last few check-ins for network consistency
    const recent = trustHistory.slice(-5);
    const networkTypes = recent.map(h => h.network_type).filter(Boolean);
    if (networkTypes.length === 0) return 0.6;
    // If mostly same network type, higher score
    const mode = networkTypes.sort((a, b) =>
      networkTypes.filter(v => v === a).length - networkTypes.filter(v => v === b).length
    ).pop();
    const consistency = networkTypes.filter(n => n === mode).length / networkTypes.length;
    return Math.max(0.3, consistency);
  }

  _analyzeSignalStrength(trustHistory) {
    if (!trustHistory || !Array.isArray(trustHistory) || trustHistory.length === 0) {
      return 0.65;
    }
    const recent = trustHistory.slice(-3);
    const strengths = recent.map(h => h.signal_strength).filter(s => s !== undefined);
    if (strengths.length === 0) return 0.65;
    const avg = strengths.reduce((a, b) => a + b, 0) / strengths.length;
    // Outdoor signal typically -50 to -90 dBm → normalize to 0–1
    if (avg >= -70) return 0.9;
    if (avg >= -85) return 0.7;
    return 0.4;
  }

  _analyzeAccelerometer(trustHistory) {
    if (!trustHistory || !Array.isArray(trustHistory) || trustHistory.length < 2) {
      return 0.7;
    }
    // Check if GPS positions show movement (delivery activity)
    const recent = trustHistory.slice(-5);
    let totalMovement = 0;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].lat && recent[i - 1].lat) {
        totalMovement += Math.abs(recent[i].lat - recent[i - 1].lat) + Math.abs(recent[i].lon - recent[i - 1].lon);
      }
    }
    if (totalMovement > 0.01) return 0.9; // Active movement
    if (totalMovement > 0.001) return 0.6; // Minor movement
    return 0.3; // Stationary — suspicious
  }

  _analyzeZoneHistory(trustHistory, zoneId) {
    if (!trustHistory || !Array.isArray(trustHistory) || trustHistory.length === 0) {
      return 0.5;
    }
    // More check-ins in this zone = higher trust
    const count = trustHistory.length;
    if (count >= 20) return 0.95;
    if (count >= 10) return 0.8;
    if (count >= 5) return 0.65;
    return 0.4;
  }

  _analyzePlatformActive(trustHistory) {
    if (!trustHistory || !Array.isArray(trustHistory) || trustHistory.length === 0) {
      return 0.6;
    }
    // Check if there's a recent check-in (within last 2 hours)
    const lastCheckin = trustHistory[trustHistory.length - 1];
    if (lastCheckin && lastCheckin.ts) {
      const elapsed = Date.now() - new Date(lastCheckin.ts).getTime();
      if (elapsed < 2 * 3600000) return 0.95; // Active within 2h
      if (elapsed < 6 * 3600000) return 0.7;
      return 0.4;
    }
    return 0.6;
  }

  _checkRingPatterns(workerId, deviceHash) {
    // Simple ring detection — in production, cross-check device hashes
    // across multiple workers for same device filing multiple claims
    return 0.1; // Low ring risk by default
  }
}

module.exports = FraudScorer;
