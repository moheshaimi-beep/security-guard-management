module.exports = (sequelize, DataTypes) => {
  const Badge = sequelize.define('Badge', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Emoji or icon name'
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: '#3B82F6'
    },
    category: {
      type: DataTypes.ENUM('performance', 'attendance', 'experience', 'special', 'training'),
      defaultValue: 'performance'
    },
    criteria: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Auto-award criteria'
    },
    points: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      comment: 'Points awarded with this badge'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'badges',
    timestamps: true
  });

  return Badge;
};

// UserBadge join table
module.exports.UserBadgeModel = (sequelize, DataTypes) => {
  const UserBadge = sequelize.define('UserBadge', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    badgeId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    awardedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    awardedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'user_badges',
    timestamps: true
  });

  return UserBadge;
};
