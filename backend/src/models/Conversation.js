module.exports = (sequelize, DataTypes) => {
  const Conversation = sequelize.define('Conversation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('direct', 'group', 'event_broadcast'),
      allowNull: false,
      defaultValue: 'direct'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false
    },
    participants: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Liste des user_ids'
    },
    lastMessageId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isArchived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'conversations',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['event_id'] },
      { fields: ['created_by'] },
      { fields: ['last_message_at'] }
    ]
  });

  // Trouver ou creer une conversation directe entre deux utilisateurs
  Conversation.findOrCreateDirect = async function(user1Id, user2Id) {
    // Chercher une conversation existante
    const existing = await this.findOne({
      where: {
        type: 'direct',
        [sequelize.Sequelize.Op.or]: [
          { participants: JSON.stringify([user1Id, user2Id].sort()) },
          { participants: [user1Id, user2Id].sort() }
        ]
      }
    });

    if (existing) return { conversation: existing, created: false };

    // Creer nouvelle conversation
    const conversation = await this.create({
      type: 'direct',
      createdBy: user1Id,
      participants: [user1Id, user2Id].sort()
    });

    return { conversation, created: true };
  };

  // Obtenir les conversations d'un utilisateur
  Conversation.getForUser = async function(userId, options = {}) {
    const { includeArchived = false, eventId } = options;

    const where = {
      [sequelize.Sequelize.Op.or]: [
        { createdBy: userId },
        sequelize.where(
          sequelize.fn('JSON_CONTAINS', sequelize.col('participants'), JSON.stringify(userId)),
          true
        )
      ]
    };

    if (!includeArchived) {
      where.isArchived = false;
    }

    if (eventId) {
      where.eventId = eventId;
    }

    return this.findAll({
      where,
      order: [['lastMessageAt', 'DESC']],
      include: options.include || []
    });
  };

  return Conversation;
};
