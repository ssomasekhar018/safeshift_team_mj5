/**
 * SafeShift — Trigger Monitor Service
 * Polls 5 data sources: Rain, AQI, Heat, Dark Store Closure, Platform Shutdown
 * Fires trigger events when thresholds are breached
 */
const axios = require('axios');

class TriggerMonitor {
  constructor() {
    this.THRESHOLDS = {
      rain: 15,       // mm/hr
      aqi: 400,       // AQI index
      heat: 45,       // °C
      closure: 1,     // boolean — dark store closure
      shutdown: 1,    // boolean — platform-wide shutdown
    };

    this.zones = [
      { id: 'KOR-4B', lat: 12.9352, lon: 77.6245 },
      { id: 'HSR-2A', lat: 12.9116, lon: 77.6389 },
      { id: 'BTM-1C', lat: 12.9166, lon: 77.6101 },
      { id: 'IND-3D', lat: 12.9784, lon: 77.6408 },
      { id: 'WHT-5A', lat: 12.9698, lon: 77.7500 },
      { id: 'MG-1B', lat: 12.9756, lon: 77.6066 },
      { id: 'DL-CP', lat: 28.6315, lon: 77.2167 },
      { id: 'DL-RK', lat: 28.5635, lon: 77.1724 },
    ];

    this.pollingInterval = null;
    this.PORT = process.env.PORT || 4000;

    // Track closure / shutdown state per zone (mock — in production, pull from platform APIs)
    this.closureState = new Map();
    this.shutdownState = new Map();
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
      if (!apiKey || apiKey === 'demo_key') return;

      const resp = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${zone.lat}&lon=${zone.lon}&appid=${apiKey}&units=metric`,
        { timeout: 5000 }
      );

      const rain1h = resp.data.rain?.['1h'] || 0;
      const temp = resp.data.main?.temp || 0;

      if (rain1h >= this.THRESHOLDS.rain) {
        await this._fireTrigger(zone.id, 'rain', rain1h, resp.data);
      }

      if (temp >= this.THRESHOLDS.heat) {
        await this._fireTrigger(zone.id, 'heat', temp, resp.data);
      }
    } catch (err) {
      // Silent fail for API errors
    }
  }

  /**
   * Trigger 2 (AQI): AQICN / WAQI API
   */
  async _checkAQI(zone) {
    try {
      const apiKey = process.env.AQICN_API_KEY;
      if (!apiKey || apiKey === 'demo_key') return;

      const resp = await axios.get(
        `https://api.waqi.info/feed/geo:${zone.lat};${zone.lon}/?token=${apiKey}`,
        { timeout: 5000 }
      );

      const aqi = resp.data?.data?.aqi || 0;
      if (aqi >= this.THRESHOLDS.aqi) {
        await this._fireTrigger(zone.id, 'aqi', aqi, resp.data);
      }
    } catch (err) {
      // Silent fail
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
      await axios.post(`http://localhost:${this.PORT}/api/triggers/simulate`, {
        zone_id: zoneId,
        trigger_type: triggerType,
        threshold_value: value,
      }, { timeout: 15000 });
    } catch (err) {
      console.error(`[MONITOR] Failed to fire trigger:`, err.message);
    }
  }
}

module.exports = TriggerMonitor;
