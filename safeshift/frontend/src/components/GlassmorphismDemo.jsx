/**
 * SafeShift — Glassmorphism Demo Component
 * Demonstrates the comprehensive glassmorphism system with all variants and features
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import useGlassmorphism, { useGlassMotionVariants } from '../hooks/useGlassmorphism';

const GlassmorphismDemo = () => {
  const {
    compatibility,
    getGlassClass,
    getGlassStyle,
    shouldEnableGlassmorphism,
    forcePerformanceMode,
    resetPerformanceMode,
    isPerformanceDegraded
  } = useGlassmorphism();

  const { getVariants } = useGlassMotionVariants();
  const [selectedVariant, setSelectedVariant] = useState('normal');

  const cardVariants = getVariants({
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    hover: { y: -4, scale: 1.02 },
    tap: { scale: 0.98 }
  });

  const glassVariants = [
    { name: 'normal', label: 'Normal Glass', class: 'glass-morphism' },
    { name: 'subtle', label: 'Subtle Glass', class: 'glass-subtle' },
    { name: 'strong', label: 'Strong Glass', class: 'glass-strong' },
    { name: 'intense', label: 'Intense Glass', class: 'glass-intense' },
    { name: 'frosted', label: 'Frosted Glass', class: 'glass-frosted' },
    { name: 'tinted', label: 'Tinted Glass', class: 'glass-tinted' }
  ];

  return (
    <div className="min-h-screen p-8 glass-bg">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className={getGlassClass('glass-card')}
          style={{ padding: '2rem', marginBottom: '2rem' }}
          variants={cardVariants}
          initial="initial"
          animate="animate"
        >
          <h1 className="text-3xl font-bold mb-4 text-ss-primary">
            Enhanced Glassmorphism System Demo
          </h1>
          <p className="text-ss-secondary mb-4">
            Comprehensive glassmorphism effects with browser compatibility detection and accessibility features.
          </p>
          
          {/* Compatibility Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className={`p-3 rounded-lg ${compatibility.supportsBackdropFilter ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <div className="text-sm font-medium">Backdrop Filter</div>
              <div className="text-xs">{compatibility.supportsBackdropFilter ? 'Supported' : 'Not Supported'}</div>
            </div>
            <div className={`p-3 rounded-lg ${compatibility.supportsWebGL ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <div className="text-sm font-medium">WebGL</div>
              <div className="text-xs">{compatibility.supportsWebGL ? 'Supported' : 'Not Supported'}</div>
            </div>
            <div className={`p-3 rounded-lg ${compatibility.prefersReducedMotion ? 'bg-yellow-500/20' : 'bg-green-500/20'}`}>
              <div className="text-sm font-medium">Motion</div>
              <div className="text-xs">{compatibility.prefersReducedMotion ? 'Reduced' : 'Full'}</div>
            </div>
            <div className={`p-3 rounded-lg ${compatibility.prefersHighContrast ? 'bg-yellow-500/20' : 'bg-green-500/20'}`}>
              <div className="text-sm font-medium">Contrast</div>
              <div className="text-xs">{compatibility.prefersHighContrast ? 'High' : 'Normal'}</div>
            </div>
          </div>

          {/* Performance Controls */}
          <div className="flex gap-4 mb-4">
            <button
              onClick={forcePerformanceMode}
              disabled={isPerformanceDegraded}
              className="glass-button px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Force Performance Mode
            </button>
            <button
              onClick={resetPerformanceMode}
              disabled={!isPerformanceDegraded}
              className="glass-button px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Reset Performance Mode
            </button>
          </div>

          {isPerformanceDegraded && (
            <div className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
              <div className="text-sm font-medium text-yellow-200">Performance Mode Active</div>
              <div className="text-xs text-yellow-300">Glassmorphism effects have been reduced for better performance.</div>
            </div>
          )}
        </motion.div>

        {/* Glass Variant Selector */}
        <motion.div
          className={getGlassClass('glass-card')}
          style={{ padding: '1.5rem', marginBottom: '2rem' }}
          variants={cardVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-xl font-semibold mb-4 text-ss-primary">Glass Variants</h2>
          <div className="flex flex-wrap gap-2">
            {glassVariants.map((variant) => (
              <button
                key={variant.name}
                onClick={() => setSelectedVariant(variant.name)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedVariant === variant.name
                    ? 'glass-strong text-ss-primary'
                    : 'glass-subtle text-ss-secondary hover:glass-hover'
                }`}
              >
                {variant.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Glass Examples Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Card Example */}
          <motion.div
            className={getGlassClass(glassVariants.find(v => v.name === selectedVariant)?.class || 'glass-morphism')}
            style={{ padding: '1.5rem' }}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            whileHover="hover"
            whileTap="tap"
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-lg font-semibold mb-2 text-ss-primary">Glass Card</h3>
            <p className="text-ss-secondary mb-4">
              This is an example of a glassmorphism card with the selected variant.
            </p>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-ss-secondary">Active</span>
            </div>
          </motion.div>

          {/* Form Example */}
          <motion.div
            className={getGlassClass('glass-form')}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-lg font-semibold mb-4 text-ss-primary">Glass Form</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Glass input field"
                className="glass-input w-full"
              />
              <textarea
                placeholder="Glass textarea"
                className="glass-input w-full h-20 resize-none"
              />
              <button className="glass-button w-full py-2 font-medium">
                Glass Button
              </button>
            </div>
          </motion.div>

          {/* Widget Example */}
          <motion.div
            className={getGlassClass('glass-widget')}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.4 }}
          >
            <div className="glass-widget-header">
              <h3 className="text-lg font-semibold text-ss-primary">Glass Widget</h3>
            </div>
            <div className="space-y-3">
              <div className="glass-stat-card">
                <div className="text-2xl font-bold text-ss-primary">42</div>
                <div className="text-sm text-ss-secondary">Active Users</div>
              </div>
              <div className="glass-list-item">
                <div className="flex items-center justify-between">
                  <span className="text-ss-primary">Revenue</span>
                  <span className="text-ss-secondary">$1,234</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Accessibility Features */}
        <motion.div
          className={getGlassClass('glass-card glass-accessible')}
          style={{ padding: '1.5rem', marginBottom: '2rem' }}
          variants={cardVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-xl font-semibold mb-4 text-ss-primary">Accessibility Features</h2>
          
          {/* Skip Link Example */}
          <a href="#main-content" className="glass-skip-link">
            Skip to main content
          </a>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="accessible-input" className="block text-sm font-medium text-ss-primary mb-2">
                Accessible Input
                <span className="glass-sr-only">This input has screen reader support</span>
              </label>
              <input
                id="accessible-input"
                type="text"
                className="glass-input glass-focus-visible w-full"
                placeholder="Focus me to see accessibility features"
                aria-describedby="input-help"
              />
              <div id="input-help" className="text-xs text-ss-secondary mt-1">
                This input has proper focus indicators and screen reader support.
              </div>
            </div>

            <button className="glass-button glass-focus-visible px-4 py-2 font-medium">
              Accessible Button
            </button>
          </div>
        </motion.div>

        {/* Performance Information */}
        <motion.div
          className={getGlassClass('glass-card')}
          style={{ padding: '1.5rem' }}
          variants={cardVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-xl font-semibold mb-4 text-ss-primary">Performance & Compatibility</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-2 text-ss-primary">Browser Support</h3>
              <ul className="space-y-2 text-sm text-ss-secondary">
                <li>✅ Chrome 76+ (full support)</li>
                <li>✅ Firefox 103+ (full support)</li>
                <li>✅ Safari 14+ (with -webkit- prefix)</li>
                <li>✅ Edge 79+ (full support)</li>
                <li>⚠️ Older browsers (fallback styles)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2 text-ss-primary">Performance Features</h3>
              <ul className="space-y-2 text-sm text-ss-secondary">
                <li>🚀 Automatic performance monitoring</li>
                <li>📱 Mobile-optimized blur values</li>
                <li>♿ Accessibility preference detection</li>
                <li>🎨 Graceful fallbacks for all browsers</li>
                <li>⚡ Hardware acceleration optimization</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GlassmorphismDemo;