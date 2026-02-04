const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const { authenticate, authorize } = require('../middlewares/auth');

// Toutes les routes necessitent une authentification
router.use(authenticate);

// POST /api/tracking/location - Enregistrer une position
router.post('/location', trackingController.recordLocation);

// POST /api/tracking/validate - Valider une position par rapport a un evenement
router.post('/validate', trackingController.validatePosition);

// GET /api/tracking/user/:userId/history - Historique des positions d'un utilisateur
router.get('/user/:userId/history', trackingController.getUserHistory);

// GET /api/tracking/event/:eventId/live - Positions en temps reel pour un evenement
router.get('/event/:eventId/live', authorize('admin', 'supervisor'), trackingController.getEventLivePositions);

// GET /api/tracking/all/live - Toutes les positions en temps reel (admin)
router.get('/all/live', authorize('admin'), trackingController.getAllLivePositions);

// NEW ROUTES - Suivi temps réel et alertes
// GET /api/tracking/realtime/:eventId - Positions temps réel pour un événement
router.get('/realtime/:eventId', authorize('admin', 'supervisor'), trackingController.getRealtimePositions);

// GET /api/tracking/alerts - Récupérer les alertes de tracking
router.get('/alerts', authorize('admin', 'supervisor'), trackingController.getTrackingAlerts);

// PATCH /api/tracking/alerts/:alertId/resolve - Résoudre une alerte
router.patch('/alerts/:alertId/resolve', authorize('admin', 'supervisor'), trackingController.resolveAlert);

module.exports = router;
