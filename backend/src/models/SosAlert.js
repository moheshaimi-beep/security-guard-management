module.exports = (sequelize, DataTypes) => {
  const SosAlert = sequelize.define('SosAlert', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    alertType: {
      type: DataTypes.ENUM('sos', 'medical', 'security', 'fire', 'other'),
      allowNull: false,
      defaultValue: 'sos'
    },
    status: {
      type: DataTypes.ENUM('active', 'acknowledged', 'responding', 'resolved', 'false_alarm'),
      allowNull: false,
      defaultValue: 'active'
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false
    },
    accuracy: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true
    },
    photo: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    voiceNoteUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    acknowledgedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    acknowledgedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resolvedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resolutionNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    responseTimeSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'sos_alerts',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['event_id'] },
      { fields: ['status'] },
      { fields: ['created_at'] }
    ]
  });

  // Obtenir les alertes actives
  SosAlert.getActive = async function(eventId = null) {
    const where = {
      status: { [sequelize.Sequelize.Op.in]: ['active', 'acknowledged', 'responding'] }
    };

    if (eventId) {
      where.eventId = eventId;
    }

    return this.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'phone', 'profilePhoto']
        }
      ]
    });
  };

  // Accuser reception
  SosAlert.prototype.acknowledge = async function(acknowledgedById) {
    const now = new Date();
    const responseTime = Math.floor((now - this.createdAt) / 1000);

    await this.update({
      status: 'acknowledged',
      acknowledgedBy: acknowledgedById,
      acknowledgedAt: now,
      responseTimeSeconds: responseTime
    });

    return this;
  };

  // Resoudre l'alerte
  SosAlert.prototype.resolve = async function(resolvedById, notes, isFalseAlarm = false) {
    await this.update({
      status: isFalseAlarm ? 'false_alarm' : 'resolved',
      resolvedBy: resolvedById,
      resolvedAt: new Date(),
      resolutionNotes: notes
    });

    return this;
  };

  return SosAlert;
};
