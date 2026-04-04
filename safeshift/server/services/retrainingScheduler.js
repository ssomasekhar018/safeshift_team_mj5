/**
 * SafeShift — Model Retraining Scheduler
 * Schedules ML model retraining every Sunday at 10 PM IST
 * before the new policy cycle begins (Monday).
 *
 * In production, this would trigger the Python training scripts
 * and reload the models in the FastAPI service.
 */

class RetrainingScheduler {
  constructor() {
    this.timer = null;
    this.lastRun = null;
    this.ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  }

  /**
   * Start the weekly retraining scheduler
   * Runs every Sunday at 10:00 PM IST (16:30 UTC)
   */
  start() {
    console.log('[RETRAIN] Model retraining scheduler started');
    console.log('[RETRAIN] Cadence: Every Sunday at 10:00 PM IST');

    // Check every hour if it's time to retrain
    this.timer = setInterval(() => this._checkSchedule(), 3600000);

    // Also check immediately on startup
    this._checkSchedule();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      console.log('[RETRAIN] Scheduler stopped');
    }
  }

  _checkSchedule() {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60; // minutes
    const istTime = new Date(now.getTime() + istOffset * 60000);
    const day = istTime.getUTCDay(); // 0 = Sunday
    const hour = istTime.getUTCHours();

    // Sunday (0) at 22:xx (10 PM IST)
    if (day === 0 && hour === 22) {
      // Only run once per slot
      const slotKey = `${istTime.getUTCFullYear()}-${istTime.getUTCMonth()}-${istTime.getUTCDate()}`;
      if (this.lastRun !== slotKey) {
        this.lastRun = slotKey;
        this._triggerRetraining();
      }
    }
  }

  async _triggerRetraining() {
    console.log('[RETRAIN] === Starting weekly model retraining ===');
    console.log(`[RETRAIN] Timestamp: ${new Date().toISOString()}`);

    try {
      // In production, spawn the Python training processes
      const { exec } = require('child_process');
      const path = require('path');
      const trainDir = path.join(__dirname, '..', '..', 'ml', 'train');

      // Train premium model
      console.log('[RETRAIN] Training premium risk model...');
      await this._runScript(`python "${path.join(trainDir, 'train_premium.py')}"`);

      // Train fraud model
      console.log('[RETRAIN] Training fraud detection model...');
      await this._runScript(`python "${path.join(trainDir, 'train_fraud.py')}"`);

      // Notify ML service to reload models (if health endpoint is available)
      try {
        const axios = require('axios');
        const healthResp = await axios.get(`${this.ML_SERVICE_URL}/health`, { timeout: 5000 });
        console.log(`[RETRAIN] ML Service status: ${healthResp.data.status}`);
      } catch (err) {
        console.warn('[RETRAIN] ML service not reachable — models will be loaded on next restart');
      }

      console.log('[RETRAIN] === Weekly retraining complete ===');
    } catch (err) {
      console.error('[RETRAIN] Retraining failed:', err.message);
    }
  }

  _runScript(command) {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      exec(command, { timeout: 120000 }, (error, stdout, stderr) => {
        if (stdout) console.log(stdout);
        if (stderr) console.warn(stderr);
        if (error) {
          console.error(`[RETRAIN] Script error: ${error.message}`);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = RetrainingScheduler;
