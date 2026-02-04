module.exports = (sequelize, DataTypes) => {
  const FraudAttempt = sequelize.define('FraudAttempt', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    attemptType: {
      type: DataTypes.ENUM(
        'gps_spoofing',
        'photo_spoofing',
        'video_spoofing',
        'screen_spoofing',
        'document_forgery',
        'multiple_device',
        'out_of_zone',
        'time_manipulation',
        'identity_mismatch',
        'root_device',
        'vpn_detected',
        'other'
      ),
      allowNull: false
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Donnees techniques'
    },
    evidencePhoto: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'Capture ecran/photo base64'
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    deviceFingerprint: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    actionTaken: {
      type: DataTypes.ENUM('blocked', 'warned', 'logged', 'escalated', 'ignored'),
      defaultValue: 'logged'
    },
    blockedUntil: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reviewNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isResolved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resolvedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    resolution: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'fraud_attempts',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['event_id'] },
      { fields: ['attempt_type'] },
      { fields: ['severity'] },
      { fields: ['created_at'] }
    ]
  });

  // Verifier si un utilisateur est bloque
  FraudAttempt.isUserBlocked = async function(userId) {
    const block = await this.findOne({
      where: {
        userId,
        actionTaken: 'blocked',
        blockedUntil: { [sequelize.Sequelize.Op.gt]: new Date() }
      },
      order: [['blockedUntil', 'DESC']]
    });

    return block ? {
      blocked: true,
      until: block.blockedUntil,
      reason: block.attemptType
    } : { blocked: false };
  };

  // Obtenir le nombre de tentatives recentes
  FraudAttempt.getRecentAttempts = async function(userId, hours = 24) {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    return this.count({
      where: {
        userId,
        createdAt: { [sequelize.Sequelize.Op.gte]: since }
      }
    });
  };

  // Enregistrer une tentative de fraude
  FraudAttempt.record = async function(data) {
    const attempt = await this.create(data);

    // Determiner l'action selon la severite et le nombre de tentatives
    const recentCount = await this.getRecentAttempts(data.userId, 24);

    let action = 'logged';
    let blockedUntil = null;

    if (data.severity === 'critical' || recentCount >= 5) {
      action = 'blocked';
      blockedUntil = new Date();
      blockedUntil.setHours(blockedUntil.getHours() + 24); // Blocage 24h
    } else if (data.severity === 'high' || recentCount >= 3) {
      action = 'escalated';
    } else if (recentCount >= 2) {
      action = 'warned';
    }

    if (action !== 'logged') {
      await attempt.update({ actionTaken: action, blockedUntil });
    }

    return attempt;
  };

  return FraudAttempt;
};
