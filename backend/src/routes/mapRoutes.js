/**
 * Routes pour l'API de la carte intelligente
 */

const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController');
const { authenticate, authorize } = require('../middlewares/auth');

/**
 * GET /api/map/events
 * Obtenir tous les événements pour la carte avec filtres
 * Query params: status, priority, search, includeCompleted, startDate, endDate
 */
router.get('/events', authenticate, mapController.getMapEvents);

/**
 * GET /api/map/agents  
 * Obtenir les agents avec leurs positions GPS
 * Query params: includeOffline, eventId
 */
router.get('/agents', authenticate, mapController.getMapAgents);

/**
 * GET /api/map/events/:id
 * Obtenir les détails complets d'un événement
 */
router.get('/events/:id', authenticate, mapController.getEventDetails);

/**
 * GET /api/map/stats
 * Obtenir les statistiques globales pour la carte
 */
router.get('/stats', authenticate, mapController.getMapStats);

/**
 * GET /api/map/nearby
 * Rechercher des événements et agents à proximité d'un point
 * Query params: latitude, longitude, radius
 */
router.get('/nearby', authenticate, mapController.getNearbyLocations);

module.exports = router;