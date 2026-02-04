const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GpsTracking = sequelize.define('GpsTracking', {
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
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false
  },
  accuracy: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Précision en mètres'
  },
  altitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  speed: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Vitesse en m/s'
  },
  heading: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Direction en degrés'
  },
  batteryLevel: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  isCharging: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  deviceInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Infos appareil: nom, modèle, OS, etc.'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  macAddress: {
    type: DataTypes.STRING(17),
    allowNull: true
  },
  isInsideGeofence: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  distanceFromEvent: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Distance en mètres de l\'événement'
  },
  trackingType: {
    type: DataTypes.ENUM('auto', 'manual', 'background', 'checkin', 'checkout'),
    defaultValue: 'auto'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Agent toujours actif sur le terrain'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'gps_tracking',
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
      fields: ['createdAt']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['userId', 'eventId', 'createdAt']
    }
  ]
});

module.exports = GpsTracking;
