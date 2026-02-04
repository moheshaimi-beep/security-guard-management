const express = require('express');
const router = express.Router();
const quickAddController = require('../controllers/quickAddController');
const { authenticate, authorize } = require('../middlewares/auth');

// Toutes les routes necessitent une authentification
router.use(authenticate);

// POST /api/quick-add/agent - Ajout rapide d'un agent
router.post('/agent', authorize('admin', 'supervisor'), quickAddController.quickAddAgent);

// GET /api/quick-add/pending - Agents en attente de validation
router.get('/pending', authorize('admin'), quickAddController.getPendingAgents);

// PUT /api/quick-add/validate/:agentId - Valider/rejeter un agent
router.put('/validate/:agentId', authorize('admin'), quickAddController.validateAgent);

// GET /api/quick-add/stats - Statistiques des agents
router.get('/stats', authorize('admin'), quickAddController.getAgentStats);

module.exports = router;
