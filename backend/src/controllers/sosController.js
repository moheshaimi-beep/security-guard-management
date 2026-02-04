/**
 * Controleur des Alertes SOS
 * Gere les situations d'urgence sur le terrain
 */

const { SosAlert, User, Event, Assignment } = require('../models');
const { Op } = require('sequelize');
const { logActivity } = require('../middlewares/activityLogger');

/**
 * Declencher une alerte SOS
 */
exports.triggerSOS = async (req, res) => {
  try {
    const {
      alertType = 'sos',
      latitude,
      longitude,
      accuracy,
      photo,
      voiceNoteUrl,
      description,
      eventId
    } = req.body;

    const userId = req.user.id;

    // Validation
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Position GPS requise pour l\'alerte SOS'
      });
    }

    // Creer l'alerte
    const alert = await SosAlert.create({
      userId,
      eventId,
      alertType,
      latitude,
      longitude,
      accuracy,
      photo,
      voiceNoteUrl,
      description,
      status: 'active'
    });

    // Charger les infos utilisateur
    const user = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'phone', 'profilePhoto', 'supervisorId'],
      include: [{
        model: User,
        as: 'supervisor',
        attributes: ['id', 'firstName', 'lastName', 'phone']
      }]
    });

    // Charger l'evenement si specifie
    let event = null;
    if (eventId) {
      event = await Event.findByPk(eventId, {
        attributes: ['id', 'name', 'location']
      });
    }

    // Broadcast immediat via Socket.IO
    const io = req.app.get('io');
    if (io) {
      const alertData = {
        id: alert.id,
        alertType,
        status: 'active',
        location: {
          latitude,
          longitude,
          accuracy
        },
        user: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          phone: user.phone,
          photo: user.profilePhoto
        },
        event: event ? {
          id: event.id,
          name: event.name,
          location: event.location
        } : null,
        description,
        hasPhoto: !!photo,
        hasVoiceNote: !!voiceNoteUrl,
        timestamp: alert.createdAt
      };

      // Notifier tous les admins et superviseurs
      io.to('role:admin').to('role:supervisor').emit('sos:alert', alertData);

      // Notifier le superviseur direct
      if (user.supervisorId) {
        io.to(`user:${user.supervisorId}`).emit('sos:alert:direct', alertData);
      }

      // Notifier l'evenement si lie
      if (eventId) {
        io.to(`event-${eventId}`).emit('sos:alert:event', alertData);
      }
    }

    // Log
    await logActivity({
      userId,
      action: 'SOS_TRIGGERED',
      entityType: 'sos_alert',
      entityId: alert.id,
      description: `Alerte SOS declenchee par ${user.firstName} ${user.lastName}`,
      newValues: { alertType, latitude, longitude },
      req
    });

    res.status(201).json({
      success: true,
      message: 'Alerte SOS declenchee',
      data: {
        alertId: alert.id,
        status: 'active',
        message: 'Votre alerte a ete envoyee. Les responsables ont ete notifies.'
      }
    });

  } catch (error) {
    console.error('Trigger SOS error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du declenchement de l\'alerte'
    });
  }
};

/**
 * Obtenir les alertes actives
 */
exports.getActiveAlerts = async (req, res) => {
  try {
    const { eventId } = req.query;

    // Verifier les permissions
    if (!['admin', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acces non autorise'
      });
    }

    const alerts = await SosAlert.getActive(eventId);

    // Enrichir avec plus d'infos
    const enriched = await Promise.all(alerts.map(async (alert) => {
      let event = null;
      if (alert.eventId) {
        event = await Event.findByPk(alert.eventId, {
          attributes: ['id', 'name', 'location']
        });
      }

      let acknowledgedBy = null;
      if (alert.acknowledgedBy) {
        acknowledgedBy = await User.findByPk(alert.acknowledgedBy, {
          attributes: ['id', 'firstName', 'lastName']
        });
      }

      return {
        ...alert.toJSON(),
        event,
        acknowledgedByUser: acknowledgedBy
      };
    }));

    res.json({
      success: true,
      data: enriched
    });

  } catch (error) {
    console.error('Get active alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
};

/**
 * Accuser reception d'une alerte
 */
exports.acknowledgeAlert = async (req, res) => {
  try {
    const { alertId } = req.params;

    // Verifier les permissions
    if (!['admin', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acces non autorise'
      });
    }

    const alert = await SosAlert.findByPk(alertId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName']
      }]
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerte non trouvee'
      });
    }

    if (alert.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cette alerte a deja ete prise en charge'
      });
    }

    await alert.acknowledge(req.user.id);

    // Notifier via Socket.IO
    const io = req.app.get('io');
    if (io) {
      // Notifier l'agent que son alerte est prise en charge
      io.to(`user:${alert.userId}`).emit('sos:acknowledged', {
        alertId,
        acknowledgedBy: `${req.user.firstName} ${req.user.lastName}`,
        responseTime: alert.responseTimeSeconds
      });

      // Mettre a jour tous les superviseurs
      io.to('role:admin').to('role:supervisor').emit('sos:status-update', {
        alertId,
        status: 'acknowledged',
        acknowledgedBy: {
          id: req.user.id,
          name: `${req.user.firstName} ${req.user.lastName}`
        }
      });
    }

    await logActivity({
      userId: req.user.id,
      action: 'SOS_ACKNOWLEDGED',
      entityType: 'sos_alert',
      entityId: alertId,
      description: `Alerte SOS de ${alert.user.firstName} ${alert.user.lastName} prise en charge`,
      req
    });

    res.json({
      success: true,
      message: 'Alerte prise en charge',
      data: {
        alertId,
        status: 'acknowledged',
        responseTime: alert.responseTimeSeconds
      }
    });

  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
};

/**
 * Marquer comme "en intervention"
 */
exports.respondToAlert = async (req, res) => {
  try {
    const { alertId } = req.params;

    const alert = await SosAlert.findByPk(alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerte non trouvee'
      });
    }

    await alert.update({ status: 'responding' });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${alert.userId}`).emit('sos:responding', {
        alertId,
        responder: `${req.user.firstName} ${req.user.lastName}`
      });

      io.to('role:admin').to('role:supervisor').emit('sos:status-update', {
        alertId,
        status: 'responding'
      });
    }

    res.json({
      success: true,
      message: 'Intervention en cours'
    });

  } catch (error) {
    console.error('Respond to alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
};

/**
 * Resoudre une alerte
 */
exports.resolveAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { notes, isFalseAlarm } = req.body;

    const alert = await SosAlert.findByPk(alertId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName']
      }]
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerte non trouvee'
      });
    }

    await alert.resolve(req.user.id, notes, isFalseAlarm);

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${alert.userId}`).emit('sos:resolved', {
        alertId,
        resolvedBy: `${req.user.firstName} ${req.user.lastName}`,
        isFalseAlarm
      });

      io.to('role:admin').to('role:supervisor').emit('sos:status-update', {
        alertId,
        status: isFalseAlarm ? 'false_alarm' : 'resolved'
      });
    }

    await logActivity({
      userId: req.user.id,
      action: isFalseAlarm ? 'SOS_FALSE_ALARM' : 'SOS_RESOLVED',
      entityType: 'sos_alert',
      entityId: alertId,
      description: `Alerte SOS ${isFalseAlarm ? 'marquee comme fausse alerte' : 'resolue'}`,
      req
    });

    res.json({
      success: true,
      message: isFalseAlarm ? 'Marquee comme fausse alerte' : 'Alerte resolue'
    });

  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
};

/**
 * Historique des alertes
 */
exports.getAlertHistory = async (req, res) => {
  try {
    const { userId, eventId, status, startDate, endDate, page = 1, limit = 20 } = req.query;

    const where = {};

    // Filtres selon le role
    if (req.user.role === 'agent') {
      where.userId = req.user.id;
    } else {
      if (userId) where.userId = userId;
      if (eventId) where.eventId = eventId;
    }

    if (status) where.status = status;
    if (startDate && endDate) {
      where.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }

    const { count, rows } = await SosAlert.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'phone']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        alerts: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get alert history error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
};

/**
 * Statistiques des alertes SOS
 */
exports.getAlertStats = async (req, res) => {
  try {
    if (!['admin', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acces non autorise'
      });
    }

    const { startDate, endDate, eventId } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }
    if (eventId) {
      where.eventId = eventId;
    }

    const stats = {
      total: await SosAlert.count({ where }),
      byStatus: {
        active: await SosAlert.count({ where: { ...where, status: 'active' } }),
        acknowledged: await SosAlert.count({ where: { ...where, status: 'acknowledged' } }),
        responding: await SosAlert.count({ where: { ...where, status: 'responding' } }),
        resolved: await SosAlert.count({ where: { ...where, status: 'resolved' } }),
        falseAlarm: await SosAlert.count({ where: { ...where, status: 'false_alarm' } })
      },
      byType: {
        sos: await SosAlert.count({ where: { ...where, alertType: 'sos' } }),
        medical: await SosAlert.count({ where: { ...where, alertType: 'medical' } }),
        security: await SosAlert.count({ where: { ...where, alertType: 'security' } }),
        fire: await SosAlert.count({ where: { ...where, alertType: 'fire' } }),
        other: await SosAlert.count({ where: { ...where, alertType: 'other' } })
      }
    };

    // Temps de reponse moyen
    const alertsWithResponse = await SosAlert.findAll({
      where: {
        ...where,
        responseTimeSeconds: { [Op.ne]: null }
      },
      attributes: ['responseTimeSeconds']
    });

    stats.avgResponseTime = alertsWithResponse.length > 0
      ? Math.round(alertsWithResponse.reduce((sum, a) => sum + a.responseTimeSeconds, 0) / alertsWithResponse.length)
      : 0;

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get alert stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
};
