const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const { authenticate, authorize } = require('../middlewares/auth');

// Toutes les routes nécessitent une authentification admin
router.use(authenticate);
router.use(authorize('admin'));

// Statistiques de la base de données
router.get('/database/stats', maintenanceController.getDatabaseStats);

// Nettoyage des utilisateurs supprimés
router.post('/cleanup/deleted-users', maintenanceController.cleanupDeletedUsers);

// Forcer la synchronisation
router.post('/sync/force', maintenanceController.forceSynchronization);

module.exports = router;