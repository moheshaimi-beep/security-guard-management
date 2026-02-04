module.exports = (sequelize, DataTypes) => {
  const GeoTracking = sequelize.define('GeoTracking', {
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
      allowNull: true,
      comment: 'Precision en metres'
    },
    altitude: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true
    },
    speed: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      comment: 'Vitesse en km/h'
    },
    heading: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Direction 0-360 degres'
    },
    batteryLevel: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    isMockLocation: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Detection GPS spoofing'
    },
    networkType: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'wifi, 4g, 5g, etc.'
    },
    cellTowerInfo: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Info triangulation'
    },
    isWithinGeofence: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    distanceFromEvent: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Distance en metres'
    },
    recordedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'geo_tracking',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['user_id', 'event_id'] },
      { fields: ['recorded_at'] },
      { fields: ['user_id', 'recorded_at'] }
    ]
  });

  // Methode pour detecter le GPS spoofing
  GeoTracking.detectSpoofing = async function(userId, newLocation) {
    const lastLocation = await this.findOne({
      where: { userId },
      order: [['recordedAt', 'DESC']]
    });

    if (!lastLocation) return { isSpoofed: false };

    const timeDiff = (new Date(newLocation.recordedAt) - new Date(lastLocation.recordedAt)) / 1000; // secondes
    if (timeDiff <= 0) return { isSpoofed: false };

    // Calculer la distance
    const R = 6371000; // Rayon terre en metres
    const lat1 = lastLocation.latitude * Math.PI / 180;
    const lat2 = newLocation.latitude * Math.PI / 180;
    const deltaLat = (newLocation.latitude - lastLocation.latitude) * Math.PI / 180;
    const deltaLon = (newLocation.longitude - lastLocation.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // en metres

    // Vitesse calculee en km/h
    const calculatedSpeed = (distance / timeDiff) * 3.6;

    // Flags de spoofing
    const flags = {
      teleportation: calculatedSpeed > 500, // Plus de 500 km/h = impossible
      mockLocation: newLocation.isMockLocation,
      lowAccuracy: newLocation.accuracy > 100, // Plus de 100m de precision = suspect
      impossibleSpeed: calculatedSpeed > 150 && timeDiff < 60 // Plus de 150km/h sur moins d'1 min
    };

    return {
      isSpoofed: flags.teleportation || flags.mockLocation || flags.impossibleSpeed,
      flags,
      calculatedSpeed,
      distance,
      timeDiff
    };
  };

  return GeoTracking;
};
