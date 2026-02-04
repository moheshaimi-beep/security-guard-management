const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const { authenticate, authorize } = require('../middlewares/auth');

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// GET /api/permissions/my - Obtenir mes permissions (utilisateur connecté)
router.get('/my', permissionController.getMyPermissions);

// Routes admin uniquement
// POST /api/permissions/initialize - Initialiser les permissions par défaut
router.post('/initialize', authorize('admin'), permissionController.initializePermissions);

// GET /api/permissions - Obtenir toutes les permissions
router.get('/', authorize('admin'), permissionController.getAllPermissions);

// GET /api/permissions/roles - Obtenir les permissions de tous les rôles
router.get('/roles', authorize('admin'), permissionController.getAllRolesPermissions);

// GET /api/permissions/role/:role - Obtenir les permissions d'un rôle
router.get('/role/:role', authorize('admin'), permissionController.getRolePermissions);

// PUT /api/permissions/role/:role - Mettre à jour les permissions d'un rôle
router.put('/role/:role', authorize('admin'), permissionController.updateRolePermissions);

// GET /api/permissions/user/:userId - Obtenir les permissions d'un utilisateur
router.get('/user/:userId', authorize('admin'), permissionController.getUserPermissions);

// PUT /api/permissions/user/:userId - Mettre à jour les permissions d'un utilisateur
router.put('/user/:userId', authorize('admin'), permissionController.updateUserPermissions);

module.exports = router;
