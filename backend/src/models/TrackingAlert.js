const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TrackingAlert = sequelize.define('TrackingAlert', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  eventId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'events',
      key: 'id'
    }
  },
  alertType: {
    type: DataTypes.ENUM(
      'exit_zone',           // Sortie de zone
      'late_arrival',        // Arrivée en retard
      'low_battery',         // Batterie faible
      'connection_lost',     // Perte de connexion
      'no_movement',         // Pas de mouvement
      'high_speed',          // Vitesse élevée (suspect)
      'device_changed'       // Changement d'appareil
    ),
    allowNull: false
  },
  severity: {
    type: DataTypes.ENUM('critical', 'warning', 'info'),
    defaultValue: 'info'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  distanceFromZone: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Distance en mètres de la zone'
  },
  batteryLevel: {
    type: DataTypes.INTEGER,
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
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  resolution: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notificationSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'tracking_alerts',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['eventId']
    },
    {
      fields: ['alertType']
    },
    {
      fields: ['severity']
    },
    {
      fields: ['isResolved']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = TrackingAlert;
