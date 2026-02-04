const express = require('express');
const router = express.Router();
const zoneController = require('../controllers/zoneController');
const { authenticate, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// Get zones for an event
router.get('/event/:eventId', zoneController.getZonesByEvent);

// Get zone statistics for an event
router.get('/event/:eventId/stats', zoneController.getEventZoneStats);

// Get single zone
router.get('/:id', zoneController.getZoneById);

// Create zone (admin/supervisor only)
router.post('/', authorize('admin', 'supervisor'), zoneController.createZone);

// Bulk create zones (admin/supervisor only)
router.post('/bulk', authorize('admin', 'supervisor'), zoneController.createBulkZones);

// Update zone (admin/supervisor only)
router.put('/:id', authorize('admin', 'supervisor'), zoneController.updateZone);

// Delete zone (admin/supervisor only)
router.delete('/:id', authorize('admin', 'supervisor'), zoneController.deleteZone);

module.exports = router;
