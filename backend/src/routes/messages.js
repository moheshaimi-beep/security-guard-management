const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticate, authorize } = require('../middlewares/auth');

// Toutes les routes necessitent une authentification
router.use(authenticate);

// GET /api/messages/conversations - Obtenir les conversations
router.get('/conversations', messageController.getConversations);

// POST /api/messages/conversations/direct - Creer/obtenir conversation directe
router.post('/conversations/direct', messageController.getOrCreateDirectConversation);

// GET /api/messages/conversation/:conversationId - Obtenir les messages d'une conversation
router.get('/conversation/:conversationId', messageController.getMessages);

// POST /api/messages/send - Envoyer un message
router.post('/send', messageController.sendMessage);

// POST /api/messages/send-file - Envoyer un message avec fichier
router.post('/send-file', messageController.sendMessageWithFile);

// POST /api/messages/broadcast - Broadcast a un evenement
router.post('/broadcast', authorize('admin', 'supervisor'), messageController.broadcastToEvent);

// PUT /api/messages/:messageId/read - Marquer comme lu
router.put('/:messageId/read', messageController.markAsRead);

// GET /api/messages/all - Tous les messages (admin audit)
router.get('/all', authorize('admin'), messageController.getAllMessages);

module.exports = router;
