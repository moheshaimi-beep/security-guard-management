module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define('Permission', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    code: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false,
      comment: 'Code unique de la permission (ex: users.create, events.view)'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nom lisible de la permission'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description de la permission'
    },
    module: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Module auquel appartient la permission (users, events, etc.)'
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Action (view, create, update, delete, manage)'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'permissions',
    timestamps: true,
    indexes: [
      { fields: ['module'] },
      { fields: ['code'], unique: true }
    ]
  });

  return Permission;
};
