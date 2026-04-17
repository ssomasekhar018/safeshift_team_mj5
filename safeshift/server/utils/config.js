/**
 * SafeShift Platform Configuration Management
 * Handles environment configuration with backward compatibility
 * Supports MongoDB, Three.js performance settings, and animation preferences
 */

const path = require('path');

class ConfigManager {
  constructor() {
    this.config = {};
    this.validationErrors = [];
    this.warnings = [];
    this.isInitialized = false;
  }

  /**
   * Initialize configuration from environment variables
   */
  initialize() {
    if (this.isInitialized) {
      return this.config;
    }

    // Load environment variables
    require('dotenv').config();

    // Build configuration object
    this.config = {
      // Server Configuration
      server: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT) || 4000,
        clientUrl: process.env.CLIENT_URL || 'http://localhost:5173'
      },

      // JWT Configuration
      jwt: {
        secret: process.env.JWT_SECRET || this.generateWarning('JWT_SECRET', 'default-secret-key')
      },

      // Database Configuration (MongoDB)
      database: {
        // MongoDB connection string (new)
        mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/safeshift',
        mongoOptions: {
          maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE) || 10,
          serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT) || 5000,
          socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT) || 45000,
          bufferMaxEntries: parseInt(process.env.MONGO_BUFFER_MAX_ENTRIES) || 0
        },
        useMongoDB: process.env.USE_MONGODB !== 'false' // Default to true unless explicitly disabled
      },

      // Three.js Performance Configuration
      threejs: {
        // Performance settings
        performanceMode: process.env.THREEJS_PERFORMANCE_MODE || 'auto', // auto, high, medium, low
        // Performance settings
        maxParticles: process.env.THREEJS_MAX_PARTICLES ? parseInt(process.env.THREEJS_MAX_PARTICLES) : 1000,
        targetFPS: process.env.THREEJS_TARGET_FPS ? parseInt(process.env.THREEJS_TARGET_FPS) : 60,
        enableAntialiasing: process.env.THREEJS_ANTIALIASING !== 'false',
        enableShadows: process.env.THREEJS_SHADOWS !== 'false',
        
        // Quality settings
        pixelRatio: parseFloat(process.env.THREEJS_PIXEL_RATIO) || Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio : 1),
        renderScale: parseFloat(process.env.THREEJS_RENDER_SCALE) || 1.0,
        
        // Memory management
        maxMemoryMB: parseInt(process.env.THREEJS_MAX_MEMORY_MB) || 100,
        enableObjectPooling: process.env.THREEJS_OBJECT_POOLING !== 'false'
      },

      // Animation Configuration
      animations: {
        // Global animation preferences
        enableAnimations: process.env.ENABLE_ANIMATIONS !== 'false',
        respectReducedMotion: process.env.RESPECT_REDUCED_MOTION !== 'false',
        
        // Performance settings
        animationQuality: process.env.ANIMATION_QUALITY || 'high', // high, medium, low
        maxConcurrentAnimations: process.env.MAX_CONCURRENT_ANIMATIONS ? parseInt(process.env.MAX_CONCURRENT_ANIMATIONS) : 10,
        
        // Timing settings
        defaultDuration: process.env.ANIMATION_DEFAULT_DURATION ? parseInt(process.env.ANIMATION_DEFAULT_DURATION) : 300,
        defaultEasing: process.env.ANIMATION_DEFAULT_EASING || 'easeInOut',
        
        // Framer Motion specific
        framerMotionFeatures: {
          layout: process.env.FRAMER_LAYOUT !== 'false',
          drag: process.env.FRAMER_DRAG !== 'false',
          whileHover: process.env.FRAMER_WHILE_HOVER !== 'false',
          whileTap: process.env.FRAMER_WHILE_TAP !== 'false'
        }
      },

      // External API Configuration (backward compatibility maintained)
      apis: {
        openWeather: {
          apiKey: process.env.OPENWEATHER_API_KEY || 'demo_key',
          baseUrl: process.env.OPENWEATHER_BASE_URL || 'https://api.openweathermap.org/data/2.5'
        },
        aqicn: {
          token: process.env.AQICN_TOKEN || 'demo_key',
          baseUrl: process.env.AQICN_BASE_URL || 'https://api.waqi.info'
        },
        razorpay: {
          keyId: process.env.RAZORPAY_KEY_ID || '',
          keySecret: process.env.RAZORPAY_KEY_SECRET || '',
          accountNumber: process.env.RAZORPAY_ACCOUNT_NUMBER || ''
        },
        mlService: {
          url: process.env.ML_SERVICE_URL || 'http://localhost:8000',
          timeout: parseInt(process.env.ML_SERVICE_TIMEOUT) || 30000
        }
      }
    };

    // Validate configuration
    this.validateConfiguration();
    
    this.isInitialized = true;
    return this.config;
  }

  /**
   * Generate warning for missing or default configuration values
   */
  generateWarning(key, defaultValue) {
    this.warnings.push(`⚠️  ${key} not configured - using default: ${defaultValue}`);
    return defaultValue;
  }

  /**
   * Validate all configuration values
   */
  validateConfiguration() {
    this.validationErrors = [];
    this.warnings = [];

    // Validate required server configuration
    if (!this.config.jwt.secret || this.config.jwt.secret === 'default-secret-key') {
      this.warnings.push('⚠️  JWT_SECRET is using the default value - set a secure secret in production!');
    }

    if (this.config.server.port < 1 || this.config.server.port > 65535) {
      this.validationErrors.push('PORT must be a valid port number (1-65535)');
    }

    // Validate MongoDB configuration
    if (this.config.database.useMongoDB) {
      if (!this.config.database.mongoUri || this.config.database.mongoUri.includes('localhost')) {
        this.warnings.push('⚠️  MONGODB_URI is using local or default connection - verify for production');
      }

      // Validate MongoDB options
      if (this.config.database.mongoOptions.maxPoolSize < 1) {
        this.validationErrors.push('MONGO_MAX_POOL_SIZE must be at least 1');
      }
    }

    // Validate Three.js configuration
    const validPerformanceModes = ['auto', 'high', 'medium', 'low'];
    if (!validPerformanceModes.includes(this.config.threejs.performanceMode)) {
      this.validationErrors.push(`THREEJS_PERFORMANCE_MODE must be one of: ${validPerformanceModes.join(', ')}`);
    }

    if (this.config.threejs.maxParticles < 0) {
      this.validationErrors.push('THREEJS_MAX_PARTICLES must be a non-negative number');
    }

    if (this.config.threejs.targetFPS < 1 || this.config.threejs.targetFPS > 120) {
      this.validationErrors.push('THREEJS_TARGET_FPS must be between 1 and 120');
    }

    // Validate animation configuration
    const validAnimationQualities = ['high', 'medium', 'low'];
    if (!validAnimationQualities.includes(this.config.animations.animationQuality)) {
      this.validationErrors.push(`ANIMATION_QUALITY must be one of: ${validAnimationQualities.join(', ')}`);
    }

    if (this.config.animations.maxConcurrentAnimations < 1) {
      this.validationErrors.push('MAX_CONCURRENT_ANIMATIONS must be at least 1');
    }

    if (this.config.animations.defaultDuration < 0) {
      this.validationErrors.push('ANIMATION_DEFAULT_DURATION must be non-negative');
    }

    // Validate external APIs (backward compatibility warnings)
    if (this.config.apis.openWeather.apiKey === 'demo_key') {
      this.warnings.push('⚠️  OPENWEATHER_API_KEY not configured - using demo mode');
    }

    if (this.config.apis.aqicn.token === 'demo_key') {
      this.warnings.push('⚠️  AQICN_TOKEN not configured - using demo mode');
    }

    if (!this.config.apis.razorpay.keyId || !this.config.apis.razorpay.keySecret) {
      this.warnings.push('⚠️  Razorpay credentials not configured - payouts will use fallback IDs');
    }
  }

  /**
   * Get configuration value by path (e.g., 'database.mongoUri')
   */
  get(path) {
    if (!this.isInitialized) {
      this.initialize();
    }

    return path.split('.').reduce((obj, key) => obj && obj[key], this.config);
  }

  /**
   * Check if configuration is valid
   */
  isValid() {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.validationErrors.length === 0;
  }

  /**
   * Get all validation errors
   */
  getValidationErrors() {
    return this.validationErrors;
  }

  /**
   * Get all warnings
   */
  getWarnings() {
    return this.warnings;
  }

  /**
   * Print configuration status to console
   */
  printStatus() {
    if (!this.isInitialized) {
      this.initialize();
    }

    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║         SafeShift Configuration Status           ║');
    console.log('╠══════════════════════════════════════════════════╣');

    if (this.validationErrors.length > 0) {
      console.log('║ ❌ CONFIGURATION ERRORS:                         ║');
      this.validationErrors.forEach(error => {
        console.log(`║ • ${error.padEnd(47)}║`);
      });
      console.log('╠══════════════════════════════════════════════════╣');
    }

    if (this.warnings.length > 0) {
      console.log('║ ⚠️  CONFIGURATION WARNINGS:                      ║');
      this.warnings.forEach(warning => {
        console.log(`║ ${warning.padEnd(49)}║`);
      });
      console.log('╠══════════════════════════════════════════════════╣');
    }

    if (this.validationErrors.length === 0 && this.warnings.length === 0) {
      console.log('║ ✅ All configuration values are properly set     ║');
      console.log('╠══════════════════════════════════════════════════╣');
    }

    // Show key configuration values
    console.log('║ 📊 CONFIGURATION SUMMARY:                        ║');
    console.log(`║ • Environment: ${this.config.server.nodeEnv.padEnd(32)}║`);
    console.log(`║ • Database: ${(this.config.database.useMongoDB ? 'MongoDB' : 'SQLite').padEnd(35)}║`);
    console.log(`║ • Three.js Mode: ${this.config.threejs.performanceMode.padEnd(29)}║`);
    console.log(`║ • Animation Quality: ${this.config.animations.animationQuality.padEnd(25)}║`);
    console.log('╚══════════════════════════════════════════════════╝\n');

    // Throw error if configuration is invalid
    if (this.validationErrors.length > 0) {
      throw new Error(`Configuration validation failed: ${this.validationErrors.join(', ')}`);
    }
  }

  /**
   * Get frontend configuration (safe to expose to client)
   */
  getFrontendConfig() {
    if (!this.isInitialized) {
      this.initialize();
    }

    return {
      threejs: {
        performanceMode: this.config.threejs.performanceMode,
        maxParticles: this.config.threejs.maxParticles,
        targetFPS: this.config.threejs.targetFPS,
        enableAntialiasing: this.config.threejs.enableAntialiasing,
        enableShadows: this.config.threejs.enableShadows,
        pixelRatio: this.config.threejs.pixelRatio,
        renderScale: this.config.threejs.renderScale
      },
      animations: {
        enableAnimations: this.config.animations.enableAnimations,
        respectReducedMotion: this.config.animations.respectReducedMotion,
        animationQuality: this.config.animations.animationQuality,
        maxConcurrentAnimations: this.config.animations.maxConcurrentAnimations,
        defaultDuration: this.config.animations.defaultDuration,
        defaultEasing: this.config.animations.defaultEasing,
        framerMotionFeatures: this.config.animations.framerMotionFeatures
      }
    };
  }
}

// Create singleton instance
const configManager = new ConfigManager();

module.exports = configManager;