module.exports = (sequelize, DataTypes) => {
  const UserDocument = sequelize.define('UserDocument', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'ID de l\'utilisateur propriétaire du document'
    },
    documentType: {
      type: DataTypes.ENUM(
        'cin_recto',
        'cin_verso',
        'photo',
        'cv',
        'fiche_anthropometrique',
        'permis',
        'diplome',
        'autre'
      ),
      allowNull: false,
      comment: 'Type de document'
    },
    customName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Nom personnalisé pour les documents de type "autre"'
    },
    originalFilename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nom original du fichier uploadé'
    },
    storedFilename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nom du fichier stocké (UUID)'
    },
    filePath: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Chemin complet du fichier'
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Taille du fichier en bytes'
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Type MIME du fichier'
    },
    fileExtension: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: 'Extension du fichier'
    },
    fileContent: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'Contenu base64 du fichier (optionnel)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description ou commentaire du document'
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Document obligatoire ou facultatif'
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Document vérifié par un admin'
    },
    verifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID de l\'admin qui a vérifié'
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date de vérification'
    },
    expiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date d\'expiration du document'
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
      comment: 'Statut de validation du document'
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Raison du rejet si applicable'
    },
    uploadedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'ID de l\'utilisateur qui a uploadé'
    }
  }, {
    tableName: 'user_documents',
    timestamps: true,
    paranoid: true, // Soft deletes
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['document_type'] },
      { fields: ['status'] },
      { fields: ['created_at'] }
    ]
  });

  // Instance method to get document info without file content
  UserDocument.prototype.toJSON = function() {
    const values = { ...this.get() };
    // Ne pas inclure le contenu base64 dans les réponses JSON par défaut
    delete values.fileContent;
    return values;
  };

  // Get document type label in French
  UserDocument.prototype.getTypeLabel = function() {
    const labels = {
      'cin_recto': 'CIN Recto',
      'cin_verso': 'CIN Verso',
      'photo': 'Photo d\'identité',
      'cv': 'CV',
      'fiche_anthropometrique': 'Fiche anthropométrique',
      'permis': 'Permis de conduire',
      'diplome': 'Diplôme',
      'autre': this.customName || 'Autre document'
    };
    return labels[this.documentType] || this.documentType;
  };

  // Check if document is expired
  UserDocument.prototype.isExpired = function() {
    if (!this.expiryDate) return false;
    return new Date(this.expiryDate) < new Date();
  };

  return UserDocument;
};
