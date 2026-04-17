/**
 * Performance Monitor Display Component
 * 
 * Visual component for displaying real-time performance metrics
 * Shows load time, memory usage, frame rate, and alerts
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import usePerformanceMonitor from '../hooks/usePerformanceMonitor';

const PerformanceMonitorDisplay = ({ 
  position = 'bottom-right',
  minimized: initialMinimized = true,
  showInProduction = false 
}) => {
  const [minimized, setMinimized] = useState(initialMinimized);
  const { metrics, alerts, measureFrameRate, measureMemoryUsage, clearAlerts } = usePerformanceMonitor({
    autoMeasureLoad: true,
    monitorFrameRate: false,
    monitorMemory: false
  });

  // Don't show in production unless explicitly enabled
  if (import.meta.env.PROD && !showInProduction) {
    return null;
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PASS': return 'text-green-400';
      case 'FAIL': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'error': return 'bg-red-500/20 border-red-500/50 text-red-300';
      case 'warning': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300';
      default: return 'bg-blue-500/20 border-blue-500/50 text-blue-300';
    }
  };

  const handleMeasureFrameRate = async () => {
    await measureFrameRate(1000);
  };

  const handleMeasureMemory = () => {
    measureMemoryUsage();
  };

  return (
    <motion.div
      className={`fixed ${positionClasses[position]} z-50`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="glass-card bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-white">Performance Monitor</span>
          </div>
          <button
            onClick={() => setMinimized(!minimized)}
            className="text-white/60 hover:text-white transition-colors"
            aria-label={minimized ? 'Expand' : 'Minimize'}
          >
            {minimized ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>
        </div>

        <AnimatePresence>
          {!minimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4 min-w-[300px]">
                {/* Metrics */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Metrics</h3>
                  
                  {/* Load Time */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/60">Load Time:</span>
                    <span className={`font-mono ${metrics.loadTime ? 'text-white' : 'text-gray-500'}`}>
                      {metrics.loadTime ? `${metrics.loadTime}ms` : 'N/A'}
                    </span>
                  </div>

                  {/* Frame Rate */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/60">Frame Rate:</span>
                    <span className={`font-mono ${metrics.frameRate ? 'text-white' : 'text-gray-500'}`}>
                      {metrics.frameRate ? `${metrics.frameRate} fps` : 'N/A'}
                    </span>
                  </div>

                  {/* Memory Usage */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/60">Memory:</span>
                    <span className={`font-mono ${metrics.currentMemory ? 'text-white' : 'text-gray-500'}`}>
                      {metrics.currentMemory 
                        ? `${(metrics.currentMemory.used / 1024 / 1024).toFixed(1)}MB`
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Actions</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleMeasureFrameRate}
                      className="flex-1 px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                    >
                      Measure FPS
                    </button>
                    <button
                      onClick={handleMeasureMemory}
                      className="flex-1 px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                    >
                      Check Memory
                    </button>
                  </div>
                </div>

                {/* Alerts */}
                {alerts.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                        Alerts ({alerts.length})
                      </h3>
                      <button
                        onClick={() => clearAlerts()}
                        className="text-xs text-white/60 hover:text-white transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {alerts.slice(-5).reverse().map((alert, index) => (
                        <motion.div
                          key={`${alert.timestamp}-${index}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`p-2 rounded text-xs border ${getAlertColor(alert.severity)}`}
                        >
                          <div className="font-semibold capitalize">{alert.type.replace('_', ' ')}</div>
                          <div className="text-xs opacity-80 mt-0.5">{alert.message}</div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Thresholds */}
                <div className="pt-2 border-t border-white/10">
                  <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">Thresholds</h3>
                  <div className="space-y-1 text-xs text-white/50">
                    <div>Load Time: &lt; {metrics.thresholds.maxLoadTime}ms</div>
                    <div>Frame Rate: ≥ {metrics.thresholds.minFrameRate} fps</div>
                    <div>Memory: &lt; {(metrics.thresholds.maxMemoryIncrease / 1024 / 1024).toFixed(0)}MB increase</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default PerformanceMonitorDisplay;
