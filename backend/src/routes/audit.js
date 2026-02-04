const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticate, authorize } = require('../middlewares/auth');

/**
 * Routes pour l'audit trail et les logs
 * @route /api/audit
 */

// Toutes les routes nécessitent l'authentification et le rôle admin
router.use(authenticate);
router.use(authorize('admin'));

// Routes principales
router.get('/', auditController.getAllLogs);
router.get('/stats', auditController.getLogStats);
router.get('/types', auditController.getActionTypes);
router.get('/export', auditController.exportLogs);

// Gestion des logs
router.post('/purge', auditController.purgeLogs);
router.delete('/bulk', auditController.deleteLogs);

module.exports = router;
