/**
 * WhatsApp Routes
 * Routes pour l'integration WhatsApp
 */

const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const { authenticate, authorize } = require('../middlewares/auth');

// Toutes les routes necessitent une authentification
router.use(authenticate);

// Routes admin/supervisor uniquement
router.get('/status', authorize('admin', 'supervisor'), whatsappController.checkStatus);
router.get('/qrcode', authorize('admin'), whatsappController.getQRCode);
router.post('/init', authorize('admin'), whatsappController.initInstance);
router.post('/test', authorize('admin'), whatsappController.sendTestMessage);

// Notifications
router.post('/notify/assignment', authorize('admin', 'supervisor'), whatsappController.sendAssignmentNotification);
router.post('/notify/checkin-reminder', authorize('admin', 'supervisor'), whatsappController.sendCheckInReminder);
router.post('/notify/weekly-schedules', authorize('admin', 'supervisor'), whatsappController.sendWeeklySchedules);
router.post('/notify/daily-report', authorize('admin', 'supervisor'), whatsappController.sendDailyReports);

// Alertes
router.post('/alert/sos', whatsappController.sendSOSAlert);

// Broadcast
router.post('/broadcast', authorize('admin'), whatsappController.broadcastMessage);

module.exports = router;
