/**
 * SafeShift — Enhanced Security Service (MongoDB/Mongoose version)
 * Centralized security functions for account lockout, device fingerprinting,
 * suspicious activity detection, and comprehensive audit logging.
 */
const crypto = require('crypto');
const { connectMongoDB, getModels } = require('../db/mongodb');

// ─── Security Constants ──────────────────────────────────────────────────────

const MAX_FAILED_ATTEMPTS = 5;
const MIN_LOCKOUT_MINUTES = 15;
const EXPONENTIAL_BACKOFF_BASE = 2;
const MAX_LOCKOUT_MINUTES = 240; // 4 hours maximum
const HIGH_RISK_THRESHOLD = 70;
const DEVICE_VALIDATION_WINDOW_HOURS = 24;
const SUSPICIOUS_ACTIVITY_THRESHOLD = 10;
const SUSPICIOUS_DEVICE_THRESHOLD = 3;

// ─── Security Service Class ──────────────────────────────────────────────────

class SecurityService {
  
  /**
   * Calculate exponential backoff duration for account lockouts
   * @param {number} attempts - Number of failed attempts
   * @returns {number} Lockout duration in minutes
   */
  static calculateExponentialBackoff(attempts) {
    if (attempts < MAX_FAILED_ATTEMPTS) return 0;
    
    const backoffAttempts = attempts - MAX_FAILED_ATTEMPTS + 1;
    const backoffMinutes = MIN_LOCKOUT_MINUTES * Math.pow(EXPONENTIAL_BACKOFF_BASE, Math.min(backoffAttempts - 1, 4));
    return Math.min(backoffMinutes, MAX_LOCKOUT_MINUTES);
  }

  /**
   * Enhanced device fingerprinting with multiple browser factors
   * @param {Object} req - Express request object
   * @returns {string} SHA256 hash of device fingerprint
   */
  static buildDeviceFingerprint(req) {
    const factors = [
      req.headers['user-agent'] || 'unknown',
      req.headers['accept-language'] || 'unknown',
      req.headers['accept-encoding'] || 'unknown',
      this.getClientIp(req),
      req.headers['accept'] || 'unknown',
      req.headers['dnt'] || 'unknown',
      req.headers['sec-fetch-site'] || 'unknown',
      req.headers['sec-fetch-mode'] || 'unknown',
      req.headers['sec-fetch-dest'] || 'unknown',
      req.headers['sec-ch-ua'] || 'unknown',
      req.headers['sec-ch-ua-mobile'] || 'unknown',
      req.headers['sec-ch-ua-platform'] || 'unknown',
      req.headers['x-screen-resolution'] || 'unknown',
      req.headers['x-timezone'] || 'unknown',
    ];
    
    const fingerprint = factors.join('|');
    return crypto.createHash('sha256').update(fingerprint).digest('hex');
  }

  /**
   * Extract client IP address from request
   * @param {Object} req - Express request object
   * @returns {string} Client IP address
   */
  static getClientIp(req) {
    return (
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Validate device fingerprint against known devices for a worker
   * @param {string} workerId - Worker ID
   * @param {string} currentDeviceHash - Current device fingerprint hash
   * @param {string} ip - Client IP address
   * @returns {Promise<Object>} Device validation results
   */
  static async validateDeviceFingerprint(workerId, currentDeviceHash, ip) {
    try {
      await connectMongoDB();
      const { Worker, AuthAuditLog } = getModels();

      const windowDate = new Date(Date.now() - DEVICE_VALIDATION_WINDOW_HOURS * 3600000);

      // Get current worker's registered device
      const worker = await Worker.findById(workerId, 'device_hash last_login_ip updated_at');
      
      // Get recent successful logins from audit log
      const auditLogDevices = await AuthAuditLog.find({
        worker_id: workerId,
        success: true,
        user_agent: { $regex: /device:/ },
        created_at: { $gt: windowDate }
      }, 'user_agent ip_address created_at');

      const recentDevices = [];
      if (worker && worker.device_hash) {
        recentDevices.push({
          device_hash: worker.device_hash.substring(0, 8),
          last_login_at: worker.updated_at,
          last_login_ip: worker.last_login_ip
        });
      }

      auditLogDevices.forEach(log => {
        const match = log.user_agent.match(/device:([a-f0-9]{8})/);
        if (match) {
          recentDevices.push({
            device_hash: match[1],
            last_login_at: log.created_at,
            last_login_ip: log.ip_address
          });
        }
      });

      const isKnownDevice = recentDevices.some(device => 
        device.device_hash === currentDeviceHash.substring(0, 8)
      );

      const uniqueDevicesCount = new Set(recentDevices.map(d => d.device_hash)).size;
      const uniqueIpsCount = new Set(recentDevices.map(d => d.last_login_ip)).size;

      return {
        isKnownDevice,
        uniqueDevicesCount,
        uniqueIpsCount,
        riskScore: this.calculateDeviceRiskScore(isKnownDevice, uniqueDevicesCount, uniqueIpsCount),
        recentDevices: recentDevices.length
      };
    } catch (e) {
      console.error('[SECURITY] Device validation failed:', e.message);
      return { 
        isKnownDevice: false, 
        uniqueDevicesCount: 0, 
        uniqueIpsCount: 0, 
        riskScore: 50,
        recentDevices: 0 
      };
    }
  }

  /**
   * Calculate device-based risk score
   * @param {boolean} isKnownDevice - Whether device is recognized
   * @param {number} uniqueDevicesCount - Number of unique devices
   * @param {number} uniqueIpsCount - Number of unique IP addresses
   * @returns {number} Risk score (0-100)
   */
  static calculateDeviceRiskScore(isKnownDevice, uniqueDevicesCount, uniqueIpsCount) {
    let riskScore = 0;
    
    if (!isKnownDevice) riskScore += 30;
    if (uniqueDevicesCount > 3) riskScore += 25;
    if (uniqueDevicesCount > 5) riskScore += 15;
    if (uniqueIpsCount > 2) riskScore += 20;
    if (uniqueIpsCount > 4) riskScore += 10;
    
    return Math.min(riskScore, 100);
  }

  /**
   * Comprehensive suspicious activity detection
   * @param {string} ip - Client IP address
   * @param {string} deviceHash - Device fingerprint hash
   * @param {string} workerId - Worker ID (optional)
   * @returns {Promise<Object>} Suspicious activity analysis
   */
  static async detectSuspiciousActivity(ip, deviceHash, workerId = null) {
    try {
      await connectMongoDB();
      const { Worker, AuthAuditLog } = getModels();

      const oneHourAgo = new Date(Date.now() - 3600000);
      const tenMinutesAgo = new Date(Date.now() - 600000);
      const twentyFourHoursAgo = new Date(Date.now() - 86400000);

      // IP-based suspicious activity checks
      const ipFailuresCount = await AuthAuditLog.countDocuments({
        ip_address: ip,
        success: false,
        created_at: { $gt: oneHourAgo }
      });

      // Check for device switching
      const uniqueDevicesOnIp = await Worker.distinct('device_hash', {
        'security.last_login_ip': ip,
        'security.last_login_at': { $gt: twentyFourHoursAgo }
      });
      const uniqueDevicesCount = uniqueDevicesOnIp.length;

      const rapidAttemptsCount = await AuthAuditLog.countDocuments({
        ip_address: ip,
        created_at: { $gt: tenMinutesAgo }
      });

      const uniqueWorkersOnIp = await AuthAuditLog.distinct('worker_id', {
        ip_address: ip,
        success: false,
        created_at: { $gt: oneHourAgo }
      });
      const uniqueWorkersCount = uniqueWorkersOnIp.length;

      // Calculate comprehensive risk score
      let riskScore = 0;
      riskScore += Math.min((ipFailuresCount / SUSPICIOUS_ACTIVITY_THRESHOLD) * 40, 40);
      riskScore += Math.min((rapidAttemptsCount / 10) * 20, 20);
      riskScore += Math.min((uniqueWorkersCount / 3) * 25, 25);
      riskScore += Math.min((uniqueDevicesCount / SUSPICIOUS_DEVICE_THRESHOLD) * 15, 15);

      // Additional validation if worker ID is provided
      let deviceValidation = null;
      if (workerId) {
        deviceValidation = await this.validateDeviceFingerprint(workerId, deviceHash, ip);
        riskScore += deviceValidation.riskScore * 0.3;
      }

      return {
        suspiciousIp: ipFailuresCount >= SUSPICIOUS_ACTIVITY_THRESHOLD,
        deviceSwitching: uniqueDevicesCount >= SUSPICIOUS_DEVICE_THRESHOLD,
        rapidAttempts: rapidAttemptsCount >= 10,
        crossAccountAttack: uniqueWorkersCount >= 3,
        riskScore: Math.min(riskScore, 100),
        deviceValidation,
        details: {
          ipFailures: ipFailuresCount,
          deviceSwitching: uniqueDevicesCount,
          rapidAttempts: rapidAttemptsCount,
          crossAccountFailures: uniqueWorkersCount
        }
      };
    } catch (e) {
      console.error('[SECURITY] Suspicious activity detection failed:', e.message);
      return { 
        suspiciousIp: false, 
        deviceSwitching: false, 
        rapidAttempts: false,
        crossAccountAttack: false,
        riskScore: 0,
        deviceValidation: null,
        details: {}
      };
    }
  }

  /**
   * Enhanced audit logging with comprehensive security context
   * @param {string} eventType - Type of security event
   * @param {Object} context - Security context information
   */
  static async enhancedAuditLog(eventType, { 
    workerId = null, 
    ip, 
    userAgent, 
    success, 
    reason = null, 
    deviceHash = null, 
    riskScore = 0, 
    additionalData = {} 
  }) {
    try {
      await connectMongoDB();
      const { AuthAuditLog } = getModels();

      // Build enhanced user agent string with security context
      const enhancedUserAgent = [
        userAgent,
        `device:${deviceHash?.substring(0, 8) || 'unknown'}`,
        `risk:${Math.round(riskScore)}`,
        additionalData.deviceValidation ? `known_device:${additionalData.deviceValidation.isKnownDevice}` : '',
        additionalData.lockoutDuration ? `lockout:${additionalData.lockoutDuration}min` : '',
        additionalData.attemptNumber ? `attempt:${additionalData.attemptNumber}` : '',
        additionalData.adminAttempt ? 'admin_attempt:true' : '',
        additionalData.isNewDevice ? 'new_device:true' : ''
      ].filter(Boolean).join('|');

      // Determine event severity
      let eventSeverity = 'LOW';
      if (riskScore >= HIGH_RISK_THRESHOLD) eventSeverity = 'HIGH';
      else if (riskScore >= 40) eventSeverity = 'MEDIUM';

      const enhancedEventType = `${eventType}_${eventSeverity}`;

      // Insert audit log entry
      await AuthAuditLog.create({
        event_type: enhancedEventType,
        worker_id: workerId,
        ip_address: ip,
        user_agent: enhancedUserAgent,
        success: success,
        failure_reason: reason
      });

      // Alert on high-risk events
      if (eventSeverity === 'HIGH') {
        console.warn(`[SECURITY ALERT] High-risk ${eventType}: worker_id=${workerId}, ip=${ip}, risk=${riskScore}, reason=${reason}`);
        this.triggerSecurityAlert(eventType, {
          workerId,
          ip,
          riskScore,
          reason,
          additionalData
        });
      }

    } catch (e) {
      console.error('[AUDIT] Enhanced log failed:', e.message);
      // Fallback to basic audit log
      this.basicAuditLog(eventType, { workerId, ip, userAgent, success, reason });
    }
  }

  /**
   * Basic audit logging fallback
   * @param {string} eventType - Event type
   * @param {Object} context - Basic context
   */
  static async basicAuditLog(eventType, { workerId = null, ip, userAgent, success, reason = null }) {
    try {
      await connectMongoDB();
      const { AuthAuditLog } = getModels();
      await AuthAuditLog.create({
        event_type: eventType,
        worker_id: workerId,
        ip_address: ip,
        user_agent: userAgent,
        success: success,
        failure_reason: reason
      });
    } catch (e) {
      console.error('[AUDIT] Basic log failed:', e.message);
    }
  }

  /**
   * Trigger security alert for high-risk events
   * @param {string} eventType - Type of security event
   * @param {Object} context - Alert context
   */
  static triggerSecurityAlert(eventType, context) {
    console.warn(`[SECURITY ALERT] ${eventType}:`, JSON.stringify(context, null, 2));
  }

  /**
   * Check if account is currently locked
   * @param {Object} worker - Worker object from database
   * @returns {boolean} Whether account is locked
   */
  static isAccountLocked(worker) {
    if (!worker.security || !worker.security.locked_until) return false;
    return new Date(worker.security.locked_until) > new Date();
  }

  /**
   * Get security metrics for monitoring dashboard
   * @param {string} timeframe - Time period ('1h', '24h', '7d')
   * @returns {Promise<Object>} Security metrics
   */
  static async getSecurityMetrics(timeframe = '24h') {
    try {
      await connectMongoDB();
      const { Worker, AuthAuditLog } = getModels();

      const timeLimit = timeframe === '1h' ? 3600000 : 
                       timeframe === '7d' ? 7 * 86400000 : 86400000;
      const startDate = new Date(Date.now() - timeLimit);

      const [failedLogins, highRiskEvents, uniqueIpsWithFailures, lockedAccounts] = await Promise.all([
        AuthAuditLog.countDocuments({
          event_type: { $regex: /^LOGIN_FAIL/ },
          created_at: { $gt: startDate }
        }),
        AuthAuditLog.countDocuments({
          event_type: { $regex: /_HIGH$/ },
          created_at: { $gt: startDate }
        }),
        AuthAuditLog.distinct('ip_address', {
          success: false,
          created_at: { $gt: startDate }
        }).then(ips => ips.length),
        Worker.countDocuments({
          'security.locked_until': { $gt: new Date() }
        })
      ]);

      return {
        failedLogins,
        highRiskEvents,
        uniqueIpsWithFailures,
        lockedAccounts
      };
    } catch (e) {
      console.error('[SECURITY] Metrics collection failed:', e.message);
      return { failedLogins: 0, highRiskEvents: 0, lockedAccounts: 0, uniqueIpsWithFailures: 0 };
    }
  }
}

module.exports = SecurityService;