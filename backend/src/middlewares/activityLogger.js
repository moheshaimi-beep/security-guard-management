const { ActivityLog } = require('../models');

const logActivity = async (options) => {
  const {
    userId,
    action,
    entityType,
    entityId,
    description,
    oldValues,
    newValues,
    req,
    status = 'success',
    errorMessage = null,
    metadata = null
  } = options;

  try {
    // Extract device information
    const getDeviceInfo = (req) => {
      if (!req) return null;
      
      const userAgent = req.headers['user-agent'] || '';
      let deviceType = 'unknown';
      
      // Detect device type from user agent
      if (/mobile/i.test(userAgent)) {
        deviceType = 'mobile';
      } else if (/tablet|ipad/i.test(userAgent)) {
        deviceType = 'tablet';
      } else if (/desktop|windows|mac os|linux/i.test(userAgent)) {
        deviceType = 'desktop';
      }
      
      // Detect OS
      let os = 'unknown';
      if (/windows/i.test(userAgent)) os = 'Windows';
      else if (/mac os/i.test(userAgent)) os = 'MacOS';
      else if (/android/i.test(userAgent)) os = 'Android';
      else if (/ios|iphone|ipad/i.test(userAgent)) os = 'iOS';
      else if (/linux/i.test(userAgent)) os = 'Linux';
      
      // Detect browser
      let browser = 'unknown';
      if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) browser = 'Chrome';
      else if (/firefox/i.test(userAgent)) browser = 'Firefox';
      else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';
      else if (/edg/i.test(userAgent)) browser = 'Edge';
      
      return {
        type: deviceType,
        os,
        browser,
        platform: req.headers['x-platform'] || deviceType,
        version: req.headers['x-app-version'] || 'unknown',
        macAddress: req.headers['x-mac-address'] || req.body?.macAddress || null,
        model: req.headers['x-device-model'] || req.body?.deviceModel || null
      };
    };
    
    // Get IP address (handle proxy)
    const getIpAddress = (req) => {
      if (!req) return null;
      return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
             req.headers['x-real-ip'] || 
             req.ip || 
             req.connection?.remoteAddress || 
             req.socket?.remoteAddress || 
             null;
    };

    await ActivityLog.create({
      userId,
      action,
      entityType,
      entityId,
      description,
      oldValues,
      newValues,
      ipAddress: getIpAddress(req),
      userAgent: req ? req.headers['user-agent'] : null,
      deviceInfo: getDeviceInfo(req),
      location: req?.body?.location || null,
      status,
      errorMessage,
      metadata
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

// Middleware to automatically log requests
const activityLoggerMiddleware = (action, entityType) => {
  return async (req, res, next) => {
    // Store original res.json
    const originalJson = res.json.bind(res);

    res.json = async function(data) {
      // Log after response
      if (req.user) {
        await logActivity({
          userId: req.user.id,
          action,
          entityType,
          entityId: req.params.id || data?.data?.id,
          description: `${action} ${entityType}`,
          req,
          status: res.statusCode < 400 ? 'success' : 'failure'
        });
      }
      return originalJson(data);
    };

    next();
  };
};

module.exports = {
  logActivity,
  activityLoggerMiddleware
};
