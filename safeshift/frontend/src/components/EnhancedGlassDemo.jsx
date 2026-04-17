/**
 * SafeShift — Enhanced Glassmorphism Demo Component
 * Demonstrates the enhanced theme support and gradient backgrounds
 */

import React from 'react';
import { useGlassmorphism } from '../hooks/useGlassmorphism';
import { useTheme } from '../context/ThemeContext';

const EnhancedGlassDemo = () => {
  const { getGlassClass, getBackgroundConfig, shouldEnableEnhancedBackgrounds } = useGlassmorphism();
  const { theme, toggleTheme } = useTheme();

  const backgroundTypes = [
    'mesh', 'blob', 'enhanced', 'premium', 'ethereal', 'dynamic',
    'mesh-subtle', 'mesh-intense', 'blob-subtle'
  ];

  const cardTypes = [
    { type: 'glass-morphism', label: 'Standard Glass' },
    { type: 'glass-strong', label: 'Strong Glass' },
    { type: 'glass-subtle', label: 'Subtle Glass' },
    { type: 'glass-intense', label: 'Intense Glass' },
    { type: 'glass-frosted', label: 'Frosted Glass' },
    { type: 'glass-tinted', label: 'Tinted Glass' }
  ];

  return (
    <div className={`min-h-screen p-8 ${getGlassClass('glass-bg', { backgroundType: 'dynamic' })}`}>
      {/* Header */}
      <div className={`mb-8 p-6 rounded-2xl ${getGlassClass('glass-card')}`}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-ss-primary">
            Enhanced Glassmorphism Demo
          </h1>
          <button
            onClick={toggleTheme}
            className={`px-4 py-2 rounded-lg ${getGlassClass('glass-button')} text-ss-primary hover:text-ss-purple transition-colors`}
          >
            Switch to {theme === 'dark' ? 'Light' : 'Dark'} Theme
          </button>
        </div>
        <p className="text-ss-secondary">
          Current theme: <span className="font-semibold text-ss-primary">{theme}</span>
          {' • '}
          Enhanced backgrounds: <span className="font-semibold text-ss-primary">
            {shouldEnableEnhancedBackgrounds() ? 'Enabled' : 'Disabled'}
          </span>
        </p>
      </div>

      {/* Background Types Demo */}
      <div className={`mb-8 p-6 rounded-2xl ${getGlassClass('glass-widget')}`}>
        <h2 className="text-2xl font-bold text-ss-primary mb-6">Background Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {backgroundTypes.map((bgType) => {
            const config = getBackgroundConfig(bgType);
            return (
              <div
                key={bgType}
                className={`relative h-32 rounded-xl overflow-hidden ${config.className}`}
              >
                <div className={`absolute inset-0 flex items-center justify-center ${getGlassClass('glass-card')}`}>
                  <div className="text-center">
                    <div className="font-semibold text-ss-primary text-sm mb-1">
                      {bgType}
                    </div>
                    <div className="text-xs text-ss-secondary">
                      {config.description.split(' ').slice(0, 3).join(' ')}...
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Glass Card Types Demo */}
      <div className={`mb-8 p-6 rounded-2xl ${getGlassClass('glass-widget', { backgroundType: 'mesh-subtle' })}`}>
        <h2 className="text-2xl font-bold text-ss-primary mb-6">Glass Card Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cardTypes.map(({ type, label }) => (
            <div
              key={type}
              className={`p-4 rounded-xl ${getGlassClass(type)} transition-all duration-300 hover:scale-105`}
            >
              <div className="text-center">
                <div className="font-semibold text-ss-primary mb-2">{label}</div>
                <div className="text-sm text-ss-secondary">
                  Hover to see interaction
                </div>
                <div className="mt-3 h-2 bg-ss-purple/20 rounded-full overflow-hidden">
                  <div className="h-full bg-ss-purple rounded-full w-3/4 transition-all duration-500"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Elements Demo */}
      <div className={`mb-8 p-6 rounded-2xl ${getGlassClass('glass-form', { backgroundType: 'blob-subtle' })}`}>
        <h2 className="text-2xl font-bold text-ss-primary mb-6">Interactive Elements</h2>
        <div className="space-y-4">
          {/* Glass Input */}
          <div>
            <label className="block text-sm font-medium text-ss-primary mb-2">
              Glass Input Field
            </label>
            <input
              type="text"
              placeholder="Type something..."
              className={`w-full ${getGlassClass('glass-input')} text-ss-primary placeholder-ss-secondary`}
            />
          </div>

          {/* Glass Buttons */}
          <div className="flex gap-3 flex-wrap">
            <button className={`px-6 py-3 rounded-lg ${getGlassClass('glass-button')} text-ss-primary hover:scale-105 transition-transform`}>
              Primary Button
            </button>
            <button className={`px-6 py-3 rounded-lg ${getGlassClass('glass-subtle')} text-ss-primary hover:scale-105 transition-transform`}>
              Subtle Button
            </button>
            <button className={`px-6 py-3 rounded-lg ${getGlassClass('glass-strong')} text-ss-primary hover:scale-105 transition-transform`}>
              Strong Button
            </button>
          </div>

          {/* Glass Navigation */}
          <div className={`p-4 rounded-xl ${getGlassClass('glass-navigation')}`}>
            <div className="flex items-center justify-between">
              <div className="text-ss-primary font-semibold">Navigation Bar</div>
              <div className="flex gap-4">
                <a href="#" className="text-ss-secondary hover:text-ss-primary transition-colors">Home</a>
                <a href="#" className="text-ss-secondary hover:text-ss-primary transition-colors">About</a>
                <a href="#" className="text-ss-secondary hover:text-ss-primary transition-colors">Contact</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Adaptation Demo */}
      <div className={`p-6 rounded-2xl ${getGlassClass('glass-widget', { backgroundType: 'ethereal' })}`}>
        <h2 className="text-2xl font-bold text-ss-primary mb-6">Theme Adaptation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`p-4 rounded-xl ${getGlassClass('glass-card')}`}>
            <h3 className="font-semibold text-ss-primary mb-3">Current Theme Colors</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-ss-purple"></div>
                <span className="text-ss-secondary">Primary Purple</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-ss-green"></div>
                <span className="text-ss-secondary">Success Green</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-ss-blue"></div>
                <span className="text-ss-secondary">Info Blue</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-ss-amber"></div>
                <span className="text-ss-secondary">Warning Amber</span>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl ${getGlassClass('glass-stat-card')}`}>
            <h3 className="font-semibold text-ss-primary mb-3">Glass Properties</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ss-secondary">Backdrop Blur:</span>
                <span className="text-ss-primary">20px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ss-secondary">Background Opacity:</span>
                <span className="text-ss-primary">{theme === 'dark' ? '10%' : '8%'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ss-secondary">Border Opacity:</span>
                <span className="text-ss-primary">{theme === 'dark' ? '15%' : '20%'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ss-secondary">Shadow Intensity:</span>
                <span className="text-ss-primary">{theme === 'dark' ? 'Strong' : 'Subtle'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedGlassDemo;