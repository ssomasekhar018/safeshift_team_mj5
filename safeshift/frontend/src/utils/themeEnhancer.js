/**
 * SafeShift — Theme Enhancement Utilities
 * Advanced theme support and gradient background management for glassmorphism system
 */

class ThemeEnhancer {
  constructor() {
    this.currentTheme = 'dark';
    this.transitionDuration = 300;
    this.gradientIntensity = 1.0;
    this.init();
  }

  /**
   * Initialize theme enhancement system
   */
  init() {
    if (typeof document === 'undefined') return;

    // Detect initial theme
    this.currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    
    // Set up theme transition observer
    this.setupThemeObserver();
    
    // Initialize gradient backgrounds
    this.initializeGradientBackgrounds();
    
    // Set up performance monitoring for gradients
    this.setupGradientPerformanceMonitoring();
  }

  /**
   * Set up observer for theme changes
   */
  setupThemeObserver() {
    if (typeof MutationObserver === 'undefined') return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          const newTheme = document.documentElement.getAttribute('data-theme');
          if (newTheme !== this.currentTheme) {
            this.handleThemeChange(this.currentTheme, newTheme);
            this.currentTheme = newTheme;
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  /**
   * Handle theme change with smooth transitions
   */
  handleThemeChange(oldTheme, newTheme) {
    // Add transition class for smooth theme switching
    document.documentElement.classList.add('theme-transitioning');
    
    // Update gradient backgrounds for new theme
    this.updateGradientBackgrounds(newTheme);
    
    // Dispatch custom event for components to react
    window.dispatchEvent(new CustomEvent('theme:changed', {
      detail: { oldTheme, newTheme, transitionDuration: this.transitionDuration }
    }));

    // Remove transition class after animation completes
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, this.transitionDuration);
  }

  /**
   * Initialize gradient backgrounds based on current theme
   */
  initializeGradientBackgrounds() {
    const gradientElements = document.querySelectorAll('.glass-mesh-bg, .glass-blob-bg, .glass-bg');
    
    gradientElements.forEach(element => {
      this.enhanceGradientElement(element);
    });
  }

  /**
   * Enhance individual gradient element with theme-specific improvements
   */
  enhanceGradientElement(element) {
    // Add theme-specific classes
    element.classList.add(`gradient-${this.currentTheme}`);
    
    // Add performance monitoring attributes
    element.setAttribute('data-gradient-performance', 'monitored');
    
    // Set up intersection observer for performance optimization
    this.setupGradientIntersectionObserver(element);
  }

  /**
   * Update gradient backgrounds when theme changes
   */
  updateGradientBackgrounds(newTheme) {
    const gradientElements = document.querySelectorAll('.glass-mesh-bg, .glass-blob-bg, .glass-bg');
    
    gradientElements.forEach(element => {
      // Remove old theme classes
      element.classList.remove('gradient-dark', 'gradient-light');
      
      // Add new theme class
      element.classList.add(`gradient-${newTheme}`);
      
      // Update gradient intensity based on theme
      this.updateGradientIntensity(element, newTheme);
    });
  }

  /**
   * Update gradient intensity based on theme and performance
   */
  updateGradientIntensity(element, theme) {
    const isPerformanceMode = document.documentElement.classList.contains('performance-mode');
    const baseIntensity = theme === 'dark' ? 1.2 : 0.8;
    const finalIntensity = isPerformanceMode ? baseIntensity * 0.6 : baseIntensity * this.gradientIntensity;
    
    element.style.setProperty('--gradient-intensity', finalIntensity);
  }

  /**
   * Set up intersection observer for gradient performance optimization
   */
  setupGradientIntersectionObserver(element) {
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Element is visible, enable full gradient effects
          entry.target.classList.add('gradient-active');
          entry.target.classList.remove('gradient-paused');
        } else {
          // Element is not visible, pause animations for performance
          entry.target.classList.remove('gradient-active');
          entry.target.classList.add('gradient-paused');
        }
      });
    }, {
      rootMargin: '50px',
      threshold: 0.1
    });

    observer.observe(element);
  }

  /**
   * Set up performance monitoring for gradient effects
   */
  setupGradientPerformanceMonitoring() {
    if (typeof window === 'undefined' || !window.performance) return;

    let frameCount = 0;
    let lastTime = performance.now();
    
    const monitorGradientPerformance = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 2000) { // Check every 2 seconds
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        if (fps < 45) {
          this.degradeGradientPerformance();
        } else if (fps > 55 && this.gradientIntensity < 1.0) {
          this.restoreGradientPerformance();
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(monitorGradientPerformance);
    };
    
    // Start monitoring after initial load
    setTimeout(() => {
      requestAnimationFrame(monitorGradientPerformance);
    }, 3000);
  }

  /**
   * Degrade gradient performance when FPS drops
   */
  degradeGradientPerformance() {
    this.gradientIntensity = Math.max(0.3, this.gradientIntensity - 0.1);
    
    const gradientElements = document.querySelectorAll('.glass-mesh-bg, .glass-blob-bg, .glass-bg');
    gradientElements.forEach(element => {
      this.updateGradientIntensity(element, this.currentTheme);
      element.classList.add('gradient-performance-mode');
    });

    console.warn('Gradient performance degraded due to low FPS');
  }

  /**
   * Restore gradient performance when FPS improves
   */
  restoreGradientPerformance() {
    this.gradientIntensity = Math.min(1.0, this.gradientIntensity + 0.1);
    
    const gradientElements = document.querySelectorAll('.glass-mesh-bg, .glass-blob-bg, .glass-bg');
    gradientElements.forEach(element => {
      this.updateGradientIntensity(element, this.currentTheme);
      if (this.gradientIntensity >= 1.0) {
        element.classList.remove('gradient-performance-mode');
      }
    });
  }

  /**
   * Get theme-specific gradient configuration
   */
  getThemeGradientConfig(theme = this.currentTheme) {
    const configs = {
      dark: {
        meshIntensity: 1.2,
        blobIntensity: 1.0,
        animationSpeed: 1.0,
        blurRadius: 60,
        colors: {
          primary: 'rgba(124, 58, 237, 0.15)',
          secondary: 'rgba(59, 130, 246, 0.12)',
          tertiary: 'rgba(16, 185, 129, 0.10)',
          accent: 'rgba(236, 72, 153, 0.08)'
        }
      },
      light: {
        meshIntensity: 0.8,
        blobIntensity: 0.6,
        animationSpeed: 0.8,
        blurRadius: 40,
        colors: {
          primary: 'rgba(109, 40, 217, 0.08)',
          secondary: 'rgba(37, 99, 235, 0.06)',
          tertiary: 'rgba(5, 150, 105, 0.05)',
          accent: 'rgba(236, 72, 153, 0.04)'
        }
      }
    };

    return configs[theme] || configs.dark;
  }

  /**
   * Apply dynamic gradient configuration
   */
  applyGradientConfig(config) {
    const root = document.documentElement;
    
    // Update CSS custom properties
    root.style.setProperty('--gradient-mesh-intensity', config.meshIntensity);
    root.style.setProperty('--gradient-blob-intensity', config.blobIntensity);
    root.style.setProperty('--gradient-animation-speed', config.animationSpeed);
    root.style.setProperty('--gradient-blur-radius', `${config.blurRadius}px`);
    
    // Update color variables
    Object.entries(config.colors).forEach(([key, value]) => {
      root.style.setProperty(`--gradient-color-${key}`, value);
    });
  }

  /**
   * Create custom gradient background for specific elements
   */
  createCustomGradient(element, options = {}) {
    const {
      type = 'mesh', // 'mesh' or 'blob'
      intensity = 1.0,
      colors = [],
      animation = true
    } = options;

    const config = this.getThemeGradientConfig();
    const customColors = colors.length > 0 ? colors : Object.values(config.colors);
    
    if (type === 'mesh') {
      this.applyMeshGradient(element, customColors, intensity, animation);
    } else {
      this.applyBlobGradient(element, customColors, intensity, animation);
    }
  }

  /**
   * Apply mesh gradient to element
   */
  applyMeshGradient(element, colors, intensity, animation) {
    element.classList.add('glass-mesh-bg', 'custom-gradient');
    
    if (!animation) {
      element.classList.add('gradient-static');
    }
    
    // Create custom gradient CSS
    const gradientCSS = colors.map((color, index) => {
      const positions = ['20% 80%', '80% 20%', '40% 40%', '60% 10%', '10% 60%'];
      const position = positions[index % positions.length];
      return `radial-gradient(circle at ${position}, ${color} 0%, transparent 50%)`;
    }).join(', ');
    
    element.style.setProperty('--custom-mesh-gradient', gradientCSS);
    element.style.setProperty('--custom-gradient-intensity', intensity);
  }

  /**
   * Apply blob gradient to element
   */
  applyBlobGradient(element, colors, intensity, animation) {
    element.classList.add('glass-blob-bg', 'custom-gradient');
    
    if (!animation) {
      element.classList.add('gradient-static');
    }
    
    // Create custom blob gradients
    const blobGradients = colors.slice(0, 2).map((color, index) => {
      const sizes = ['400px 300px', '350px 250px'];
      const positions = ['20% 30%', '80% 70%'];
      return `radial-gradient(ellipse ${sizes[index]} at ${positions[index]}, ${color} 0%, transparent 70%)`;
    }).join(', ');
    
    element.style.setProperty('--custom-blob-gradient', blobGradients);
    element.style.setProperty('--custom-gradient-intensity', intensity);
  }

  /**
   * Get current theme information
   */
  getThemeInfo() {
    return {
      currentTheme: this.currentTheme,
      gradientIntensity: this.gradientIntensity,
      transitionDuration: this.transitionDuration,
      isPerformanceMode: document.documentElement.classList.contains('performance-mode'),
      config: this.getThemeGradientConfig()
    };
  }
}

// Create singleton instance
const themeEnhancer = new ThemeEnhancer();

// Export for use in components
export default themeEnhancer;

// Also export the class for testing
export { ThemeEnhancer };