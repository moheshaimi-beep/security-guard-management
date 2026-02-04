const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Verify JWT Token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    console.log('🔐 Auth middleware:', {
      hasAuthHeader: !!authHeader,
      authHeader: authHeader?.substring(0, 50) + '...'
    });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Missing or invalid auth header');
      return res.status(401).json({
        success: false,
        message: 'Accès non autorisé. Token manquant.'
      });
    }

    const token = authHeader.split(' ')[1];
    
    console.log('🔍 Attempting to verify token...');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    console.log('✅ Token verified:', {
      id: decoded.id,
      type: decoded.type,
      role: decoded.role
    });

    // Vérifier si c'est un token de pointage (checkInToken)
    if (decoded.type === 'checkin') {
      // Pour les tokens de pointage, on utilise une vérification plus simple
      const user = await User.findByPk(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Utilisateur non trouvé.'
        });
      }

      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Compte désactivé ou suspendu.'
        });
      }

      req.user = user;
      req.userId = user.id;
      req.isCheckInToken = true;
      return next();
    }

    // Vérification standard pour les tokens d'accès normaux
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé.'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Compte désactivé ou suspendu.'
      });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    console.log('❌ Auth error:', {
      name: error.name,
      message: error.message
    });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré. Veuillez vous reconnecter.'
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token invalide.'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Erreur d\'authentification.'
    });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié.'
      });
    }

    // Flatten roles array in case it's passed as an array
    const flatRoles = roles.flat();
    
    // Normalize roles to lowercase for comparison
    const normalizedRoles = flatRoles.map(r => typeof r === 'string' ? r.toLowerCase() : r);
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';

    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Permissions insuffisantes.'
      });
    }

    next();
  };
};

// Optional authentication (for public routes that can benefit from auth)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);

      if (user && user.status === 'active') {
        req.user = user;
        req.userId = user.id;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};
