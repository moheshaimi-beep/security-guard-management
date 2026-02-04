/**
 * Face Recognition Routes
 * API endpoints for facial recognition system
 */

const express = require('express');
const router = express.Router();
const faceRecognitionController = require('../controllers/faceRecognitionController');
const { authenticate, authorize } = require('../middlewares/auth');

// Initialize models (admin only)
router.post('/initialize', authenticate, authorize('admin'), faceRecognitionController.initialize);

// Face registration
router.post('/register', authenticate, faceRecognitionController.registerFace);

// Face verification (for attendance)
router.post('/verify', authenticate, faceRecognitionController.verifyFace);

// Face identification (1:N matching) - admin/supervisor only
router.post('/identify', authenticate, authorize('admin', 'supervisor'), faceRecognitionController.identifyFace);

// Face detection (analyze image)
router.post('/detect', authenticate, faceRecognitionController.detectFaces);

// Delete face registration
router.delete('/registration/:userId', authenticate, authorize('admin'), faceRecognitionController.deleteFaceRegistration);

// Statistics and monitoring
router.get('/stats', authenticate, authorize('admin', 'supervisor'), faceRecognitionController.getStats);
router.get('/anomalies', authenticate, authorize('admin', 'supervisor'), faceRecognitionController.getAnomalies);

// Backup and recovery (admin only)
router.get('/export', authenticate, authorize('admin'), faceRecognitionController.exportFaceData);
router.post('/import', authenticate, authorize('admin'), faceRecognitionController.importFaceData);

// Settings (admin only)
router.post('/threshold', authenticate, authorize('admin'), faceRecognitionController.adjustThreshold);

module.exports = router;
