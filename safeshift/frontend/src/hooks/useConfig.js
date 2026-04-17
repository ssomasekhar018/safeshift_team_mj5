/**
 * SafeShift Configuration Hook
 * Fetches and manages application configuration from the server
 * Provides Three.js and animation settings with fallbacks
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// Default configuration fallbacks
const DEFAULT_CONFIG = {
  threejs: {
    performanceMode: 'auto',
    maxParticles: 1000,
    targetFPS: 60,
    enableAntialiasing: true,
    enableShadows: true,
    pixelRatio: Math.min(2, window.devicePixelRatio || 1),
    renderScale: 1.0
  },
  animations: {
    enableAnimations: true,
    respectReducedMotion: true,
    animationQuality: 'high',
    maxConcurrentAnimations: 10,
    defaultDuration: 300,
    defaultEasing: 'easeInOut',
    framerMotionFeatures: {
      layout: true,
      drag: true,
      whileHover: true,
      whileTap: true
    }
  }
};

/**
 * Custom hook for managing application configuration
 */
export const useConfig = () => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  /**
   * Fetch configuration from server
   */
  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get('/config');
      
      if (response.data && response.data.config) {
        // Merge server config with defaults to ensure all properties exist
        const mergedConfig = {
          threejs: {
            ...DEFAULT_CONFIG.threejs,
            ...response.data.config.threejs
          },
          animations: {
            ...DEFAULT_CONFIG.animations,
            ...response.data.config.animations,
            framerMotionFeatures: {
              ...DEFAULT_CONFIG.animations.framerMotionFeatures,
              ...response.data.config.animations?.framerMotionFeatures
            }
          }
        };

        setConfig(mergedConfig);
        setLastFetch(new Date());
        
        // Store in localStorage for offline access
        localStorage.setItem('safeshift_config', JSON.stringify(mergedConfig));
        localStorage.setItem('safeshift_config_timestamp', Date.now().toString());
      }
    } catch (err) {
      console.warn('Failed to fetch configuration from server, using defaults:', err.message);
      setError(err.message);
      
      // Try to load from localStorage as fallback
      const cachedConfig = localStorage.getItem('safeshift_config');
      if (cachedConfig) {
        try {
          const parsed = JSON.parse(cachedConfig);
          // Merge cached config with defaults to ensure all properties exist
          const mergedConfig = {
            threejs: {
              ...DEFAULT_CONFIG.threejs,
              ...parsed.threejs
            },
            animations: {
              ...DEFAULT_CONFIG.animations,
              ...parsed.animations,
              framerMotionFeatures: {
                ...DEFAULT_CONFIG.animations.framerMotionFeatures,
                ...parsed.animations?.framerMotionFeatures
              }
            }
          };
          setConfig(mergedConfig);
          console.log('Using cached configuration');
        } catch (parseError) {
          console.warn('Failed to parse cached configuration, using defaults');
          setConfig(DEFAULT_CONFIG);
        }
      } else {
        setConfig(DEFAULT_CONFIG);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Check if cached config is still valid (within 1 hour)
   */
  const isCacheValid = useCallback(() => {
    const timestamp = localStorage.getItem('safeshift_config_timestamp');
    if (!timestamp) return false;
    
    const cacheAge = Date.now() - parseInt(timestamp);
    return cacheAge < 3600000; // 1 hour in milliseconds
  }, []);

  /**
   * Initialize configuration on mount
   */
  useEffect(() => {
    // Check if we have valid cached config
    if (isCacheValid()) {
      const cachedConfig = localStorage.getItem('safeshift_config');
      if (cachedConfig) {
        try {
          const parsed = JSON.parse(cachedConfig);
          // Merge cached config with defaults to ensure all properties exist
          const mergedConfig = {
            threejs: {
              ...DEFAULT_CONFIG.threejs,
              ...parsed.threejs
            },
            animations: {
              ...DEFAULT_CONFIG.animations,
              ...parsed.animations,
              framerMotionFeatures: {
                ...DEFAULT_CONFIG.animations.framerMotionFeatures,
                ...parsed.animations?.framerMotionFeatures
              }
            }
          };
          setConfig(mergedConfig);
          setIsLoading(false);
          setLastFetch(new Date(parseInt(localStorage.getItem('safeshift_config_timestamp'))));
          return;
        } catch (parseError) {
          console.warn('Failed to parse cached configuration');
        }
      }
    }

    // Fetch fresh config if cache is invalid or missing
    fetchConfig();
  }, [fetchConfig, isCacheValid]);

  /**
   * Get Three.js configuration with performance adjustments
   */
  const getThreeJSConfig = useCallback((deviceCapabilities = {}) => {
    const baseConfig = config.threejs;
    const {
      isLowEndDevice = false,
      availableMemory = Infinity,
      hardwareConcurrency = navigator.hardwareConcurrency || 4
    } = deviceCapabilities;

    // Adjust settings based on device capabilities
    let adjustedConfig = { ...baseConfig };

    if (isLowEndDevice || availableMemory < 2000) {
      adjustedConfig = {
        ...adjustedConfig,
        performanceMode: 'low',
        maxParticles: Math.min(adjustedConfig.maxParticles, 500),
        enableShadows: false,
        renderScale: 0.8
      };
    } else if (hardwareConcurrency < 4) {
      adjustedConfig = {
        ...adjustedConfig,
        performanceMode: 'medium',
        maxParticles: Math.min(adjustedConfig.maxParticles, 750)
      };
    }

    return adjustedConfig;
  }, [config.threejs]);

  /**
   * Get animation configuration with accessibility considerations
   */
  const getAnimationConfig = useCallback(() => {
    const baseConfig = config.animations;
    
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion && baseConfig.respectReducedMotion) {
      return {
        ...baseConfig,
        enableAnimations: false,
        animationQuality: 'low',
        defaultDuration: 0,
        framerMotionFeatures: {
          layout: false,
          drag: false,
          whileHover: false,
          whileTap: false
        }
      };
    }

    return baseConfig;
  }, [config.animations]);

  /**
   * Refresh configuration from server
   */
  const refreshConfig = useCallback(() => {
    return fetchConfig();
  }, [fetchConfig]);

  /**
   * Get configuration value by path (e.g., 'threejs.maxParticles')
   */
  const getConfigValue = useCallback((path, defaultValue = null) => {
    return path.split('.').reduce((obj, key) => obj && obj[key], config) || defaultValue;
  }, [config]);

  return {
    config,
    isLoading,
    error,
    lastFetch,
    getThreeJSConfig,
    getAnimationConfig,
    refreshConfig,
    getConfigValue,
    
    // Convenience getters
    threejsConfig: config.threejs,
    animationConfig: config.animations,
    
    // Status flags
    isConfigLoaded: !isLoading && !error,
    hasError: !!error
  };
};

/**
 * Hook for Three.js specific configuration
 */
export const useThreeJSConfig = (deviceCapabilities) => {
  const { getThreeJSConfig, isLoading, error } = useConfig();
  return {
    config: getThreeJSConfig(deviceCapabilities),
    isLoading,
    error
  };
};

/**
 * Hook for animation specific configuration
 */
export const useAnimationConfig = () => {
  const { getAnimationConfig, isLoading, error } = useConfig();
  return {
    config: getAnimationConfig(),
    isLoading,
    error
  };
};

export default useConfig;