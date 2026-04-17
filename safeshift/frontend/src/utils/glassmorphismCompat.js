/**
 * SafeShift — Glassmorphism Browser Compatibility Detection
 * Handles browser support detection and fallback management for glassmorphism effects
 */

class GlassmorphismCompatibility {
  constructor() {
    this.supportsBackdropFilter = this.checkBackdropFilterSupport();
    this.supportsWebGL = this.checkWebGLSupport();
    this.prefersReducedMotion = this.checkReducedMotionPreference();
    this.prefersHighContrast = this.checkHighContrastPreference();
    
    this.init();
  }

  /**
   * Check if browser supports backdrop-filter
   */
  checkBackdropFilterSupport() {
    if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
      return false;
    }
    
    return CSS.supports('backdrop-filter', 'blur(10px)') ||
           CSS.supports('-webkit-backdrop-filter', 'blur(10px)');
  }

  /**
   * Check if browser supports WebGL (for Three.js compatibility)
   */
  checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (e) {
      return false;
    }
  }

  /**
   * Check user's motion preferences
   */
  checkReducedMotionPreference() {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Check user's contrast preferences
   */
  checkHighContrastPreference() {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    
    return window.matchMedia('(prefers-contrast: high)').matches;
  }

  /**
   * Initialize compatibility classes and listeners
   */
  init() {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    
    // Add compatibility classes
    if (!this.supportsBackdropFilter) {
      root.classList.add('no-backdrop-filter');
      console.warn('Backdrop-filter not supported, using fallback glassmorphism styles');
    }
    
    if (!this.supportsWebGL) {
      root.classList.add('no-webgl');
      console.warn('WebGL not supported, Three.js backgrounds may be disabled');
    }
    
    if (this.prefersReducedMotion) {
      root.classList.add('reduce-motion');
    }
    
    if (this.prefersHighContrast) {
      root.classList.add('high-contrast');
    }

    // Set up media query listeners for dynamic changes
    this.setupMediaQueryListeners();
    
    // Set up performance monitoring
    this.setupPerformanceMonitoring();
  }

  /**
   * Set up listeners for media query changes
   */
  setupMediaQueryListeners() {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const root = document.documentElement;
    
    // Reduced motion listener
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', (e) => {
      this.prefersReducedMotion = e.matches;
      root.classList.toggle('reduce-motion', e.matches);
      this.updateAnimationSettings();
    });

    // High contrast listener
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    contrastQuery.addEventListener('change', (e) => {
      this.prefersHighContrast = e.matches;
      root.classList.toggle('high-contrast', e.matches);
      this.updateContrastSettings();
    });
  }

  /**
   * Set up performance monitoring for glassmorphism effects
   */
  setupPerformanceMonitoring() {
    if (typeof window === 'undefined' || !window.performance) return;

    // Monitor frame rate for glassmorphism effects
    let frameCount = 0;
    let lastTime = performance.now();
    
    const monitorFrameRate = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        if (fps < 30) {
          this.degradePerformance();
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(monitorFrameRate);
    };
    
    // Start monitoring after a delay to avoid initial load impact
    setTimeout(() => {
      requestAnimationFrame(monitorFrameRate);
    }, 2000);
  }

  /**
   * Degrade performance by reducing glassmorphism effects
   */
  degradePerformance() {
    const root = document.documentElement;
    
    if (!root.classList.contains('performance-mode')) {
      root.classList.add('performance-mode');
      console.warn('Performance degraded: reducing glassmorphism effects');
      
      // Dispatch custom event for components to react
      window.dispatchEvent(new CustomEvent('glassmorphism:performance-degraded', {
        detail: { reason: 'low-fps' }
      }));
    }
  }

  /**
   * Update animation settings based on user preferences
   */
  updateAnimationSettings() {
    // Dispatch event for components to update their animation behavior
    window.dispatchEvent(new CustomEvent('glassmorphism:motion-preference-changed', {
      detail: { prefersReducedMotion: this.prefersReducedMotion }
    }));
  }

  /**
   * Update contrast settings based on user preferences
   */
  updateContrastSettings() {
    // Dispatch event for components to update their contrast behavior
    window.dispatchEvent(new CustomEvent('glassmorphism:contrast-preference-changed', {
      detail: { prefersHighContrast: this.prefersHighContrast }
    }));
  }

  /**
   * Get appropriate glassmorphism class based on browser support
   */
  getGlassClass(baseClass = 'glass-morphism', fallbackClass = 'glass-fallback') {
    return this.supportsBackdropFilter ? baseClass : fallbackClass;
  }

  /**
   * Get animation variants based on motion preferences
   */
  getAnimationVariants(fullVariants, reducedVariants) {
    return this.prefersReducedMotion ? reducedVariants : fullVariants;
  }

  /**
   * Check if glassmorphism effects should be enabled
   */
  shouldEnableGlassmorphism() {
    return this.supportsBackdropFilter && !document.documentElement.classList.contains('performance-mode');
  }

  /**
   * Get performance-appropriate blur value
   */
  getBlurValue(defaultBlur = '20px') {
    if (document.documentElement.classList.contains('performance-mode')) {
      return '10px'; // Reduced blur for better performance
    }
    return defaultBlur;
  }

  /**
   * Get browser compatibility report
   */
  getCompatibilityReport() {
    return {
      backdropFilter: this.supportsBackdropFilter,
      webgl: this.supportsWebGL,
      reducedMotion: this.prefersReducedMotion,
      highContrast: this.prefersHighContrast,
      userAgent: navigator.userAgent,
      performanceMode: document.documentElement.classList.contains('performance-mode')
    };
  }
}

// Create singleton instance
const glassmorphismCompat = new GlassmorphismCompatibility();

// Export for use in components
export default glassmorphismCompat;

// Also export the class for testing
export { GlassmorphismCompatibility };