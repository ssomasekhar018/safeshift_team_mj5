/**
 * Performance Monitoring System for SafeShift Platform
 * 
 * Provides comprehensive performance metrics collection including:
 * - Application load time monitoring
 * - Memory usage tracking and alerting
 * - Frame rate monitoring for animations and 3D backgrounds
 * 
 * Requirements: 7.6, 7.7, 8.1
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      loadTime: null,
      memoryBaseline: null,
      currentMemory: null,
      frameRate: null,
      lastMeasurement: null
    };
    
    this.thresholds = {
      maxLoadTime: 3000, // 3 seconds
      minFrameRate: 60, // 60 FPS
      maxMemoryIncrease: 50 * 1024 * 1024 // 50MB in bytes
    };
    
    this.alerts = [];
    this.listeners = [];
  }

  /**
   * Measure application load time
   * Tracks time from navigation start to load complete
   * @returns {number} Load time in milliseconds
   */
  measureLoadTime() {
    if (typeof window === 'undefined' || !window.performance) {
      console.warn('Performance API not available');
      return null;
    }

    const perfData = window.performance.timing;
    const loadTime = perfData.loadEventEnd - perfData.navigationStart;
    
    this.metrics.loadTime = loadTime;
    this.metrics.lastMeasurement = Date.now();
    
    // Check against threshold
    if (loadTime > this.thresholds.maxLoadTime) {
      this.addAlert({
        type: 'load_time',
        severity: 'warning',
        message: `Load time ${loadTime}ms exceeds threshold of ${this.thresholds.maxLoadTime}ms`,
        value: loadTime,
        threshold: this.thresholds.maxLoadTime,
        timestamp: Date.now()
      });
    }
    
    return loadTime;
  }

  /**
   * Measure memory usage using Performance Memory API
   * Tracks JS heap usage and compares against baseline
   * @returns {Object} Memory usage statistics
   */
  measureMemoryUsage() {
    if (typeof window === 'undefined' || !window.performance || !window.performance.memory) {
      console.warn('Performance Memory API not available');
      return null;
    }

    const memory = {
      used: window.performance.memory.usedJSHeapSize,
      total: window.performance.memory.totalJSHeapSize,
      limit: window.performance.memory.jsHeapSizeLimit,
      timestamp: Date.now()
    };

    // Set baseline on first measurement
    if (this.metrics.memoryBaseline === null) {
      this.metrics.memoryBaseline = memory.used;
    }

    this.metrics.currentMemory = memory;
    const memoryIncrease = memory.used - this.metrics.memoryBaseline;

    // Check against threshold
    if (memoryIncrease > this.thresholds.maxMemoryIncrease) {
      this.addAlert({
        type: 'memory_usage',
        severity: 'warning',
        message: `Memory increase ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB exceeds threshold of ${(this.thresholds.maxMemoryIncrease / 1024 / 1024).toFixed(2)}MB`,
        value: memoryIncrease,
        threshold: this.thresholds.maxMemoryIncrease,
        timestamp: Date.now()
      });
    }

    return {
      ...memory,
      usedMB: (memory.used / 1024 / 1024).toFixed(2),
      totalMB: (memory.total / 1024 / 1024).toFixed(2),
      limitMB: (memory.limit / 1024 / 1024).toFixed(2),
      increaseFromBaseline: memoryIncrease,
      increaseFromBaselineMB: (memoryIncrease / 1024 / 1024).toFixed(2)
    };
  }

  /**
   * Measure frame rate over a specified duration
   * Counts frames rendered using requestAnimationFrame
   * @param {number} duration - Duration in milliseconds (default: 1000ms)
   * @returns {Promise<number>} Frames per second
   */
  async measureFrameRate(duration = 1000) {
    if (typeof window === 'undefined' || !window.requestAnimationFrame) {
      console.warn('requestAnimationFrame not available');
      return null;
    }

    return new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      
      const countFrames = () => {
        frames++;
        const elapsed = performance.now() - start;
        
        if (elapsed < duration) {
          requestAnimationFrame(countFrames);
        } else {
          const fps = Math.round((frames / elapsed) * 1000);
          this.metrics.frameRate = fps;
          this.metrics.lastMeasurement = Date.now();
          
          // Check against threshold
          if (fps < this.thresholds.minFrameRate) {
            this.addAlert({
              type: 'frame_rate',
              severity: 'warning',
              message: `Frame rate ${fps}fps is below threshold of ${this.thresholds.minFrameRate}fps`,
              value: fps,
              threshold: this.thresholds.minFrameRate,
              timestamp: Date.now()
            });
          }
          
          resolve(fps);
        }
      };
      
      requestAnimationFrame(countFrames);
    });
  }

  /**
   * Start continuous frame rate monitoring
   * Measures FPS at regular intervals
   * @param {number} interval - Measurement interval in milliseconds (default: 5000ms)
   * @returns {Function} Stop function to cancel monitoring
   */
  startFrameRateMonitoring(interval = 5000) {
    const monitoringId = setInterval(async () => {
      await this.measureFrameRate();
      this.notifyListeners('frameRate', this.metrics.frameRate);
    }, interval);

    return () => clearInterval(monitoringId);
  }

  /**
   * Start continuous memory monitoring
   * Measures memory usage at regular intervals
   * @param {number} interval - Measurement interval in milliseconds (default: 10000ms)
   * @returns {Function} Stop function to cancel monitoring
   */
  startMemoryMonitoring(interval = 10000) {
    const monitoringId = setInterval(() => {
      const memory = this.measureMemoryUsage();
      this.notifyListeners('memory', memory);
    }, interval);

    return () => clearInterval(monitoringId);
  }

  /**
   * Add a performance alert
   * @param {Object} alert - Alert object with type, severity, message, etc.
   */
  addAlert(alert) {
    this.alerts.push(alert);
    this.notifyListeners('alert', alert);
    
    // Log to console based on severity
    if (alert.severity === 'error') {
      console.error('[Performance Alert]', alert.message);
    } else if (alert.severity === 'warning') {
      console.warn('[Performance Alert]', alert.message);
    } else {
      console.info('[Performance Alert]', alert.message);
    }
  }

  /**
   * Get all performance alerts
   * @param {string} type - Optional filter by alert type
   * @returns {Array} Array of alerts
   */
  getAlerts(type = null) {
    if (type) {
      return this.alerts.filter(alert => alert.type === type);
    }
    return [...this.alerts];
  }

  /**
   * Clear all alerts or alerts of a specific type
   * @param {string} type - Optional alert type to clear
   */
  clearAlerts(type = null) {
    if (type) {
      this.alerts = this.alerts.filter(alert => alert.type !== type);
    } else {
      this.alerts = [];
    }
  }

  /**
   * Get current performance metrics
   * @returns {Object} Current metrics snapshot
   */
  getMetrics() {
    return {
      ...this.metrics,
      thresholds: { ...this.thresholds },
      alertCount: this.alerts.length
    };
  }

  /**
   * Register a listener for performance events
   * @param {Function} callback - Callback function (eventType, data) => void
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove a registered listener
   * @param {Function} callback - Callback function to remove
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Notify all listeners of a performance event
   * @param {string} eventType - Type of event
   * @param {*} data - Event data
   */
  notifyListeners(eventType, data) {
    this.listeners.forEach(listener => {
      try {
        listener(eventType, data);
      } catch (error) {
        console.error('Error in performance listener:', error);
      }
    });
  }

  /**
   * Get a comprehensive performance report
   * @returns {Object} Complete performance report
   */
  getPerformanceReport() {
    return {
      metrics: this.getMetrics(),
      alerts: this.getAlerts(),
      summary: {
        loadTimeStatus: this.metrics.loadTime 
          ? (this.metrics.loadTime <= this.thresholds.maxLoadTime ? 'PASS' : 'FAIL')
          : 'NOT_MEASURED',
        frameRateStatus: this.metrics.frameRate
          ? (this.metrics.frameRate >= this.thresholds.minFrameRate ? 'PASS' : 'FAIL')
          : 'NOT_MEASURED',
        memoryStatus: this.metrics.currentMemory
          ? ((this.metrics.currentMemory.used - this.metrics.memoryBaseline) <= this.thresholds.maxMemoryIncrease ? 'PASS' : 'FAIL')
          : 'NOT_MEASURED'
      },
      timestamp: Date.now()
    };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Export both the class and singleton instance
export { PerformanceMonitor, performanceMonitor };
export default performanceMonitor;
