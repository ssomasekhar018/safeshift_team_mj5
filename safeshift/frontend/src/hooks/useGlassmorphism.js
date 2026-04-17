/**
 * SafeShift — useGlassmorphism Hook
 * React hook for integrating glassmorphism compatibility and performance monitoring
 */

import { useState, useEffect, useCallback } from 'react';
import glassmorphismCompat from '../utils/glassmorphismCompat';

/**
 * Custom hook for glassmorphism compatibility and performance management
 */
export function useGlassmorphism() {
  const [compatibility, setCompatibility] = useState(() => ({
    supportsBackdropFilter: glassmorphismCompat.supportsBackdropFilter,
    supportsWebGL: glassmorphismCompat.supportsWebGL,
    prefersReducedMotion: glassmorphismCompat.prefersReducedMotion,
    prefersHighContrast: glassmorphismCompat.prefersHighContrast,
    performanceMode: false
  }));

  const [isPerformanceDegraded, setIsPerformanceDegraded] = useState(false);

  // Update compatibility state when preferences change
  useEffect(() => {
    const handleMotionChange = (event) => {
      setCompatibility(prev => ({
        ...prev,
        prefersReducedMotion: event.detail.prefersReducedMotion
      }));
    };

    const handleContrastChange = (event) => {
      setCompatibility(prev => ({
        ...prev,
        prefersHighContrast: event.detail.prefersHighContrast
      }));
    };

    const handlePerformanceDegraded = (event) => {
      setIsPerformanceDegraded(true);
      setCompatibility(prev => ({
        ...prev,
        performanceMode: true
      }));
    };

    // Listen for compatibility events
    window.addEventListener('glassmorphism:motion-preference-changed', handleMotionChange);
    window.addEventListener('glassmorphism:contrast-preference-changed', handleContrastChange);
    window.addEventListener('glassmorphism:performance-degraded', handlePerformanceDegraded);

    return () => {
      window.removeEventListener('glassmorphism:motion-preference-changed', handleMotionChange);
      window.removeEventListener('glassmorphism:contrast-preference-changed', handleContrastChange);
      window.removeEventListener('glassmorphism:performance-degraded', handlePerformanceDegraded);
    };
  }, []);

  // Get appropriate glass class based on compatibility
  const getGlassClass = useCallback((baseClass = 'glass-morphism', options = {}) => {
    const {
      fallbackClass = 'glass-fallback',
      performanceClass = 'glass-performance',
      highContrastClass = 'glass-high-contrast',
      backgroundType = null // 'mesh', 'blob', 'complex', 'subtle', 'intense'
    } = options;

    let classes = [];

    if (compatibility.supportsBackdropFilter && !compatibility.performanceMode) {
      classes.push(baseClass);
      
      // Add background type classes
      if (backgroundType) {
        switch (backgroundType) {
          case 'mesh':
            classes.push('glass-mesh-bg');
            break;
          case 'blob':
            classes.push('glass-blob-bg');
            break;
          case 'complex':
            classes.push('glass-blob-complex');
            break;
          case 'enhanced':
            classes.push('glass-blob-enhanced');
            break;
          case 'premium':
            classes.push('glass-bg-premium');
            break;
          case 'ethereal':
            classes.push('glass-bg-ethereal');
            break;
          case 'dynamic':
            classes.push('glass-bg-dynamic');
            break;
          case 'mesh-subtle':
            classes.push('glass-mesh-subtle');
            break;
          case 'mesh-intense':
            classes.push('glass-mesh-intense');
            break;
          case 'blob-subtle':
            classes.push('glass-blob-subtle');
            break;
          case 'hover':
            classes.push('glass-hover-bg');
            break;
          case 'hero':
            classes.push('glass-hero-bg');
            break;
          case 'dashboard':
            classes.push('glass-dashboard-bg');
            break;
          case 'auth':
            classes.push('glass-auth-bg');
            break;
        }
      }
    } else if (compatibility.performanceMode) {
      classes.push(performanceClass);
    } else {
      classes.push(fallbackClass);
    }

    if (compatibility.prefersHighContrast) {
      classes.push(highContrastClass);
    }

    return classes.join(' ');
  }, [compatibility]);

  // Get animation variants based on motion preferences
  const getAnimationVariants = useCallback((fullVariants, reducedVariants = {}) => {
    return compatibility.prefersReducedMotion ? reducedVariants : fullVariants;
  }, [compatibility.prefersReducedMotion]);

  // Get appropriate blur value based on performance
  const getBlurValue = useCallback((defaultBlur = '20px') => {
    return glassmorphismCompat.getBlurValue(defaultBlur);
  }, [compatibility.performanceMode]);

  // Check if glassmorphism effects should be enabled
  const shouldEnableGlassmorphism = useCallback(() => {
    return glassmorphismCompat.shouldEnableGlassmorphism();
  }, [compatibility]);

  // Get style object for glassmorphism effects
  const getGlassStyle = useCallback((intensity = 'normal') => {
    const baseStyle = {};

    if (!compatibility.supportsBackdropFilter) {
      // Fallback styles
      baseStyle.background = 'var(--glass-fallback-bg)';
      baseStyle.border = '2px solid var(--glass-fallback-border)';
      return baseStyle;
    }

    if (compatibility.performanceMode) {
      baseStyle.backdropFilter = `blur(${getBlurValue('10px')})`;
      baseStyle.WebkitBackdropFilter = `blur(${getBlurValue('10px')})`;
      baseStyle.background = 'var(--glass-perf-bg)';
      return baseStyle;
    }

    // Normal glassmorphism styles
    switch (intensity) {
      case 'subtle':
        baseStyle.backdropFilter = 'blur(var(--glass-blur-subtle))';
        baseStyle.WebkitBackdropFilter = 'blur(var(--glass-blur-subtle))';
        baseStyle.background = 'var(--glass-bg-subtle)';
        break;
      case 'strong':
        baseStyle.backdropFilter = 'blur(var(--glass-blur-strong))';
        baseStyle.WebkitBackdropFilter = 'blur(var(--glass-blur-strong))';
        baseStyle.background = 'var(--glass-bg-strong)';
        break;
      case 'intense':
        baseStyle.backdropFilter = 'blur(var(--glass-blur-intense))';
        baseStyle.WebkitBackdropFilter = 'blur(var(--glass-blur-intense))';
        baseStyle.background = 'var(--glass-bg-intense)';
        break;
      default:
        baseStyle.backdropFilter = 'blur(var(--glass-blur))';
        baseStyle.WebkitBackdropFilter = 'blur(var(--glass-blur))';
        baseStyle.background = 'var(--glass-bg)';
    }

    return baseStyle;
  }, [compatibility, getBlurValue]);

  // Force performance mode (useful for testing or manual override)
  const forcePerformanceMode = useCallback(() => {
    setIsPerformanceDegraded(true);
    setCompatibility(prev => ({
      ...prev,
      performanceMode: true
    }));
    document.documentElement.classList.add('performance-mode');
  }, []);

  // Reset performance mode
  const resetPerformanceMode = useCallback(() => {
    setIsPerformanceDegraded(false);
    setCompatibility(prev => ({
      ...prev,
      performanceMode: false
    }));
    document.documentElement.classList.remove('performance-mode');
  }, []);

  // Get theme-appropriate background configuration
  const getBackgroundConfig = useCallback((backgroundType = 'mesh') => {
    const configs = {
      mesh: {
        className: 'glass-mesh-bg',
        description: 'Animated gradient mesh background'
      },
      blob: {
        className: 'glass-blob-bg',
        description: 'Floating blob background with organic movement'
      },
      complex: {
        className: 'glass-blob-complex',
        description: 'Multi-layer blob background with accent colors'
      },
      enhanced: {
        className: 'glass-blob-enhanced',
        description: 'Enhanced multi-layer blob background with quaternary elements'
      },
      premium: {
        className: 'glass-bg-premium',
        description: 'Premium background combining mesh and enhanced blobs'
      },
      ethereal: {
        className: 'glass-bg-ethereal',
        description: 'Ethereal background with all blob layers combined'
      },
      dynamic: {
        className: 'glass-bg-dynamic',
        description: 'Dynamic background with rotating mesh and floating blobs'
      },
      'mesh-subtle': {
        className: 'glass-mesh-subtle',
        description: 'Subtle mesh background with reduced opacity'
      },
      'mesh-intense': {
        className: 'glass-mesh-intense',
        description: 'Intense mesh background with dual layers'
      },
      'blob-subtle': {
        className: 'glass-blob-subtle',
        description: 'Subtle blob background with reduced effects'
      },
      hover: {
        className: 'glass-hover-bg',
        description: 'Interactive background with hover effects'
      },
      page: {
        className: 'glass-page-bg',
        description: 'Full page background with dynamic effects'
      },
      modal: {
        className: 'glass-modal-bg',
        description: 'Modal background with enhanced blur'
      },
      card: {
        className: 'glass-card-bg',
        description: 'Card background with mesh effects'
      },
      hero: {
        className: 'glass-hero-bg',
        description: 'Hero section background with premium effects'
      },
      dashboard: {
        className: 'glass-dashboard-bg',
        description: 'Dashboard background with ethereal effects'
      },
      auth: {
        className: 'glass-auth-bg',
        description: 'Authentication page background with dynamic effects'
      }
    };

    return configs[backgroundType] || configs.mesh;
  }, []);

  // Check if enhanced backgrounds should be enabled
  const shouldEnableEnhancedBackgrounds = useCallback(() => {
    return (
      compatibility.supportsBackdropFilter &&
      !compatibility.performanceMode &&
      !compatibility.prefersReducedMotion
    );
  }, [compatibility]);

  return {
    // Compatibility state
    compatibility,
    isPerformanceDegraded,
    
    // Utility functions
    getGlassClass,
    getAnimationVariants,
    getBlurValue,
    shouldEnableGlassmorphism,
    getGlassStyle,
    getBackgroundConfig,
    shouldEnableEnhancedBackgrounds,
    
    // Performance controls
    forcePerformanceMode,
    resetPerformanceMode,
    
    // Direct compatibility checks
    supportsBackdropFilter: compatibility.supportsBackdropFilter,
    supportsWebGL: compatibility.supportsWebGL,
    prefersReducedMotion: compatibility.prefersReducedMotion,
    prefersHighContrast: compatibility.prefersHighContrast,
    performanceMode: compatibility.performanceMode
  };
}

/**
 * Hook for getting glassmorphism-compatible Framer Motion variants
 */
export function useGlassMotionVariants() {
  const { getAnimationVariants, prefersReducedMotion } = useGlassmorphism();

  const getVariants = useCallback((variants) => {
    const {
      initial = {},
      animate = {},
      exit = {},
      hover = {},
      tap = {},
      focus = {}
    } = variants;

    if (prefersReducedMotion) {
      return {
        initial: { opacity: initial.opacity || 0 },
        animate: { opacity: animate.opacity || 1 },
        exit: { opacity: exit.opacity || 0 },
        hover: { opacity: hover.opacity || animate.opacity || 1 },
        tap: { opacity: tap.opacity || animate.opacity || 1 },
        focus: { opacity: focus.opacity || animate.opacity || 1 }
      };
    }

    return variants;
  }, [prefersReducedMotion]);

  return { getVariants };
}

export default useGlassmorphism;