const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticate, authorize } = require('../middlewares/auth');

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// GET /api/documents/types - Récupérer les types de documents disponibles
router.get('/types', documentController.getDocumentTypes);

// GET /api/documents/user/:userId - Récupérer les documents d'un utilisateur
router.get('/user/:userId', documentController.getUserDocuments);

// GET /api/documents/:id - Récupérer un document spécifique
router.get('/:id', documentController.getDocument);

// GET /api/documents/:id/download - Télécharger un document
router.get('/:id/download', documentController.downloadDocument);

// POST /api/documents/user/:userId - Uploader des documents pour un utilisateur
router.post('/user/:userId', authorize('admin', 'supervisor'), documentController.uploadDocuments);

// PUT /api/documents/:id - Mettre à jour un document
router.put('/:id', authorize('admin', 'supervisor'), documentController.updateDocument);

// PUT /api/documents/:id/verify - Vérifier/Approuver un document (admin seulement)
router.put('/:id/verify', authorize('admin'), documentController.verifyDocument);

// DELETE /api/documents/:id - Supprimer un document
router.delete('/:id', authorize('admin'), documentController.deleteDocument);

module.exports = router;
