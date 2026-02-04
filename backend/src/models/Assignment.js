module.exports = (sequelize, DataTypes) => {
  const Assignment = sequelize.define('Assignment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    agentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'events',
        key: 'id'
      }
    },
    assignedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    zoneId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'zones',
        key: 'id'
      },
      comment: 'Zone spécifique dans l\'événement (optionnel)'
    },
    role: {
      type: DataTypes.ENUM('primary', 'backup', 'supervisor'),
      defaultValue: 'primary'
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'declined', 'cancelled'),
      defaultValue: 'pending'
    },
    confirmedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notificationSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    notificationSentAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'assignments',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['agentId', 'eventId', 'zoneId'],
        where: {
          deletedAt: null
        },
        comment: 'Un agent/superviseur peut être affecté à plusieurs zones du même événement'
      }
    ]
  });

  return Assignment;
};
