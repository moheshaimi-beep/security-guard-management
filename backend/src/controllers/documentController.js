const { UserDocument, User } = require('../models');
const { Op } = require('sequelize');
const { logActivity } = require('../middlewares/activityLogger');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Configuration des documents
const DOCUMENT_CONFIG = {
  cin_recto: { label: 'CIN Recto', maxSize: 5 * 1024 * 1024, required: false },
  cin_verso: { label: 'CIN Verso', maxSize: 5 * 1024 * 1024, required: false },
  photo: { label: 'Photo d\'identite', maxSize: 2 * 1024 * 1024, required: false },
  cv: { label: 'CV', maxSize: 10 * 1024 * 1024, required: false },
  fiche_anthropometrique: { label: 'Fiche anthropometrique', maxSize: 5 * 1024 * 1024, required: false },
  permis: { label: 'Permis de conduire', maxSize: 5 * 1024 * 1024, required: false },
  diplome: { label: 'Diplome', maxSize: 10 * 1024 * 1024, required: false },
  autre: { label: 'Autre document', maxSize: 10 * 1024 * 1024, required: false }
};

const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png'
];

// Creer le dossier uploads si necessaire
const ensureUploadDir = async () => {
  const uploadDir = path.join(__dirname, '../../uploads/documents');
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
  return uploadDir;
};

// Get documents for a user
exports.getUserDocuments = async (req, res) => {
  try {
    const { userId } = req.params;

    const documents = await UserDocument.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'verifier',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Get user documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recuperation des documents'
    });
  }
};

// Get single document with content
exports.getDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await UserDocument.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'uploader', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouve'
      });
    }

    res.json({
      success: true,
      data: {
        ...document.toJSON(),
        fileContent: document.fileContent // Inclure le contenu pour la preview
      }
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recuperation du document'
    });
  }
};

// Upload documents for a user (can be called during user creation or after)
exports.uploadDocuments = async (req, res) => {
  try {
    const { userId } = req.params;
    const { documents } = req.body;

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun document fourni'
      });
    }

    // Verifier que l'utilisateur existe
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouve'
      });
    }

    const uploadDir = await ensureUploadDir();
    const uploadedDocs = [];
    const errors = [];

    for (const doc of documents) {
      try {
        // Validation du type de document
        if (!DOCUMENT_CONFIG[doc.documentType]) {
          errors.push({ file: doc.originalFilename, error: 'Type de document invalide' });
          continue;
        }

        // Validation de l'extension
        const ext = doc.fileExtension?.toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          errors.push({ file: doc.originalFilename, error: `Extension non autorisee: ${ext}` });
          continue;
        }

        // Validation du type MIME
        if (!ALLOWED_MIME_TYPES.includes(doc.mimeType)) {
          errors.push({ file: doc.originalFilename, error: `Type MIME non autorise: ${doc.mimeType}` });
          continue;
        }

        // Validation de la taille
        const config = DOCUMENT_CONFIG[doc.documentType];
        if (doc.fileSize > config.maxSize) {
          errors.push({
            file: doc.originalFilename,
            error: `Taille maximale depassee (max: ${Math.round(config.maxSize / 1024 / 1024)}MB)`
          });
          continue;
        }

        // Generer un nom de fichier unique
        const storedFilename = `${uuidv4()}.${ext}`;
        const filePath = path.join(uploadDir, storedFilename);

        // Sauvegarder le fichier sur le disque si base64
        if (doc.fileContent) {
          // Extraire le contenu base64 (enlever le prefix data:...)
          const base64Data = doc.fileContent.replace(/^data:[^;]+;base64,/, '');
          await fs.writeFile(filePath, base64Data, 'base64');
        }

        // Creer l'enregistrement en base
        const userDocument = await UserDocument.create({
          userId,
          documentType: doc.documentType,
          customName: doc.customName || null,
          originalFilename: doc.originalFilename,
          storedFilename,
          filePath: `/uploads/documents/${storedFilename}`,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          fileExtension: ext,
          fileContent: doc.fileContent, // Stocker aussi en base64 pour preview rapide
          description: doc.description || null,
          isRequired: config.required,
          expiryDate: doc.expiryDate || null,
          uploadedBy: req.user.id
        });

        uploadedDocs.push(userDocument);

      } catch (docError) {
        console.error('Error processing document:', docError);
        errors.push({ file: doc.originalFilename, error: docError.message });
      }
    }

    // Log de l'activite
    if (uploadedDocs.length > 0) {
      await logActivity({
        userId: req.user.id,
        action: 'UPLOAD_DOCUMENTS',
        entityType: 'user_document',
        entityId: userId,
        description: `${uploadedDocs.length} document(s) uploade(s) pour ${user.firstName} ${user.lastName}`,
        newValues: { documentIds: uploadedDocs.map(d => d.id) },
        req
      });
    }

    res.status(201).json({
      success: true,
      message: `${uploadedDocs.length} document(s) uploade(s) avec succes`,
      data: {
        uploaded: uploadedDocs,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('Upload documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload des documents',
      error: error.message
    });
  }
};

// Upload documents during user creation (returns document data without saving)
exports.prepareDocumentsForCreation = (documents, uploaderId) => {
  if (!documents || !Array.isArray(documents)) return { prepared: [], errors: [] };

  const prepared = [];
  const errors = [];

  for (const doc of documents) {
    // Validation du type de document
    if (!DOCUMENT_CONFIG[doc.documentType]) {
      errors.push({ file: doc.originalFilename, error: 'Type de document invalide' });
      continue;
    }

    // Validation de l'extension
    const ext = doc.fileExtension?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      errors.push({ file: doc.originalFilename, error: `Extension non autorisee: ${ext}` });
      continue;
    }

    // Validation du type MIME
    if (!ALLOWED_MIME_TYPES.includes(doc.mimeType)) {
      errors.push({ file: doc.originalFilename, error: `Type MIME non autorise: ${doc.mimeType}` });
      continue;
    }

    // Validation de la taille
    const config = DOCUMENT_CONFIG[doc.documentType];
    if (doc.fileSize > config.maxSize) {
      errors.push({
        file: doc.originalFilename,
        error: `Taille maximale depassee (max: ${Math.round(config.maxSize / 1024 / 1024)}MB)`
      });
      continue;
    }

    prepared.push({
      ...doc,
      storedFilename: `${uuidv4()}.${ext}`,
      isRequired: config.required,
      uploadedBy: uploaderId
    });
  }

  return { prepared, errors };
};

// Save prepared documents after user creation
exports.saveDocumentsAfterUserCreation = async (userId, preparedDocuments, uploaderId) => {
  if (!preparedDocuments || preparedDocuments.length === 0) return [];

  const uploadDir = await ensureUploadDir();
  const savedDocs = [];

  for (const doc of preparedDocuments) {
    try {
      const filePath = path.join(uploadDir, doc.storedFilename);

      // Sauvegarder le fichier sur le disque si base64
      if (doc.fileContent) {
        const base64Data = doc.fileContent.replace(/^data:[^;]+;base64,/, '');
        await fs.writeFile(filePath, base64Data, 'base64');
      }

      // Creer l'enregistrement en base
      const userDocument = await UserDocument.create({
        userId,
        documentType: doc.documentType,
        customName: doc.customName || null,
        originalFilename: doc.originalFilename,
        storedFilename: doc.storedFilename,
        filePath: `/uploads/documents/${doc.storedFilename}`,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        fileExtension: doc.fileExtension,
        fileContent: doc.fileContent,
        description: doc.description || null,
        isRequired: doc.isRequired,
        expiryDate: doc.expiryDate || null,
        uploadedBy: uploaderId
      });

      savedDocs.push(userDocument);
    } catch (error) {
      console.error('Error saving document:', error);
    }
  }

  return savedDocs;
};

// Update document
exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, expiryDate, customName } = req.body;

    const document = await UserDocument.findByPk(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouve'
      });
    }

    const oldValues = document.toJSON();

    if (description !== undefined) document.description = description;
    if (expiryDate !== undefined) document.expiryDate = expiryDate;
    if (customName !== undefined && document.documentType === 'autre') {
      document.customName = customName;
    }

    await document.save();

    await logActivity({
      userId: req.user.id,
      action: 'UPDATE_DOCUMENT',
      entityType: 'user_document',
      entityId: document.id,
      description: `Document ${document.originalFilename} mis a jour`,
      oldValues,
      newValues: document.toJSON(),
      req
    });

    res.json({
      success: true,
      message: 'Document mis a jour',
      data: document
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise a jour du document'
    });
  }
};

// Verify/Approve document (admin only)
exports.verifyDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide'
      });
    }

    const document = await UserDocument.findByPk(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouve'
      });
    }

    document.status = status;
    document.isVerified = status === 'approved';
    document.verifiedBy = req.user.id;
    document.verifiedAt = new Date();

    if (status === 'rejected' && rejectionReason) {
      document.rejectionReason = rejectionReason;
    }

    await document.save();

    await logActivity({
      userId: req.user.id,
      action: status === 'approved' ? 'APPROVE_DOCUMENT' : 'REJECT_DOCUMENT',
      entityType: 'user_document',
      entityId: document.id,
      description: `Document ${document.originalFilename} ${status === 'approved' ? 'approuve' : 'rejete'}`,
      req
    });

    res.json({
      success: true,
      message: `Document ${status === 'approved' ? 'approuve' : 'rejete'}`,
      data: document
    });
  } catch (error) {
    console.error('Verify document error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la verification du document'
    });
  }
};

// Delete document
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await UserDocument.findByPk(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouve'
      });
    }

    // Supprimer le fichier physique
    try {
      const fullPath = path.join(__dirname, '../..', document.filePath);
      await fs.unlink(fullPath);
    } catch (fileError) {
      console.warn('Could not delete file:', fileError.message);
    }

    const docInfo = document.toJSON();
    await document.destroy(); // Soft delete

    await logActivity({
      userId: req.user.id,
      action: 'DELETE_DOCUMENT',
      entityType: 'user_document',
      entityId: id,
      description: `Document ${docInfo.originalFilename} supprime`,
      oldValues: docInfo,
      req
    });

    res.json({
      success: true,
      message: 'Document supprime'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du document'
    });
  }
};

// Get document types configuration
exports.getDocumentTypes = async (req, res) => {
  try {
    const types = Object.entries(DOCUMENT_CONFIG).map(([key, config]) => ({
      value: key,
      label: config.label,
      maxSize: config.maxSize,
      maxSizeMB: Math.round(config.maxSize / 1024 / 1024),
      required: config.required
    }));

    res.json({
      success: true,
      data: {
        types,
        allowedExtensions: ALLOWED_EXTENSIONS,
        allowedMimeTypes: ALLOWED_MIME_TYPES
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recuperation des types de documents'
    });
  }
};

// Download document
exports.downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await UserDocument.findByPk(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouve'
      });
    }

    const fullPath = path.join(__dirname, '../..', document.filePath);

    // Verifier que le fichier existe
    try {
      await fs.access(fullPath);
    } catch {
      // Si le fichier n'existe pas sur le disque, renvoyer le contenu base64
      if (document.fileContent) {
        const base64Data = document.fileContent.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        res.setHeader('Content-Type', document.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${document.originalFilename}"`);
        return res.send(buffer);
      }

      return res.status(404).json({
        success: false,
        message: 'Fichier non trouve'
      });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${document.originalFilename}"`);
    res.sendFile(fullPath);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du telechargement du document'
    });
  }
};
