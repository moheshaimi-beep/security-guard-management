const { Notification, User, Event, Assignment, Attendance } = require('../models');
const { Op } = require('sequelize');
const advancedNotificationService = require('../services/advancedNotificationService');

/**
 * Contrôleur de notifications avancées pour les administrateurs
 * Gestion complète du système de notifications
 */

// Dashboard des notifications
exports.getNotificationDashboard = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Statistiques globales
    const [
      totalNotifications,
      sentNotifications,
      failedNotifications,
      pendingNotifications,
      readNotifications
    ] = await Promise.all([
      Notification.count({ where: dateFilter }),
      Notification.count({ where: { ...dateFilter, status: { [Op.in]: ['sent', 'delivered'] } } }),
      Notification.count({ where: { ...dateFilter, status: 'failed' } }),
      Notification.count({ where: { ...dateFilter, status: 'pending' } }),
      Notification.count({ where: { ...dateFilter, status: 'read' } })
    ]);

    // Statistiques par canal
    const channelStats = await Notification.findAll({
      where: dateFilter,
      attributes: [
        'channel',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
        [require('sequelize').fn('SUM', require('sequelize').literal("CASE WHEN status IN ('sent', 'delivered', 'read') THEN 1 ELSE 0 END")), 'successful']
      ],
      group: ['channel']
    });

    // Statistiques par type
    const typeStats = await Notification.findAll({
      where: dateFilter,
      attributes: [
        'type',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['type']
    });

    // Statistiques par priorité
    const priorityStats = await Notification.findAll({
      where: dateFilter,
      attributes: [
        'priority',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['priority']
    });

    // Taux de réussite
    const successRate = totalNotifications > 0 
      ? Math.round((sentNotifications / totalNotifications) * 100) 
      : 0;

    // Taux de lecture
    const readRate = totalNotifications > 0 
      ? Math.round((readNotifications / totalNotifications) * 100) 
      : 0;

    // Dernières notifications échouées
    const recentFailures = await Notification.findAll({
      where: { ...dateFilter, status: 'failed' },
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Notifications les plus populaires
    const popularNotifications = await Notification.findAll({
      where: dateFilter,
      attributes: [
        'type',
        'title',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['type', 'title'],
      order: [[require('sequelize').literal('count'), 'DESC']],
      limit: 5
    });

    res.json({
      success: true,
      data: {
        summary: {
          total: totalNotifications,
          sent: sentNotifications,
          failed: failedNotifications,
          pending: pendingNotifications,
          read: readNotifications,
          successRate,
          readRate
        },
        byChannel: channelStats,
        byType: typeStats,
        byPriority: priorityStats,
        recentFailures,
        popularNotifications
      }
    });
  } catch (error) {
    console.error('Notification dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du tableau de bord'
    });
  }
};

// Obtenir toutes les notifications avec filtres avancés
exports.getAllNotifications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      type,
      status,
      channel,
      priority,
      startDate,
      endDate,
      search
    } = req.query;

    const where = {};
    
    if (userId) where.userId = userId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (priority) where.priority = priority;
    
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { message: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Notification.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        notifications: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get all notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des notifications'
    });
  }
};

// Envoyer une notification personnalisée
exports.sendCustomNotification = async (req, res) => {
  try {
    const {
      userIds,
      cins,
      role,
      type = 'general',
      title,
      message,
      channels = ['in_app'],
      priority = 'normal',
      metadata = {}
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Le titre et le message sont requis'
      });
    }

    let targetUserIds = [];

    // Par CINs
    if (cins && Array.isArray(cins) && cins.length > 0) {
      const users = await User.findAll({
        where: { cin: cins, status: 'active' },
        attributes: ['id', 'cin', 'firstName', 'lastName']
      });
      
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Aucun utilisateur trouvé avec les CIN fournis'
        });
      }
      
      targetUserIds = users.map(u => u.id);
      
      // Log les utilisateurs trouvés
      console.log(`📧 Notifications envoyées à ${users.length} utilisateur(s) via CIN:`, 
        users.map(u => `${u.firstName} ${u.lastName} (${u.cin})`).join(', ')
      );
    }
    // Par userIds
    else if (userIds && Array.isArray(userIds)) {
      targetUserIds = userIds;
    }
    // Par rôle
    else if (role) {
      const users = await User.findAll({
        where: { role, status: 'active' },
        attributes: ['id']
      });
      targetUserIds = users.map(u => u.id);
    }
    // Tous les utilisateurs
    else {
      const users = await User.findAll({
        where: { status: 'active' },
        attributes: ['id']
      });
      targetUserIds = users.map(u => u.id);
    }

    if (targetUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun destinataire trouvé'
      });
    }

    // Envoyer les notifications
    const results = [];
    for (const userId of targetUserIds) {
      try {
        const notifications = await advancedNotificationService.createNotification({
          userId,
          type,
          title,
          message,
          channels,
          priority,
          metadata
        });
        results.push({
          userId,
          success: true,
          notificationCount: notifications.length
        });
      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Notifications envoyées: ${successCount} réussies, ${failureCount} échouées`,
      data: {
        total: targetUserIds.length,
        successful: successCount,
        failed: failureCount,
        details: results
      }
    });
  } catch (error) {
    console.error('Send custom notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi des notifications'
    });
  }
};

// Renvoyer une notification échouée
exports.retryFailedNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByPk(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification non trouvée'
      });
    }

    if (notification.status !== 'failed') {
      return res.status(400).json({
        success: false,
        message: 'Cette notification n\'est pas en échec'
      });
    }

    if (notification.retryCount >= notification.maxRetries) {
      return res.status(400).json({
        success: false,
        message: 'Nombre maximum de tentatives atteint'
      });
    }

    // Réinitialiser le statut et incrémenter le compteur
    await notification.update({
      status: 'pending',
      retryCount: notification.retryCount + 1,
      failureReason: null,
      failedAt: null
    });

    // Renvoyer via le service de notification
    const notificationService = require('../services/notificationService');
    await notificationService.sendViaChannel(notification.id, notification.channel);

    res.json({
      success: true,
      message: 'Notification renvoyée',
      data: notification
    });
  } catch (error) {
    console.error('Retry notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du renvoi de la notification'
    });
  }
};

// Supprimer des notifications en masse
exports.bulkDeleteNotifications = async (req, res) => {
  try {
    const { notificationIds, filters } = req.body;

    let deleted = 0;

    if (notificationIds && Array.isArray(notificationIds)) {
      // Suppression par IDs
      deleted = await Notification.destroy({
        where: { id: { [Op.in]: notificationIds } }
      });
    } else if (filters) {
      // Suppression par filtres
      const where = {};
      if (filters.status) where.status = filters.status;
      if (filters.type) where.type = filters.type;
      if (filters.channel) where.channel = filters.channel;
      if (filters.olderThan) {
        where.createdAt = {
          [Op.lt]: new Date(Date.now() - filters.olderThan * 24 * 60 * 60 * 1000)
        };
      }

      deleted = await Notification.destroy({ where });
    }

    res.json({
      success: true,
      message: `${deleted} notification(s) supprimée(s)`,
      data: { deleted }
    });
  } catch (error) {
    console.error('Bulk delete notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression des notifications'
    });
  }
};

// Obtenir les préférences de notification d'un utilisateur
exports.getUserNotificationPreferences = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'whatsappNumber', 'notificationPreferences']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          whatsappNumber: user.whatsappNumber
        },
        preferences: user.notificationPreferences || {
          email: true,
          sms: false,
          whatsapp: true,
          push: true,
          in_app: true
        }
      }
    });
  } catch (error) {
    console.error('Get user preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des préférences'
    });
  }
};

// Mettre à jour les préférences de notification d'un utilisateur
exports.updateUserNotificationPreferences = async (req, res) => {
  try {
    const { userId } = req.params;
    const { preferences } = req.body;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    await user.update({
      notificationPreferences: preferences
    });

    res.json({
      success: true,
      message: 'Préférences mises à jour',
      data: user.notificationPreferences
    });
  } catch (error) {
    console.error('Update user preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des préférences'
    });
  }
};

// Tester l'envoi d'une notification
exports.testNotification = async (req, res) => {
  try {
    const { userId, cin, channel = 'in_app' } = req.body;

    // Chercher l'utilisateur par CIN ou par ID
    let user;
    if (cin) {
      user = await User.findOne({ where: { cin } });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: `Utilisateur avec CIN ${cin} non trouvé`
        });
      }
    } else if (userId) {
      user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir userId ou cin'
      });
    }

    const notification = await advancedNotificationService.createNotification({
      userId: user.id,
      type: 'system',
      title: '🧪 Notification de test',
      message: `Ceci est une notification de test envoyée via ${channel} à ${user.firstName} ${user.lastName}. Si vous la recevez, tout fonctionne correctement!`,
      channels: [channel],
      priority: 'normal',
      metadata: { isTest: true, cin: user.cin }
    });

    res.json({
      success: true,
      message: 'Notification de test envoyée',
      data: {
        ...notification,
        user: {
          id: user.id,
          cin: user.cin,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        }
      }
    });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de la notification de test'
    });
  }
};

// Obtenir l'historique de notifications d'un utilisateur
exports.getUserNotificationHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50, type, status, channel } = req.query;

    const where = { userId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (channel) where.channel = channel;

    const { count, rows } = await Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        notifications: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get user notification history error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique'
    });
  }
};

// Obtenir les types de notifications disponibles
exports.getNotificationTypes = async (req, res) => {
  try {
    const types = [
      {
        value: 'assignment',
        label: 'Affectation',
        description: 'Notifications liées aux affectations d\'agents',
        icon: '📋',
        color: '#3b82f6'
      },
      {
        value: 'reminder',
        label: 'Rappel',
        description: 'Rappels d\'événements et de missions',
        icon: '⏰',
        color: '#f59e0b'
      },
      {
        value: 'attendance',
        label: 'Pointage',
        description: 'Notifications de pointage entrée/sortie',
        icon: '✅',
        color: '#10b981'
      },
      {
        value: 'late_alert',
        label: 'Alerte retard',
        description: 'Alertes de retard',
        icon: '⏰',
        color: '#ef4444'
      },
      {
        value: 'absence_alert',
        label: 'Alerte absence',
        description: 'Alertes d\'absence',
        icon: '❌',
        color: '#dc2626'
      },
      {
        value: 'schedule_change',
        label: 'Modification planning',
        description: 'Changements de planning',
        icon: '🔄',
        color: '#8b5cf6'
      },
      {
        value: 'system',
        label: 'Système',
        description: 'Notifications système',
        icon: '⚙️',
        color: '#6b7280'
      },
      {
        value: 'general',
        label: 'Général',
        description: 'Messages généraux',
        icon: '📢',
        color: '#06b6d4'
      }
    ];

    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des types'
    });
  }
};

// Vérifier l'existence de CINs
exports.verifyCins = async (req, res) => {
  try {
    const { cins } = req.body;

    if (!cins || !Array.isArray(cins) || cins.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir au moins un CIN'
      });
    }

    // Rechercher les utilisateurs avec ces CINs
    const users = await User.findAll({
      where: { cin: cins },
      attributes: ['id', 'cin', 'firstName', 'lastName', 'email', 'role', 'status']
    });

    const foundCins = users.map(u => u.cin);
    const notFoundCins = cins.filter(cin => !foundCins.includes(cin));
    const inactiveUsers = users.filter(u => u.status !== 'active');

    res.json({
      success: true,
      data: {
        found: users.map(u => ({
          cin: u.cin,
          name: `${u.firstName} ${u.lastName}`,
          email: u.email,
          role: u.role,
          status: u.status,
          isActive: u.status === 'active'
        })),
        notFound: notFoundCins,
        totalRequested: cins.length,
        totalFound: users.length,
        totalActive: users.filter(u => u.status === 'active').length,
        hasInactiveUsers: inactiveUsers.length > 0,
        inactiveUsers: inactiveUsers.map(u => ({
          cin: u.cin,
          name: `${u.firstName} ${u.lastName}`,
          status: u.status
        }))
      }
    });
  } catch (error) {
    console.error('Verify CINs error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification des CINs'
    });
  }
};

/**
 * Envoyer une notification en masse pour un événement
 */
exports.sendBulkEventNotification = async (req, res) => {
  try {
    const {
      eventId,
      channels,
      messageType,
      customMessage,
      title,
      includeSupervisors,
      includeAgents,
      onlyConfirmed
    } = req.body;

    // Validation
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'L\'ID de l\'événement est requis'
      });
    }

    if (!channels || channels.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Au moins un canal de communication est requis'
      });
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Le titre est requis'
      });
    }

    if (messageType === 'custom' && !customMessage) {
      return res.status(400).json({
        success: false,
        message: 'Le message personnalisé est requis'
      });
    }

    // Récupérer l'événement
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    // Récupérer toutes les affectations
    const whereClause = { eventId };
    if (onlyConfirmed) {
      whereClause.status = 'confirmed';
    }

    const assignments = await Assignment.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          where: { status: 'active' },
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'whatsappNumber', 'role']
        }
      ]
    });

    if (assignments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aucune affectation trouvée pour cet événement'
      });
    }

    // Filtrer les utilisateurs selon les options
    let targetUsers = [];
    assignments.forEach(assignment => {
      if (assignment.user) {
        // Utiliser assignment.role qui définit le rôle dans cette affectation
        const assignmentRole = assignment.role;
        
        if (includeSupervisors && assignmentRole === 'supervisor') {
          targetUsers.push(assignment.user);
        }
        if (includeAgents && (assignmentRole === 'primary' || assignmentRole === 'backup')) {
          // primary et backup sont des agents
          targetUsers.push(assignment.user);
        }
      }
    });

    // Supprimer les doublons
    const uniqueUsers = [...new Map(targetUsers.map(user => [user.id, user])).values()];

    if (uniqueUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aucun destinataire trouvé avec les critères sélectionnés'
      });
    }

    // Générer le message selon le type
    let messageContent = customMessage;
    if (messageType !== 'custom') {
      const templates = {
        assignment: `Bonjour {userName}, vous avez été affecté(e) à l'événement ${event.name} prévu le ${new Date(event.startDate).toLocaleDateString('fr-FR')} à ${event.location}. Merci de confirmer votre présence.`,
        reminder: `Rappel: L'événement ${event.name} aura lieu le ${new Date(event.startDate).toLocaleDateString('fr-FR')} à ${event.location}. Veuillez vous présenter à l'heure. Merci!`,
        update: `Mise à jour concernant l'événement ${event.name} (${new Date(event.startDate).toLocaleDateString('fr-FR')} - ${event.location}). Veuillez consulter les détails dans votre espace personnel.`
      };
      messageContent = templates[messageType] || customMessage;
    }

    // Préparer les notifications
    const notificationsToCreate = [];
    const results = {
      sent: 0,
      failed: 0,
      total: uniqueUsers.length * channels.length,
      details: []
    };

    for (const user of uniqueUsers) {
      // Remplacer les variables dans le message
      const personalizedMessage = messageContent
        .replace(/{eventName}/g, event.name)
        .replace(/{eventDate}/g, new Date(event.startDate).toLocaleDateString('fr-FR'))
        .replace(/{eventLocation}/g, event.location)
        .replace(/{userName}/g, `${user.firstName} ${user.lastName}`);

      for (const channel of channels) {
        try {
          const notificationData = {
            userId: user.id,
            type: messageType === 'custom' ? 'general' : messageType,
            title: title,
            message: personalizedMessage,
            channel: channel,
            priority: 'normal',
            status: 'pending',
            metadata: {
              eventId: event.id,
              eventName: event.name,
              eventDate: event.startDate,
              sentBy: req.user.id,
              bulkSend: true
            }
          };

          const notification = await Notification.create(notificationData);
          notificationsToCreate.push(notification);

          // Envoyer selon le canal
          try {
            await advancedNotificationService.sendNotification(notification, user, channel);
            results.sent++;
            results.details.push({
              userId: user.id,
              userName: `${user.firstName} ${user.lastName}`,
              channel: channel,
              status: 'sent'
            });
          } catch (sendError) {
            console.error(`Erreur d'envoi ${channel} pour ${user.email}:`, sendError);
            await notification.update({ 
              status: 'failed', 
              error: sendError.message 
            });
            results.failed++;
            results.details.push({
              userId: user.id,
              userName: `${user.firstName} ${user.lastName}`,
              channel: channel,
              status: 'failed',
              error: sendError.message
            });
          }
        } catch (error) {
          console.error(`Erreur création notification pour ${user.email}:`, error);
          results.failed++;
        }
      }
    }

    res.json({
      success: true,
      message: `${results.sent} notification(s) envoyée(s) sur ${results.total} tentative(s)`,
      data: {
        sent: results.sent,
        failed: results.failed,
        total: results.total,
        recipients: uniqueUsers.length,
        channels: channels.length,
        event: {
          id: event.id,
          name: event.name,
          date: event.startDate,
          location: event.location
        },
        details: results.details
      }
    });

  } catch (error) {
    console.error('Bulk event notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de la notification en masse',
      error: error.message
    });
  }
};

module.exports = exports;
