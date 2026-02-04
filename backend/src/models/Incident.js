module.exports = (sequelize, DataTypes) => {
  const Incident = sequelize.define('Incident', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    reportedBy: {
      type: DataTypes.UUID,
      allowNull: false
    },
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM(
        'security_breach',
        'medical_emergency',
        'fire_alarm',
        'theft',
        'vandalism',
        'trespassing',
        'suspicious_activity',
        'equipment_failure',
        'access_issue',
        'violence',
        'other'
      ),
      allowNull: false
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium'
    },
    status: {
      type: DataTypes.ENUM('reported', 'investigating', 'resolved', 'escalated', 'closed'),
      defaultValue: 'reported'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    location: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    photos: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of photo URLs/base64'
    },
    witnesses: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of witness info'
    },
    actionsTaken: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    policeReport: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Police report number if applicable'
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
    },
    followUpRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    followUpDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    followUpNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'incidents',
    timestamps: true,
    paranoid: true
  });

  Incident.associate = (models) => {
    Incident.belongsTo(models.Event, {
      foreignKey: 'eventId',
      as: 'event'
    });
    Incident.belongsTo(models.User, {
      foreignKey: 'reportedBy',
      as: 'reporter'
    });
    Incident.belongsTo(models.User, {
      foreignKey: 'assignedTo',
      as: 'assignee'
    });
    Incident.belongsTo(models.User, {
      foreignKey: 'resolvedBy',
      as: 'resolver'
    });
    // Association avec Zone - le champ location contient le nom de la zone
    // On utilise location comme clé virtuelle pour permettre une association flexible
  };

  return Incident;
};
