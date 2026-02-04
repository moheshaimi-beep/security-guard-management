module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    recipientId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'NULL si broadcast'
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    messageType: {
      type: DataTypes.ENUM('text', 'image', 'file', 'location', 'voice', 'system'),
      allowNull: false,
      defaultValue: 'text'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fileUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    fileMimeType: {
      type: DataTypes.STRING(100),
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
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isBroadcast: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isUrgent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    replyToId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Message en reponse'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'messages',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['conversation_id'] },
      { fields: ['sender_id'] },
      { fields: ['recipient_id'] },
      { fields: ['event_id'] },
      { fields: ['created_at'] }
    ]
  });

  // Formater pour le client
  Message.prototype.toJSON = function() {
    const values = { ...this.get() };
    // Ajouter le statut de lecture
    values.isRead = !!values.readAt;
    values.isDelivered = !!values.deliveredAt;
    return values;
  };

  return Message;
};
