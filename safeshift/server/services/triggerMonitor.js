/**
 * SafeShift — Trigger Monitor Service
 * Polls 5 data sources: Rain, AQI, Heat, Dark Store Closure, Platform Shutdown
 * Fires trigger events when thresholds are breached
 */
const axios = require('axios');
const { parseWeatherResponse, parseAQIResponse } = require('../utils/validators');

class TriggerMonitor {
  constructor() {
    this.THRESHOLDS = {
      rain: 15,       // mm/hr
      aqi: 400,       // AQI index
      heat: 45,       // °C
      closure: 1,     // boolean — dark store closure
      shutdown: 1,    // boolean — platform-wide shutdown
    };

    // Zone coordinates with names for real API integration
    this.ZONE_COORDS = [
      { id: 'KOR-4B', lat: 12.9352, lon: 77.6245, name: 'Koramangala' },
      { id: 'HSR-2A', lat: 12.9116, lon: 77.6389, name: 'HSR Layout' },
      { id: 'BTM-1C', lat: 12.9166, lon: 77.6101, name: 'BTM Layout' },
      { id: 'IND-3D', lat: 12.9784, lon: 77.6408, name: 'Indiranagar' },
      { id: 'WHT-5A', lat: 12.9698, lon: 77.7500, name: 'Whitefield' },
      { id: 'MG-1B', lat: 12.9756, lon: 77.6066, name: 'MG Road' },
      { id: 'DL-CP', lat: 28.6315, lon: 77.2167, name: 'Connaught Place' },
      { id: 'DL-RK', lat: 28.5635, lon: 77.1724, name: 'Rajouri Garden' },
    ];

    // Backward compatibility
    this.zones = this.ZONE_COORDS;

    // Cache for last API results (zone_id -> conditions)
    this.lastResults = new Map();

    this.pollingInterval = null;
    this.PORT = process.env.PORT || 4000;

    // Track closure / shutdown state per zone
    this.closureState = new Map();
    this.shutdownState = new Map();
    
    // Database pool reference (set by server.js)
    this.pool = null;
  }

  /**
   * Get current conditions for a specific zone
   * @param {string} zoneId - Zone identifier
   * @returns {object|null} - Cached weather conditions or null
   */
  getCurrentConditions(zoneId) {
    return this.lastResults.get(zoneId) || null;
  }

  /**
   * Get all zones' current conditions
   * @returns {Map} - Map of zone_id -> conditions
   */
  getAllConditions() {
    return new Map(this.lastResults);
  }

  /**
   * Start polling all data sources every interval
   */
  start(intervalMs = 300000) { // Default: 5 minutes
    console.log(`[MONITOR] Starting trigger monitor (interval: ${intervalMs / 1000}s)`);
    this.pollingInterval = setInterval(() => this.pollAll(), intervalMs);
    // Initial poll after 10 seconds
    setTimeout(() => this.pollAll(), 10000);
  }

  stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      console.log('[MONITOR] Trigger monitor stopped');
    }
  }

  async pollAll() {
    console.log('[MONITOR] Polling all 5 data sources...');
    for (const zone of this.zones) {
      try {
        await this._checkWeather(zone);  // Rain + Heat
        await this._checkAQI(zone);       // AQI
        await this._checkClosure(zone);   // Dark Store Closure
        await this._checkShutdown(zone);  // Platform Shutdown
      } catch (err) {
        console.warn(`[MONITOR] Error polling zone ${zone.id}:`, err.message);
      }
    }
  }

  /**
   * Trigger 1 (Rain) + Trigger 3 (Heat): OpenWeatherMap API
   */
  async _checkWeather(zone) {
    try {
      const apiKey = process.env.OPENWEATHER_API_KEY;
      
      // Skip if no API key configured
      if (!apiKey || apiKey === 'demo_key') {
        return;
      }

      const resp = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${zone.lat}&lon=${zone.lon}&appid=${apiKey}&units=metric`,
        { timeout: 5000 }
      );

      // Parse response with safe defaults
      const weatherData = parseWeatherResponse(resp.data);
      weatherData.zone_id = zone.id;
      
      // Cache the results
      const cached = this.lastResults.get(zone.id) || {};
      this.lastResults.set(zone.id, {
        ...cached,
        rainfall_mm: weatherData.rainfall_mm,
        temperature_c: weatherData.temperature_c,
        feels_like_c: weatherData.feels_like_c,
        humidity: weatherData.humidity,
        source: weatherData.source,
        timestamp: weatherData.timestamp,
        zone_id: zone.id,
      });

      console.log(`[MONITOR] 🟢 Weather data for ${zone.id}: ${weatherData.temperature_c}°C, ${weatherData.rainfall_mm}mm/hr (${weatherData.source})`);

      // Check thresholds and fire triggers
      if (weatherData.rainfall_mm >= this.THRESHOLDS.rain) {
        await this._fireTrigger(zone.id, 'rain', weatherData.rainfall_mm, resp.data);
      }

      if (weatherData.temperature_c >= this.THRESHOLDS.heat) {
        await this._fireTrigger(zone.id, 'heat', weatherData.temperature_c, resp.data);
      }
    } catch (err) {
      // Handle authentication errors
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        console.error(`[MONITOR] ❌ OpenWeatherMap authentication error for ${zone.id}: ${err.message}`);
      } else if (err.code === 'ECONNABORTED') {
        console.warn(`[MONITOR] ⏱️ OpenWeatherMap timeout for ${zone.id}, skipping this poll`);
      } else {
        console.warn(`[MONITOR] ⚠️ OpenWeatherMap error for ${zone.id}: ${err.message}`);
      }
      // Continue polling other zones
    }
  }

  /**
   * Trigger 2 (AQI): AQICN / WAQI API
   */
  async _checkAQI(zone) {
    try {
      const apiKey = process.env.AQICN_TOKEN;
      
      // Skip if no API key configured
      if (!apiKey || apiKey === 'demo_key') {
        return;
      }

      const resp = await axios.get(
        `https://api.waqi.info/feed/geo:${zone.lat};${zone.lon}/?token=${apiKey}`,
        { timeout: 5000 }
      );

      // Parse response with safe defaults
      const aqiData = parseAQIResponse(resp.data);
      aqiData.zone_id = zone.id;
      
      // Cache the results
      const cached = this.lastResults.get(zone.id) || {};
      this.lastResults.set(zone.id, {
        ...cached,
        aqi: aqiData.aqi,
        pm25: aqiData.pm25,
        pm10: aqiData.pm10,
        aqi_source: aqiData.source,
        aqi_timestamp: aqiData.timestamp,
        zone_id: zone.id,
      });

      console.log(`[MONITOR] 🟢 AQI data for ${zone.id}: ${aqiData.aqi} (${aqiData.source})`);

      // Check threshold and fire trigger
      if (aqiData.aqi >= this.THRESHOLDS.aqi) {
        await this._fireTrigger(zone.id, 'aqi', aqiData.aqi, resp.data);
      }
    } catch (err) {
      // Handle authentication errors
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        console.error(`[MONITOR] ❌ AQICN authentication error for ${zone.id}: ${err.message}`);
      } else if (err.code === 'ECONNABORTED') {
        console.warn(`[MONITOR] ⏱️ AQICN timeout for ${zone.id}, skipping this poll`);
      } else {
        console.warn(`[MONITOR] ⚠️ AQICN error for ${zone.id}: ${err.message}`);
      }
      // Continue polling other zones
    }
  }

  /**
   * Trigger 4 (Dark Store Closure): Check if dark stores in the zone are closed
   * In production, this would poll the Q-commerce platform API (Zepto/Blinkit/etc.)
   * For demo, we simulate by checking a mock closure feed
   */
  async _checkClosure(zone) {
    try {
      // Production: poll platform API for dark store operational status
      // Demo: check if closure has been simulated for this zone
      const closureKey = `closure_${zone.id}`;
      const lastCheck = this.closureState.get(closureKey);

      // In production, hit the platform API:
      // const resp = await axios.get(`https://platform-api.example.com/stores/status?zone=${zone.id}`)
      // const isClosed = resp.data.stores.some(s => s.status === 'closed')

      // For demo: closures are triggered via /api/triggers/simulate
      // This method simply ensures the polling loop covers all 5 triggers
      if (lastCheck && Date.now() - lastCheck.ts < 300000) {
        // Recently checked, skip
        return;
      }

      this.closureState.set(closureKey, { ts: Date.now(), status: 'monitored' });
    } catch (err) {
      // Silent fail
    }
  }

  /**
   * Trigger 5 (Platform Shutdown): Check if the delivery platform is experiencing outage
   * In production, this would monitor platform health endpoints
   */
  async _checkShutdown(zone) {
    try {
      // Production: poll platform health / status page
      // const resp = await axios.get(`https://status.zepto.delivery/api/zones/${zone.id}`)
      // const isDown = resp.data.status === 'shutdown'

      const shutdownKey = `shutdown_${zone.id}`;
      const lastCheck = this.shutdownState.get(shutdownKey);

      if (lastCheck && Date.now() - lastCheck.ts < 300000) {
        return;
      }

      this.shutdownState.set(shutdownKey, { ts: Date.now(), status: 'monitored' });
    } catch (err) {
      // Silent fail
    }
  }

  async _fireTrigger(zoneId, triggerType, value, apiPayload) {
    console.log(`[MONITOR] 🔥 TRIGGER: ${triggerType.toUpperCase()} in ${zoneId} = ${value}`);
    
    try {
      // Calculate claiming percentage and severity for mass disruption detection
      let claimingPercentage = 0;
      let severityLevel = 'normal';
      let massDisruptionMode = 0;
      
      if (this.pool) {
        try {
          // Query total workers and active policies in zone
          const workersResult = await this.pool.query(
            'SELECT COUNT(*) as count FROM workers WHERE zone_id = $1',
            [zoneId]
          );
          const policiesResult = await this.pool.query(
            'SELECT COUNT(*) as count FROM policies WHERE zone_id = $1 AND status = $2',
            [zoneId, 'active']
          );
          
          const totalWorkers = parseInt(workersResult.rows[0].count) || 0;
          const activePolicies = parseInt(policiesResult.rows[0].count) || 0;
          
          // Calculate claiming percentage (handle division by zero)
          if (totalWorkers > 0) {
            claimingPercentage = activePolicies / totalWorkers;
          }
          
          // Get current conditions for severity classification
          const conditions = this.lastResults.get(zoneId) || {};
          severityLevel = this.classifySeverity(conditions);
          
          // Check mass disruption activation criteria
          if (claimingPercentage > 0.40 && severityLevel === 'severe') {
            massDisruptionMode = 1;
            console.log(`[MONITOR] ⚠️ MASS DISRUPTION activated in ${zoneId}: ${(claimingPercentage * 100).toFixed(1)}% claiming, ${severityLevel} severity`);
          }
        } catch (dbErr) {
          console.warn(`[MONITOR] Database query failed for mass disruption check: ${dbErr.message}`);
        }
      }
      
      // Fire trigger with mass disruption metadata
      await axios.post(`http://localhost:${this.PORT}/api/triggers/simulate`, {
        zone_id: zoneId,
        trigger_type: triggerType,
        threshold_value: value,
        mass_disruption_mode: massDisruptionMode,
        claiming_percentage: claimingPercentage,
        severity_level: severityLevel,
      }, { timeout: 15000 });
    } catch (err) {
      console.error(`[MONITOR] Failed to fire trigger:`, err.message);
    }
  }
  
  /**
   * Classify severity level based on weather conditions
   * @param {object} conditions - Current weather conditions
   * @returns {string} - 'severe' or 'normal'
   */
  classifySeverity(conditions) {
    const rainfall = conditions.rainfall_mm || 0;
    const aqi = conditions.aqi || 0;
    const temperature = conditions.temperature_c || 0;
    
    // Severe if: rainfall > 25 OR aqi > 500 OR temperature > 48
    if (rainfall > 25 || aqi > 500 || temperature > 48) {
      return 'severe';
    }
    
    return 'normal';
  }
}

module.exports = TriggerMonitor;
