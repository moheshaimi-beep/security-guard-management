const express = require('express');
const router = express.Router();
const advancedNotificationController = require('../controllers/advancedNotificationController');
const { authenticate, authorize } = require('../middlewares/auth');

/**
 * Routes de gestion avancée des notifications (Admin uniquement)
 * @route /api/admin/notifications
 */

// Toutes les routes nécessitent l'authentification et le rôle admin
router.use(authenticate);
router.use(authorize('admin'));

// Dashboard et statistiques
router.get('/dashboard', advancedNotificationController.getNotificationDashboard);

// Utilitaires (AVANT les routes avec paramètres)
router.post('/test', advancedNotificationController.testNotification);
router.get('/types', advancedNotificationController.getNotificationTypes);
router.post('/verify-cins', advancedNotificationController.verifyCins);

// Gestion des notifications
router.get('/', advancedNotificationController.getAllNotifications);
router.post('/send', advancedNotificationController.sendCustomNotification);
router.post('/bulk-event', advancedNotificationController.sendBulkEventNotification);
router.delete('/bulk', advancedNotificationController.bulkDeleteNotifications);
router.post('/:id/retry', advancedNotificationController.retryFailedNotification);

// Préférences utilisateurs
router.get('/users/:userId/preferences', advancedNotificationController.getUserNotificationPreferences);
router.put('/users/:userId/preferences', advancedNotificationController.updateUserNotificationPreferences);
router.get('/users/:userId/history', advancedNotificationController.getUserNotificationHistory);

module.exports = router;
