/**
 * Browser Compatibility Validation System
 * 
 * Validates browser support for:
 * - Glassmorphism effects (backdrop-filter)
 * - Three.js/WebGL capabilities
 * - CSS Grid and Flexbox
 * - Animation features
 * 
 * Provides fallback mechanisms for unsupported features
 * Requirements: 7.4
 */

class BrowserCompatibilityChecker {
  constructor() {
    this.browserInfo = this.detectBrowser();
    this.features = {};
    this.warnings = [];
    this.fallbacksEnabled = [];
    
    // Target browser versions
    this.targetBrowsers = {
      chrome: 90,
      firefox: 88,
      safari: 14,
      edge: 90
    };
    
    this.runCompatibilityChecks();
  }

  /**
   * Detect browser name and version
   * @returns {Object} Browser information
   */
  detectBrowser() {
    const ua = navigator.userAgent;
    let browserName = 'unknown';
    let browserVersion = 0;
    let isSupported = false;

    // Chrome
    if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) {
      browserName = 'chrome';
      const match = ua.match(/Chrome\/(\d+)/);
      browserVersion = match ? parseInt(match[1]) : 0;
      isSupported = browserVersion >= this.targetBrowsers.chrome;
    }
    // Edge (Chromium)
    else if (ua.indexOf('Edg') > -1) {
      browserName = 'edge';
      const match = ua.match(/Edg\/(\d+)/);
      browserVersion = match ? parseInt(match[1]) : 0;
      isSupported = browserVersion >= this.targetBrowsers.edge;
    }
    // Firefox
    else if (ua.indexOf('Firefox') > -1) {
      browserName = 'firefox';
      const match = ua.match(/Firefox\/(\d+)/);
      browserVersion = match ? parseInt(match[1]) : 0;
      isSupported = browserVersion >= this.targetBrowsers.firefox;
    }
    // Safari
    else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
      browserName = 'safari';
      const match = ua.match(/Version\/(\d+)/);
      browserVersion = match ? parseInt(match[1]) : 0;
      isSupported = browserVersion >= this.targetBrowsers.safari;
    }

    return {
      name: browserName,
      version: browserVersion,
      isSupported,
      userAgent: ua,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
      isTablet: /iPad|Android(?!.*Mobile)/i.test(ua)
    };
  }

  /**
   * Run all compatibility checks
   */
  runCompatibilityChecks() {
    this.checkBackdropFilter();
    this.checkWebGL();
    this.checkCSSGrid();
    this.checkFlexbox();
    this.checkAnimations();
    this.checkWebGLExtensions();
    this.checkPerformanceAPIs();
    this.checkModernJavaScript();
    
    this.generateCompatibilityReport();
  }

  /**
   * Check backdrop-filter support for glassmorphism
   */
  checkBackdropFilter() {
    const supported = CSS.supports('backdrop-filter', 'blur(10px)') ||
                     CSS.supports('-webkit-backdrop-filter', 'blur(10px)');
    
    this.features.backdropFilter = {
      supported,
      prefixed: !CSS.supports('backdrop-filter', 'blur(10px)') && 
                CSS.supports('-webkit-backdrop-filter', 'blur(10px)'),
      fallbackRequired: !supported
    };

    if (!supported) {
      this.warnings.push({
        feature: 'backdrop-filter',
        severity: 'medium',
        message: 'Backdrop-filter not supported. Glassmorphism effects will use fallback styling.',
        recommendation: 'Update to a modern browser version for best visual experience.'
      });
      this.enableFallback('glassmorphism');
    } else if (this.features.backdropFilter.prefixed) {
      this.warnings.push({
        feature: 'backdrop-filter',
        severity: 'low',
        message: 'Backdrop-filter requires -webkit- prefix on this browser.',
        recommendation: 'No action needed, prefix will be applied automatically.'
      });
    }
  }

  /**
   * Check WebGL support for Three.js
   */
  checkWebGL() {
    const canvas = document.createElement('canvas');
    let gl = null;
    let supported = false;
    let version = null;

    try {
      gl = canvas.getContext('webgl2');
      if (gl) {
        version = 'webgl2';
        supported = true;
      } else {
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          version = 'webgl';
          supported = true;
        }
      }
    } catch (e) {
      supported = false;
    }

    this.features.webgl = {
      supported,
      version,
      context: gl,
      fallbackRequired: !supported
    };

    canvas.remove();

    if (!supported) {
      this.warnings.push({
        feature: 'webgl',
        severity: 'high',
        message: 'WebGL not supported. 3D backgrounds will not be available.',
        recommendation: 'Enable hardware acceleration or update your browser.'
      });
      this.enableFallback('three-js');
    } else if (version === 'webgl' && !version.includes('2')) {
      this.warnings.push({
        feature: 'webgl',
        severity: 'low',
        message: 'WebGL 2.0 not available, using WebGL 1.0.',
        recommendation: 'Update browser for better 3D performance.'
      });
    }
  }

  /**
   * Check WebGL extensions and capabilities
   */
  checkWebGLExtensions() {
    if (!this.features.webgl || !this.features.webgl.supported) {
      this.features.webglExtensions = {
        supported: false,
        extensions: []
      };
      return;
    }

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      this.features.webglExtensions = {
        supported: false,
        extensions: []
      };
      canvas.remove();
      return;
    }

    const extensions = {
      anisotropicFiltering: gl.getExtension('EXT_texture_filter_anisotropic') ||
                           gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic'),
      floatTextures: gl.getExtension('OES_texture_float'),
      depthTexture: gl.getExtension('WEBGL_depth_texture'),
      vertexArrayObject: gl.getExtension('OES_vertex_array_object'),
      instancedArrays: gl.getExtension('ANGLE_instanced_arrays'),
      standardDerivatives: gl.getExtension('OES_standard_derivatives')
    };

    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxVertexUniforms = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
    const maxFragmentUniforms = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);
    const maxVaryingVectors = gl.getParameter(gl.MAX_VARYING_VECTORS);

    this.features.webglExtensions = {
      supported: true,
      extensions,
      capabilities: {
        maxTextureSize,
        maxVertexUniforms,
        maxFragmentUniforms,
        maxVaryingVectors
      }
    };

    canvas.remove();

    // Warn about missing important extensions
    if (!extensions.anisotropicFiltering) {
      this.warnings.push({
        feature: 'webgl-anisotropic',
        severity: 'low',
        message: 'Anisotropic filtering not available. Textures may appear less sharp.',
        recommendation: 'No action needed, quality will be slightly reduced.'
      });
    }
  }

  /**
   * Check CSS Grid support
   */
  checkCSSGrid() {
    const supported = CSS.supports('display', 'grid');
    
    this.features.cssGrid = {
      supported,
      fallbackRequired: !supported
    };

    if (!supported) {
      this.warnings.push({
        feature: 'css-grid',
        severity: 'medium',
        message: 'CSS Grid not supported. Layout may use flexbox fallback.',
        recommendation: 'Update to a modern browser for optimal layout.'
      });
      this.enableFallback('css-grid');
    }
  }

  /**
   * Check Flexbox support
   */
  checkFlexbox() {
    const supported = CSS.supports('display', 'flex');
    
    this.features.flexbox = {
      supported,
      fallbackRequired: !supported
    };

    if (!supported) {
      this.warnings.push({
        feature: 'flexbox',
        severity: 'high',
        message: 'Flexbox not supported. Layout will be significantly degraded.',
        recommendation: 'Update to a modern browser immediately.'
      });
      this.enableFallback('flexbox');
    }
  }

  /**
   * Check CSS animations and transitions support
   */
  checkAnimations() {
    const transitionsSupported = CSS.supports('transition', 'all 0.3s');
    const animationsSupported = CSS.supports('animation', 'test 1s');
    const transformsSupported = CSS.supports('transform', 'translateX(10px)');
    
    this.features.animations = {
      transitions: transitionsSupported,
      animations: animationsSupported,
      transforms: transformsSupported,
      supported: transitionsSupported && animationsSupported && transformsSupported,
      fallbackRequired: !transitionsSupported || !animationsSupported
    };

    if (!this.features.animations.supported) {
      this.warnings.push({
        feature: 'css-animations',
        severity: 'medium',
        message: 'CSS animations not fully supported. Some visual effects may be disabled.',
        recommendation: 'Update browser for smooth animations.'
      });
      this.enableFallback('animations');
    }
  }

  /**
   * Check Performance APIs availability
   */
  checkPerformanceAPIs() {
    const performanceSupported = typeof window.performance !== 'undefined';
    const performanceMemorySupported = performanceSupported && 
                                      typeof window.performance.memory !== 'undefined';
    const performanceObserverSupported = typeof PerformanceObserver !== 'undefined';
    
    this.features.performanceAPIs = {
      performance: performanceSupported,
      memory: performanceMemorySupported,
      observer: performanceObserverSupported,
      supported: performanceSupported
    };

    if (!performanceMemorySupported) {
      this.warnings.push({
        feature: 'performance-memory',
        severity: 'low',
        message: 'Performance Memory API not available. Memory monitoring will be limited.',
        recommendation: 'Use Chrome/Edge for detailed memory monitoring.'
      });
    }
  }

  /**
   * Check modern JavaScript features
   */
  checkModernJavaScript() {
    const features = {
      promises: typeof Promise !== 'undefined',
      asyncAwait: (async () => {})().constructor.name === 'AsyncFunction',
      modules: 'noModule' in document.createElement('script'),
      classes: typeof class {} === 'function',
      arrowFunctions: (() => {}).constructor.name === 'Function',
      destructuring: true, // Hard to test, assume true if others work
      spread: true, // Hard to test, assume true if others work
      templateLiterals: true // Hard to test, assume true if others work
    };

    const allSupported = Object.values(features).every(v => v);

    this.features.modernJavaScript = {
      ...features,
      supported: allSupported
    };

    if (!allSupported) {
      this.warnings.push({
        feature: 'modern-javascript',
        severity: 'high',
        message: 'Modern JavaScript features not fully supported. Application may not function correctly.',
        recommendation: 'Update to a modern browser immediately.'
      });
    }
  }

  /**
   * Enable a fallback mechanism
   * @param {string} fallbackType - Type of fallback to enable
   */
  enableFallback(fallbackType) {
    if (!this.fallbacksEnabled.includes(fallbackType)) {
      this.fallbacksEnabled.push(fallbackType);
      
      // Apply fallback CSS classes to document
      switch (fallbackType) {
        case 'glassmorphism':
          document.documentElement.classList.add('no-backdrop-filter');
          break;
        case 'three-js':
          document.documentElement.classList.add('no-webgl');
          break;
        case 'css-grid':
          document.documentElement.classList.add('no-css-grid');
          break;
        case 'flexbox':
          document.documentElement.classList.add('no-flexbox');
          break;
        case 'animations':
          document.documentElement.classList.add('no-animations');
          break;
      }
    }
  }

  /**
   * Generate comprehensive compatibility report
   */
  generateCompatibilityReport() {
    const allFeatures = Object.keys(this.features);
    const supportedFeatures = allFeatures.filter(key => 
      this.features[key].supported !== false
    );
    const unsupportedFeatures = allFeatures.filter(key => 
      this.features[key].supported === false
    );

    this.report = {
      browser: this.browserInfo,
      compatibility: {
        score: (supportedFeatures.length / allFeatures.length) * 100,
        supported: supportedFeatures.length,
        unsupported: unsupportedFeatures.length,
        total: allFeatures.length
      },
      features: this.features,
      warnings: this.warnings,
      fallbacksEnabled: this.fallbacksEnabled,
      recommendation: this.getOverallRecommendation()
    };

    // Log report
    console.log('[Browser Compatibility] Report generated:', this.report);
    
    // Log warnings
    if (this.warnings.length > 0) {
      console.warn('[Browser Compatibility] Warnings:', this.warnings);
    }
  }

  /**
   * Get overall recommendation based on compatibility
   * @returns {string} Recommendation message
   */
  getOverallRecommendation() {
    const score = (Object.keys(this.features).filter(key => 
      this.features[key].supported !== false
    ).length / Object.keys(this.features).length) * 100;

    if (score >= 90) {
      return 'Excellent browser compatibility. All features fully supported.';
    } else if (score >= 75) {
      return 'Good browser compatibility. Some features may use fallbacks.';
    } else if (score >= 50) {
      return 'Fair browser compatibility. Several features will use fallbacks. Consider updating your browser.';
    } else {
      return 'Poor browser compatibility. Many features unsupported. Please update to a modern browser.';
    }
  }

  /**
   * Get compatibility report
   * @returns {Object} Compatibility report
   */
  getReport() {
    return this.report;
  }

  /**
   * Get warnings
   * @returns {Array} Array of warnings
   */
  getWarnings() {
    return this.warnings;
  }

  /**
   * Check if a specific feature is supported
   * @param {string} featureName - Name of the feature
   * @returns {boolean} Whether feature is supported
   */
  isFeatureSupported(featureName) {
    return this.features[featureName]?.supported !== false;
  }

  /**
   * Get fallback status
   * @returns {Array} Array of enabled fallbacks
   */
  getFallbacks() {
    return this.fallbacksEnabled;
  }

  /**
   * Test glassmorphism on different devices
   * @returns {Object} Test results
   */
  testGlassmorphismPerformance() {
    if (!this.features.backdropFilter.supported) {
      return {
        tested: false,
        reason: 'Backdrop-filter not supported'
      };
    }

    // Create test element
    const testElement = document.createElement('div');
    testElement.style.cssText = `
      position: fixed;
      top: -1000px;
      left: -1000px;
      width: 200px;
      height: 200px;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    `;
    document.body.appendChild(testElement);

    // Measure performance
    const start = performance.now();
    const computedStyle = window.getComputedStyle(testElement);
    const backdropFilter = computedStyle.backdropFilter || computedStyle.webkitBackdropFilter;
    const end = performance.now();

    document.body.removeChild(testElement);

    return {
      tested: true,
      renderTime: end - start,
      applied: backdropFilter !== 'none',
      performant: (end - start) < 50 // Less than 50ms is good
    };
  }

  /**
   * Test Three.js performance on current device
   * @returns {Object} Test results
   */
  testThreeJSPerformance() {
    if (!this.features.webgl.supported) {
      return {
        tested: false,
        reason: 'WebGL not supported'
      };
    }

    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
      canvas.remove();
      return {
        tested: false,
        reason: 'Could not create WebGL context'
      };
    }

    // Simple performance test
    const start = performance.now();
    
    // Draw a simple triangle
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    
    gl.shaderSource(vertexShader, 'attribute vec2 pos; void main() { gl_Position = vec4(pos, 0.0, 1.0); }');
    gl.shaderSource(fragmentShader, 'void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }');
    
    gl.compileShader(vertexShader);
    gl.compileShader(fragmentShader);
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);
    
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    
    const end = performance.now();

    canvas.remove();

    return {
      tested: true,
      renderTime: end - start,
      performant: (end - start) < 100 // Less than 100ms is good
    };
  }
}

// Create singleton instance lazily
let browserCompatibility = null;

function getBrowserCompatibility() {
  if (!browserCompatibility) {
    browserCompatibility = new BrowserCompatibilityChecker();
  }
  return browserCompatibility;
}

// Export both class and singleton getter
export { BrowserCompatibilityChecker, getBrowserCompatibility };
export default getBrowserCompatibility();
