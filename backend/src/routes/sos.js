const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sosController');
const { authenticate, authorize } = require('../middlewares/auth');

// Toutes les routes necessitent une authentification
router.use(authenticate);

// POST /api/sos/trigger - Declencher une alerte SOS
router.post('/trigger', sosController.triggerSOS);

// GET /api/sos/active - Obtenir les alertes actives
router.get('/active', authorize('admin', 'supervisor'), sosController.getActiveAlerts);

// PUT /api/sos/:alertId/acknowledge - Accuser reception
router.put('/:alertId/acknowledge', authorize('admin', 'supervisor'), sosController.acknowledgeAlert);

// PUT /api/sos/:alertId/respond - Marquer comme en intervention
router.put('/:alertId/respond', authorize('admin', 'supervisor'), sosController.respondToAlert);

// PUT /api/sos/:alertId/resolve - Resoudre l'alerte
router.put('/:alertId/resolve', authorize('admin', 'supervisor'), sosController.resolveAlert);

// GET /api/sos/history - Historique des alertes
router.get('/history', sosController.getAlertHistory);

// GET /api/sos/stats - Statistiques
router.get('/stats', authorize('admin', 'supervisor'), sosController.getAlertStats);

module.exports = router;
