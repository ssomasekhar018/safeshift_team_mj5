/**
 * Browser Compatibility Banner Component
 * 
 * Displays warnings and recommendations when browser compatibility issues are detected
 * Shows compatibility score and specific feature warnings
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBrowserCompatibility } from '../utils/browserCompatibility';

const BrowserCompatibilityBanner = () => {
  const [report, setReport] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const compatReport = getBrowserCompatibility().getReport();
    setReport(compatReport);

    // Check if user has previously dismissed the banner
    const wasDismissed = sessionStorage.getItem('compatibility-banner-dismissed');
    if (wasDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('compatibility-banner-dismissed', 'true');
  };

  if (!report || dismissed) {
    return null;
  }

  // Only show banner if there are warnings or compatibility score is below 90%
  const shouldShow = report.warnings.length > 0 || report.compatibility.score < 90;
  
  if (!shouldShow) {
    return null;
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500/20 border-red-500/50 text-red-300';
      case 'medium':
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300';
      case 'low':
        return 'bg-blue-500/20 border-blue-500/50 text-blue-300';
      default:
        return 'bg-gray-500/20 border-gray-500/50 text-gray-300';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 75) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  const highSeverityWarnings = report.warnings.filter(w => w.severity === 'high');
  const mediumSeverityWarnings = report.warnings.filter(w => w.severity === 'medium');
  const lowSeverityWarnings = report.warnings.filter(w => w.severity === 'low');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 right-0 z-50 p-4"
      >
        <div className="max-w-4xl mx-auto">
          <div className="glass-card bg-black/60 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-500/20">
                  <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Browser Compatibility Notice</h3>
                  <p className="text-sm text-white/60">
                    {report.browser.name} {report.browser.version} - Compatibility Score: 
                    <span className={`ml-1 font-bold ${getScoreColor(report.compatibility.score)}`}>
                      {report.compatibility.score.toFixed(0)}%
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="px-3 py-1.5 text-sm text-white/80 hover:text-white transition-colors"
                  aria-label={expanded ? 'Collapse' : 'Expand'}
                >
                  {expanded ? 'Less' : 'More'}
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-white/60 hover:text-white transition-colors"
                  aria-label="Dismiss"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* High severity warnings - always visible */}
              {highSeverityWarnings.length > 0 && (
                <div className="space-y-2 mb-3">
                  {highSeverityWarnings.map((warning, index) => (
                    <div
                      key={`high-${index}`}
                      className={`p-3 rounded-lg border ${getSeverityColor(warning.severity)}`}
                    >
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{warning.feature}</p>
                          <p className="text-sm opacity-90 mt-1">{warning.message}</p>
                          <p className="text-xs opacity-75 mt-1">{warning.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Expandable section for medium and low severity warnings */}
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2"
                  >
                    {/* Medium severity warnings */}
                    {mediumSeverityWarnings.length > 0 && (
                      <div className="space-y-2">
                        {mediumSeverityWarnings.map((warning, index) => (
                          <div
                            key={`medium-${index}`}
                            className={`p-3 rounded-lg border ${getSeverityColor(warning.severity)}`}
                          >
                            <div className="flex items-start gap-2">
                              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              <div className="flex-1">
                                <p className="font-semibold text-sm">{warning.feature}</p>
                                <p className="text-sm opacity-90 mt-1">{warning.message}</p>
                                <p className="text-xs opacity-75 mt-1">{warning.recommendation}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Low severity warnings */}
                    {lowSeverityWarnings.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {lowSeverityWarnings.map((warning, index) => (
                          <div
                            key={`low-${index}`}
                            className={`p-3 rounded-lg border ${getSeverityColor(warning.severity)}`}
                          >
                            <div className="flex items-start gap-2">
                              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              <div className="flex-1">
                                <p className="font-semibold text-sm">{warning.feature}</p>
                                <p className="text-sm opacity-90 mt-1">{warning.message}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Fallbacks enabled */}
                    {report.fallbacksEnabled.length > 0 && (
                      <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-sm text-blue-300 font-semibold mb-1">Fallbacks Enabled:</p>
                        <p className="text-xs text-blue-300/80">
                          {report.fallbacksEnabled.join(', ')}
                        </p>
                      </div>
                    )}

                    {/* Overall recommendation */}
                    <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-lg">
                      <p className="text-sm text-white/80">{report.recommendation}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Summary when collapsed */}
              {!expanded && (mediumSeverityWarnings.length > 0 || lowSeverityWarnings.length > 0) && (
                <div className="text-sm text-white/60 mt-2">
                  {mediumSeverityWarnings.length > 0 && (
                    <span>{mediumSeverityWarnings.length} medium priority warning{mediumSeverityWarnings.length !== 1 ? 's' : ''}</span>
                  )}
                  {mediumSeverityWarnings.length > 0 && lowSeverityWarnings.length > 0 && <span>, </span>}
                  {lowSeverityWarnings.length > 0 && (
                    <span>{lowSeverityWarnings.length} low priority warning{lowSeverityWarnings.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BrowserCompatibilityBanner;
