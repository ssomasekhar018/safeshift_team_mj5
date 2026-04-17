/**
 * React Hook for Performance Monitoring
 * 
 * Provides easy integration of performance monitoring into React components
 * Automatically measures load time on mount and provides methods for ongoing monitoring
 */

import { useState, useEffect, useCallback } from 'react';
import performanceMonitor from '../utils/performanceMonitor';

/**
 * Hook for accessing performance monitoring functionality
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoMeasureLoad - Automatically measure load time on mount (default: true)
 * @param {boolean} options.monitorFrameRate - Continuously monitor frame rate (default: false)
 * @param {boolean} options.monitorMemory - Continuously monitor memory usage (default: false)
 * @param {number} options.frameRateInterval - Frame rate monitoring interval in ms (default: 5000)
 * @param {number} options.memoryInterval - Memory monitoring interval in ms (default: 10000)
 * @returns {Object} Performance monitoring interface
 */
export function usePerformanceMonitor(options = {}) {
  const {
    autoMeasureLoad = true,
    monitorFrameRate = false,
    monitorMemory = false,
    frameRateInterval = 5000,
    memoryInterval = 10000
  } = options;

  const [metrics, setMetrics] = useState(performanceMonitor.getMetrics());
  const [alerts, setAlerts] = useState(performanceMonitor.getAlerts());

  // Update metrics when performance events occur
  useEffect(() => {
    const handlePerformanceEvent = (eventType, data) => {
      setMetrics(performanceMonitor.getMetrics());
      
      if (eventType === 'alert') {
        setAlerts(performanceMonitor.getAlerts());
      }
    };

    performanceMonitor.addListener(handlePerformanceEvent);

    return () => {
      performanceMonitor.removeListener(handlePerformanceEvent);
    };
  }, []);

  // Auto-measure load time on mount
  useEffect(() => {
    if (autoMeasureLoad) {
      // Wait for page to fully load
      if (document.readyState === 'complete') {
        performanceMonitor.measureLoadTime();
      } else {
        window.addEventListener('load', () => {
          performanceMonitor.measureLoadTime();
        });
      }
    }
  }, [autoMeasureLoad]);

  // Start frame rate monitoring if enabled
  useEffect(() => {
    if (monitorFrameRate) {
      const stopMonitoring = performanceMonitor.startFrameRateMonitoring(frameRateInterval);
      return stopMonitoring;
    }
  }, [monitorFrameRate, frameRateInterval]);

  // Start memory monitoring if enabled
  useEffect(() => {
    if (monitorMemory) {
      const stopMonitoring = performanceMonitor.startMemoryMonitoring(memoryInterval);
      return stopMonitoring;
    }
  }, [monitorMemory, memoryInterval]);

  // Memoized methods
  const measureLoadTime = useCallback(() => {
    return performanceMonitor.measureLoadTime();
  }, []);

  const measureMemoryUsage = useCallback(() => {
    return performanceMonitor.measureMemoryUsage();
  }, []);

  const measureFrameRate = useCallback(async (duration) => {
    return await performanceMonitor.measureFrameRate(duration);
  }, []);

  const clearAlerts = useCallback((type) => {
    performanceMonitor.clearAlerts(type);
    setAlerts(performanceMonitor.getAlerts());
  }, []);

  const getReport = useCallback(() => {
    return performanceMonitor.getPerformanceReport();
  }, []);

  return {
    metrics,
    alerts,
    measureLoadTime,
    measureMemoryUsage,
    measureFrameRate,
    clearAlerts,
    getReport
  };
}

export default usePerformanceMonitor;
