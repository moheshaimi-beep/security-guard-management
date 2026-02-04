const { Notification, User, Event, Assignment, Attendance } = require('../models');
const { Op } = require('sequelize');
const notificationService = require('./notificationService');

/**
 * Service de notifications avancé avec gestion complète des événements
 * Gère tous les types de notifications du système
 */
class AdvancedNotificationService {
  
  /**
   * ÉVÉNEMENTS LIÉS AUX UTILISATEURS
   */
  
  // Nouvel utilisateur créé
  async notifyUserCreated(userId, createdBy) {
    const user = await User.findByPk(userId);
    if (!user) return;

    // Notification à l'utilisateur
    await this.createNotification({
      userId: user.id,
      type: 'system',
      title: '🎉 Bienvenue dans Security Guard Management',
      message: `Bonjour ${user.firstName} ${user.lastName}, votre compte a été créé avec succès. Votre rôle: ${user.role}`,
      channels: ['in_app', 'email'],
      priority: 'high',
      metadata: { createdBy }
    });

    // Notification aux admins
    await this.notifyAdmins({
      type: 'system',
      title: '👤 Nouvel utilisateur créé',
      message: `${user.firstName} ${user.lastName} (${user.role}) a été ajouté au système`,
      metadata: { userId: user.id }
    });
  }

  // Utilisateur modifié
  async notifyUserUpdated(userId, updatedBy, changes) {
    const user = await User.findByPk(userId);
    if (!user) return;

    await this.createNotification({
      userId: user.id,
      type: 'system',
      title: '🔄 Profil mis à jour',
      message: `Votre profil a été modifié par ${updatedBy}`,
      channels: ['in_app'],
      priority: 'normal',
      metadata: { changes }
    });
  }

  // Utilisateur supprimé/désactivé
  async notifyUserDeactivated(userId, reason) {
    await this.createNotification({
      userId,
      type: 'system',
      title: '⚠️ Compte désactivé',
      message: `Votre compte a été désactivé. Raison: ${reason}. Contactez l'administrateur pour plus d'informations.`,
      channels: ['in_app', 'email'],
      priority: 'urgent'
    });
  }

  /**
   * ÉVÉNEMENTS LIÉS AUX AFFECTATIONS
   */
  
  // Nouvelle affectation
  async notifyNewAssignment(assignmentId) {
    const assignment = await Assignment.findByPk(assignmentId, {
      include: [
        { model: User, as: 'agent', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Event, as: 'event', attributes: ['id', 'name', 'location', 'startDate', 'endDate'] }
      ]
    });

    if (!assignment || !assignment.agent || !assignment.event) return;

    const agent = assignment.agent;
    const event = assignment.event;
    const startDate = new Date(event.startDate).toLocaleDateString('fr-FR', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    await this.createNotification({
      userId: agent.id,
      type: 'assignment',
      title: `📋 Nouvelle affectation: ${event.name}`,
      message: `Vous avez été affecté à l'événement "${event.name}" le ${startDate} à ${event.location}`,
      channels: ['in_app', 'email', 'whatsapp'],
      priority: 'high',
      metadata: {
        assignmentId: assignment.id,
        eventId: event.id,
        eventName: event.name,
        location: event.location,
        startDate: event.startDate
      }
    });

    // Notification au superviseur si existe
    if (event.supervisorId) {
      await this.createNotification({
        userId: event.supervisorId,
        type: 'assignment',
        title: `👥 Nouvelle affectation`,
        message: `${agent.firstName} ${agent.lastName} a été affecté à "${event.name}"`,
        channels: ['in_app'],
        priority: 'normal',
        metadata: { assignmentId: assignment.id, eventId: event.id }
      });
    }
  }

  // Affectation modifiée
  async notifyAssignmentChanged(assignmentId, changes) {
    const assignment = await Assignment.findByPk(assignmentId, {
      include: [
        { model: User, as: 'agent' },
        { model: Event, as: 'event' }
      ]
    });

    if (!assignment) return;

    await this.createNotification({
      userId: assignment.agent.id,
      type: 'schedule_change',
      title: '🔄 Modification d\'affectation',
      message: `Votre affectation à "${assignment.event.name}" a été modifiée`,
      channels: ['in_app', 'whatsapp'],
      priority: 'high',
      metadata: { assignmentId, changes }
    });
  }

  // Affectation annulée
  async notifyAssignmentCancelled(assignmentId, reason) {
    const assignment = await Assignment.findByPk(assignmentId, {
      include: [
        { model: User, as: 'agent' },
        { model: Event, as: 'event' }
      ]
    });

    if (!assignment) return;

    await this.createNotification({
      userId: assignment.agent.id,
      type: 'schedule_change',
      title: '❌ Affectation annulée',
      message: `Votre affectation à "${assignment.event.name}" a été annulée. Raison: ${reason || 'Non spécifiée'}`,
      channels: ['in_app', 'email', 'whatsapp'],
      priority: 'urgent',
      metadata: { assignmentId, reason }
    });
  }

  /**
   * ÉVÉNEMENTS LIÉS AUX ÉVÉNEMENTS
   */
  
  // Nouvel événement créé
  async notifyNewEvent(eventId) {
    const event = await Event.findByPk(eventId);
    if (!event) return;

    // Notifier tous les superviseurs
    const supervisors = await User.findAll({
      where: { role: { [Op.in]: ['supervisor', 'responsable'] }, status: 'active' }
    });

    for (const supervisor of supervisors) {
      await this.createNotification({
        userId: supervisor.id,
        type: 'system',
        title: `📅 Nouvel événement: ${event.name}`,
        message: `Un nouvel événement "${event.name}" a été créé pour le ${new Date(event.startDate).toLocaleDateString('fr-FR')}`,
        channels: ['in_app'],
        priority: 'normal',
        metadata: { eventId: event.id }
      });
    }
  }

  // Événement modifié
  async notifyEventUpdated(eventId, changes) {
    const event = await Event.findByPk(eventId, {
      include: [
        { model: Assignment, as: 'assignments', include: [{ model: User, as: 'agent' }] }
      ]
    });

    if (!event) return;

    // Notifier tous les agents affectés
    for (const assignment of event.assignments) {
      if (assignment.agent) {
        await this.createNotification({
          userId: assignment.agent.id,
          type: 'schedule_change',
          title: `🔄 Événement modifié: ${event.name}`,
          message: `L'événement "${event.name}" a été modifié`,
          channels: ['in_app', 'whatsapp'],
          priority: 'high',
          metadata: { eventId, changes }
        });
      }
    }
  }

  // Rappel événement (24h avant)
  async notifyEventReminder(eventId) {
    const event = await Event.findByPk(eventId, {
      include: [
        { model: Assignment, as: 'assignments', where: { status: 'confirmed' }, include: [{ model: User, as: 'agent' }] }
      ]
    });

    if (!event) return;

    const startDate = new Date(event.startDate).toLocaleDateString('fr-FR', { 
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
    });

    for (const assignment of event.assignments) {
      if (assignment.agent) {
        await this.createNotification({
          userId: assignment.agent.id,
          type: 'reminder',
          title: `⏰ Rappel: ${event.name}`,
          message: `N'oubliez pas votre mission demain à ${startDate} au ${event.location}`,
          channels: ['in_app', 'whatsapp', 'sms'],
          priority: 'high',
          metadata: { eventId, assignmentId: assignment.id }
        });
      }
    }
  }

  /**
   * ÉVÉNEMENTS LIÉS AU POINTAGE
   */
  
  // Pointage d'entrée réussi
  async notifyCheckInSuccess(attendanceId) {
    const attendance = await Attendance.findByPk(attendanceId, {
      include: [
        { model: User, as: 'agent' },
        { model: Event, as: 'event' }
      ]
    });

    if (!attendance) return;

    await this.createNotification({
      userId: attendance.agent.id,
      type: 'attendance',
      title: '✅ Pointage enregistré',
      message: `Votre pointage d'entrée pour "${attendance.event.name}" a été enregistré avec succès`,
      channels: ['in_app'],
      priority: 'normal',
      metadata: { attendanceId, checkInTime: attendance.checkInTime }
    });

    // Notifier le superviseur
    if (attendance.event.supervisorId) {
      await this.createNotification({
        userId: attendance.event.supervisorId,
        type: 'attendance',
        title: '👤 Pointage agent',
        message: `${attendance.agent.firstName} ${attendance.agent.lastName} a pointé pour "${attendance.event.name}"`,
        channels: ['in_app'],
        priority: 'low',
        metadata: { attendanceId, agentId: attendance.agent.id }
      });
    }
  }

  // Retard détecté
  async notifyLateArrival(attendanceId, minutesLate) {
    const attendance = await Attendance.findByPk(attendanceId, {
      include: [
        { model: User, as: 'agent' },
        { model: Event, as: 'event' }
      ]
    });

    if (!attendance) return;

    // Notification à l'agent
    await this.createNotification({
      userId: attendance.agent.id,
      type: 'late_alert',
      title: '⚠️ Retard enregistré',
      message: `Vous avez ${minutesLate} minutes de retard pour "${attendance.event.name}"`,
      channels: ['in_app'],
      priority: 'normal',
      metadata: { attendanceId, minutesLate }
    });

    // Notification au superviseur et admins
    if (attendance.event.supervisorId) {
      await this.createNotification({
        userId: attendance.event.supervisorId,
        type: 'late_alert',
        title: '⏰ Agent en retard',
        message: `${attendance.agent.firstName} ${attendance.agent.lastName} est en retard de ${minutesLate} min pour "${attendance.event.name}"`,
        channels: ['in_app'],
        priority: 'high',
        metadata: { attendanceId, agentId: attendance.agent.id, minutesLate }
      });
    }

    await this.notifyAdmins({
      type: 'late_alert',
      title: '⏰ Retard détecté',
      message: `${attendance.agent.firstName} ${attendance.agent.lastName}: ${minutesLate} min de retard`,
      priority: 'normal',
      metadata: { attendanceId, minutesLate }
    });
  }

  // Absence non justifiée
  async notifyAbsence(assignmentId) {
    const assignment = await Assignment.findByPk(assignmentId, {
      include: [
        { model: User, as: 'agent' },
        { model: Event, as: 'event' }
      ]
    });

    if (!assignment) return;

    // Notification à l'agent
    await this.createNotification({
      userId: assignment.agent.id,
      type: 'absence_alert',
      title: '❌ Absence enregistrée',
      message: `Vous avez été marqué absent pour "${assignment.event.name}". Veuillez contacter votre superviseur.`,
      channels: ['in_app', 'email', 'whatsapp', 'sms'],
      priority: 'urgent',
      metadata: { assignmentId, eventId: assignment.event.id }
    });

    // Notification au superviseur
    if (assignment.event.supervisorId) {
      await this.createNotification({
        userId: assignment.event.supervisorId,
        type: 'absence_alert',
        title: '❌ Agent absent',
        message: `${assignment.agent.firstName} ${assignment.agent.lastName} est absent pour "${assignment.event.name}"`,
        channels: ['in_app', 'whatsapp'],
        priority: 'urgent',
        metadata: { assignmentId, agentId: assignment.agent.id }
      });
    }

    // Notification aux admins
    await this.notifyAdmins({
      type: 'absence_alert',
      title: '❌ Absence non justifiée',
      message: `${assignment.agent.firstName} ${assignment.agent.lastName} absent pour "${assignment.event.name}"`,
      priority: 'urgent',
      metadata: { assignmentId }
    });
  }

  /**
   * ÉVÉNEMENTS DE SÉCURITÉ
   */
  
  // Alerte SOS
  async notifySOSAlert(userId, location) {
    const user = await User.findByPk(userId);
    if (!user) return;

    // Notification urgente à tous les admins et superviseurs
    const recipients = await User.findAll({
      where: {
        role: { [Op.in]: ['admin', 'supervisor', 'responsable'] },
        status: 'active'
      }
    });

    for (const recipient of recipients) {
      await this.createNotification({
        userId: recipient.id,
        type: 'system',
        title: '🚨 ALERTE SOS',
        message: `${user.firstName} ${user.lastName} a déclenché une alerte SOS! Localisation: ${location || 'Non disponible'}`,
        channels: ['in_app', 'sms', 'whatsapp'],
        priority: 'urgent',
        metadata: { sosUserId: userId, location }
      });
    }
  }

  // Incident signalé
  async notifyIncident(incidentId, severity) {
    await this.notifyAdmins({
      type: 'system',
      title: `🚨 Incident ${severity}`,
      message: `Un incident de niveau ${severity} a été signalé`,
      priority: severity === 'critical' ? 'urgent' : 'high',
      metadata: { incidentId }
    });
  }

  /**
   * ÉVÉNEMENTS SYSTÈME
   */
  
  // Connexion suspecte
  async notifySuspiciousLogin(userId, ipAddress, location) {
    await this.createNotification({
      userId,
      type: 'system',
      title: '🔒 Connexion suspecte détectée',
      message: `Une tentative de connexion depuis une nouvelle localisation a été détectée: ${location || ipAddress}`,
      channels: ['in_app', 'email'],
      priority: 'high',
      metadata: { ipAddress, location }
    });
  }

  // Mot de passe modifié
  async notifyPasswordChanged(userId) {
    await this.createNotification({
      userId,
      type: 'system',
      title: '🔐 Mot de passe modifié',
      message: 'Votre mot de passe a été modifié avec succès. Si ce n\'était pas vous, contactez immédiatement l\'administrateur.',
      channels: ['in_app', 'email'],
      priority: 'high'
    });
  }

  /**
   * MÉTHODES UTILITAIRES
   */
  
  // Créer une notification
  async createNotification(config) {
    const { userId, type, title, message, channels = ['in_app'], priority = 'normal', metadata = {} } = config;

    const notifications = [];
    
    for (const channel of channels) {
      try {
        const notification = await Notification.create({
          userId,
          type,
          title,
          message,
          channel,
          priority,
          metadata,
          status: 'pending'
        });

        notifications.push(notification);

        // Si in_app, marquer comme sent immédiatement
        if (channel === 'in_app') {
          await notification.update({ status: 'sent', sentAt: new Date() });
        }

        // Pour les autres canaux, utiliser le service de notification
        if (channel !== 'in_app') {
          await notificationService.sendViaChannel(notification.id, channel);
        }
      } catch (error) {
        console.error(`Erreur création notification ${channel}:`, error);
      }
    }

    return notifications;
  }

  // Notifier tous les admins
  async notifyAdmins(config) {
    const admins = await User.findAll({
      where: { role: 'admin', status: 'active' }
    });

    const notifications = [];
    for (const admin of admins) {
      const notifs = await this.createNotification({
        ...config,
        userId: admin.id,
        channels: config.channels || ['in_app']
      });
      notifications.push(...notifs);
    }

    return notifications;
  }

  // Notification en masse par rôle
  async notifyByRole(role, config) {
    const users = await User.findAll({
      where: { role, status: 'active' }
    });

    const notifications = [];
    for (const user of users) {
      const notifs = await this.createNotification({
        ...config,
        userId: user.id
      });
      notifications.push(...notifs);
    }

    return notifications;
  }

  // Notification personnalisée
  async customNotification(userId, config) {
    return await this.createNotification({
      userId,
      ...config
    });
  }
}

module.exports = new AdvancedNotificationService();
