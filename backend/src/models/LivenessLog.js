module.exports = (sequelize, DataTypes) => {
  const LivenessLog = sequelize.define('LivenessLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    checkType: {
      type: DataTypes.ENUM('facial', 'document', 'combined'),
      allowNull: false
    },
    sessionId: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    result: {
      type: DataTypes.ENUM('passed', 'failed', 'inconclusive', 'timeout'),
      allowNull: false
    },
    confidenceScore: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true
    },
    checksPerformed: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Details des verifications effectuees'
    },
    failureReasons: {
      type: DataTypes.JSON,
      allowNull: true
    },
    framesAnalyzed: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    deviceInfo: {
      type: DataTypes.JSON,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING(45),
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
    durationMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duree verification en ms'
    }
  }, {
    tableName: 'liveness_logs',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['created_at'] },
      { fields: ['result'] }
    ]
  });

  // Obtenir les statistiques de liveness pour un utilisateur
  LivenessLog.getStatsForUser = async function(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.findAll({
      where: {
        userId,
        createdAt: { [sequelize.Sequelize.Op.gte]: startDate }
      },
      attributes: [
        'result',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('AVG', sequelize.col('confidence_score')), 'avgConfidence']
      ],
      group: ['result']
    });

    return logs.reduce((acc, log) => {
      acc[log.result] = {
        count: parseInt(log.get('count')),
        avgConfidence: parseFloat(log.get('avgConfidence')) || 0
      };
      return acc;
    }, {});
  };

  return LivenessLog;
};
