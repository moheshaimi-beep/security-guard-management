module.exports = (sequelize, DataTypes) => {
  const UserPermission = sequelize.define('UserPermission', {
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
    permissionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'permissions',
        key: 'id'
      }
    },
    granted: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'true = permission accordée, false = permission explicitement refusée'
    },
    grantedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Admin qui a accordé/refusé cette permission'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date d\'expiration de la permission (optionnel)'
    }
  }, {
    tableName: 'user_permissions',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['permissionId'] },
      { fields: ['userId', 'permissionId'], unique: true }
    ]
  });

  return UserPermission;
};
