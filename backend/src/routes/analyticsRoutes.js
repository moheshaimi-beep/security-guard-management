/**
 * Analytics Routes
 * Routes pour l'analytique et les predictions IA
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middlewares/auth');

// Toutes les routes necessitent une authentification
router.use(authenticate);

// Dashboard analytique
router.get('/dashboard', authorize('admin', 'supervisor'), analyticsController.getDashboard);

// Analyse des agents
router.get('/agents/:agentId/patterns', authorize('admin', 'supervisor'), analyticsController.getAgentPatterns);
router.get('/agents/:agentId/risk', authorize('admin', 'supervisor'), analyticsController.predictAbsenceRisk);
router.get('/agents/at-risk', authorize('admin', 'supervisor'), analyticsController.getAgentsAtRisk);
router.post('/agents/compare', authorize('admin', 'supervisor'), analyticsController.compareAgents);

// Analyse des incidents
router.get('/incidents/hotspots', authorize('admin', 'supervisor'), analyticsController.getIncidentHotspots);

// Predictions
router.get('/events/:eventId/staffing', authorize('admin', 'supervisor'), analyticsController.predictStaffingNeeds);

// Tendances
router.get('/attendance/trends', authorize('admin', 'supervisor'), analyticsController.getAttendanceTrends);

// Rapports
router.get('/reports/performance', authorize('admin', 'supervisor'), analyticsController.generatePerformanceReport);

module.exports = router;
