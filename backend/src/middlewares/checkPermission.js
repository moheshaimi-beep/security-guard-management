const { Permission, RolePermission, UserPermission, User } = require('../models');

/**
 * Middleware pour vérifier les permissions
 * @param {string|string[]} requiredPermissions - Permission(s) requise(s)
 * @param {string} mode - 'any' (au moins une) ou 'all' (toutes requises)
 */
const checkPermission = (requiredPermissions, mode = 'any') => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Non authentifié'
        });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      // Admin a toutes les permissions
      if (user.role === 'admin') {
        return next();
      }

      // Convertir en tableau si une seule permission
      const permissions = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

      // Obtenir les permissions effectives de l'utilisateur
      const effectivePermissions = await getUserEffectivePermissions(userId, user.role);

      let hasPermission = false;

      if (mode === 'any') {
        // Au moins une permission requise
        hasPermission = permissions.some(perm => effectivePermissions.includes(perm));
      } else if (mode === 'all') {
        // Toutes les permissions requises
        hasPermission = permissions.every(perm => effectivePermissions.includes(perm));
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Permission refusée',
          required: permissions,
          mode
        });
      }

      // Ajouter les permissions à la requête pour usage ultérieur
      req.userPermissions = effectivePermissions;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification des permissions'
      });
    }
  };
};

/**
 * Obtenir les permissions effectives d'un utilisateur
 */
const getUserEffectivePermissions = async (userId, role) => {
  // Permissions du rôle
  const rolePermissions = await RolePermission.findAll({
    where: { role, isActive: true },
    include: [{
      model: Permission,
      as: 'permission',
      where: { isActive: true }
    }]
  });

  // Permissions personnalisées
  const userPermissions = await UserPermission.findAll({
    where: { userId },
    include: [{
      model: Permission,
      as: 'permission'
    }]
  });

  const rolePermCodes = rolePermissions.map(rp => rp.permission.code);
  const grantedPerms = userPermissions.filter(up => up.granted).map(up => up.permission.code);
  const deniedPerms = userPermissions.filter(up => !up.granted).map(up => up.permission.code);

  // Permissions effectives = (role + granted) - denied
  return [
    ...new Set([...rolePermCodes, ...grantedPerms])
  ].filter(code => !deniedPerms.includes(code));
};

/**
 * Vérifier si un utilisateur a une permission spécifique (fonction utilitaire)
 */
const hasPermission = async (userId, permissionCode) => {
  const user = await User.findByPk(userId);
  if (!user) return false;

  // Admin a toutes les permissions
  if (user.role === 'admin') return true;

  const effectivePermissions = await getUserEffectivePermissions(userId, user.role);
  return effectivePermissions.includes(permissionCode);
};

/**
 * Middleware pour vérifier si l'utilisateur est admin
 */
const adminOnly = async (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux administrateurs'
    });
  }
  next();
};

/**
 * Middleware pour vérifier si l'utilisateur peut créer des utilisateurs
 * Seuls les admins peuvent créer des utilisateurs
 */
const canCreateUsers = async (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Seuls les administrateurs peuvent créer des utilisateurs'
    });
  }
  next();
};

module.exports = {
  checkPermission,
  getUserEffectivePermissions,
  hasPermission,
  adminOnly,
  canCreateUsers
};
