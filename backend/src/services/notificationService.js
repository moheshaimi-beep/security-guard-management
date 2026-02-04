const twilio = require('twilio');
const nodemailer = require('nodemailer');
const { Notification, User } = require('../models');

class NotificationService {
  constructor() {
    // Initialize Twilio client
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }

    // Initialize email transporter
    if (process.env.SMTP_HOST) {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
  }

  // Send SMS via Twilio
  async sendSMS(to, message) {
    if (!this.twilioClient) {
      console.log('Twilio not configured. SMS not sent:', { to, message });
      return { success: false, error: 'Twilio not configured' };
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to
      });

      return {
        success: true,
        externalId: result.sid,
        status: result.status
      };
    } catch (error) {
      console.error('SMS sending error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send WhatsApp via Twilio
  async sendWhatsApp(to, message) {
    if (!this.twilioClient) {
      console.log('Twilio not configured. WhatsApp not sent:', { to, message });
      return { success: false, error: 'Twilio not configured' };
    }

    try {
      const formattedNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: formattedNumber
      });

      return {
        success: true,
        externalId: result.sid,
        status: result.status
      };
    } catch (error) {
      console.error('WhatsApp sending error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send Email
  async sendEmail(to, subject, htmlContent, textContent = null) {
    if (!this.emailTransporter) {
      console.log('Email not configured. Email not sent:', { to, subject });
      return { success: false, error: 'Email not configured' };
    }

    try {
      const result = await this.emailTransporter.sendMail({
        from: `"Security Guard Management" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text: textContent || htmlContent.replace(/<[^>]*>/g, ''),
        html: htmlContent
      });

      return {
        success: true,
        externalId: result.messageId,
        status: 'sent'
      };
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create and send notification
  async notify(userId, options) {
    const {
      type,
      title,
      message,
      channels = ['in_app'],
      priority = 'normal',
      metadata = null,
      scheduledFor = null
    } = options;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const notifications = [];

    for (const channel of channels) {
      // Check user preferences
      if (channel !== 'in_app' && !user.notificationPreferences?.[channel]) {
        continue;
      }

      const notification = await Notification.create({
        userId,
        type,
        title,
        message,
        channel,
        priority,
        metadata,
        scheduledFor,
        status: scheduledFor ? 'pending' : 'pending'
      });

      // Send immediately if not scheduled
      if (!scheduledFor) {
        const result = await this.sendNotification(notification, user);
        notification.status = result.success ? 'sent' : 'failed';
        notification.sentAt = result.success ? new Date() : null;
        notification.externalId = result.externalId || null;
        notification.failureReason = result.error || null;
        notification.failedAt = result.success ? null : new Date();
        await notification.save();
      }

      notifications.push(notification);
    }

    return notifications;
  }

  // Send notification based on channel
  async sendNotification(notification, user) {
    switch (notification.channel) {
      case 'sms':
        return await this.sendSMS(user.phone, notification.message);

      case 'whatsapp':
        const whatsappNumber = user.whatsappNumber || user.phone;
        return await this.sendWhatsApp(whatsappNumber, notification.message);

      case 'email':
        return await this.sendEmail(
          user.email,
          notification.title,
          this.formatEmailTemplate(notification)
        );

      case 'in_app':
        // In-app notifications are stored in DB and fetched by client
        return { success: true, status: 'stored' };

      case 'push':
        // Push notifications would require Firebase/OneSignal integration
        console.log('Push notification:', notification.message);
        return { success: true, status: 'logged' };

      default:
        return { success: false, error: 'Unknown channel' };
    }
  }

  // Format email template
  formatEmailTemplate(notification) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Security Guard Management</h1>
          </div>
          <div class="content">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement. Merci de ne pas répondre.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Send assignment notification
  async notifyAssignment(assignment, event, agent) {
    const message = `Vous avez été affecté à l'événement "${event.name}" le ${new Date(event.startDate).toLocaleDateString('fr-FR')} à ${event.checkInTime}. Lieu: ${event.location}`;

    return await this.notify(agent.id, {
      type: 'assignment',
      title: 'Nouvelle Affectation',
      message,
      channels: ['in_app', 'sms', 'whatsapp', 'email'],
      priority: 'high',
      metadata: { assignmentId: assignment.id, eventId: event.id }
    });
  }

  // Send reminder notification
  async notifyReminder(event, agent) {
    const message = `Rappel: Vous êtes attendu à "${event.name}" demain à ${event.checkInTime}. Lieu: ${event.location}`;

    return await this.notify(agent.id, {
      type: 'reminder',
      title: 'Rappel - Événement Demain',
      message,
      channels: ['in_app', 'sms', 'whatsapp'],
      priority: 'normal',
      metadata: { eventId: event.id }
    });
  }

  // Send late alert to supervisors
  async notifyLateAlert(agent, event, supervisors) {
    const message = `Alerte: ${agent.firstName} ${agent.lastName} est en retard pour "${event.name}".`;

    const notifications = [];
    for (const supervisor of supervisors) {
      const notifs = await this.notify(supervisor.id, {
        type: 'late_alert',
        title: 'Alerte Retard',
        message,
        channels: ['in_app', 'sms', 'whatsapp'],
        priority: 'high',
        metadata: { agentId: agent.id, eventId: event.id }
      });
      notifications.push(...notifs);
    }

    return notifications;
  }

  // Send absence alert to supervisors
  async notifyAbsenceAlert(agent, event, supervisors) {
    const message = `Alerte: ${agent.firstName} ${agent.lastName} est absent pour "${event.name}".`;

    const notifications = [];
    for (const supervisor of supervisors) {
      const notifs = await this.notify(supervisor.id, {
        type: 'absence_alert',
        title: 'Alerte Absence',
        message,
        channels: ['in_app', 'sms', 'whatsapp', 'email'],
        priority: 'urgent',
        metadata: { agentId: agent.id, eventId: event.id }
      });
      notifications.push(...notifs);
    }

    return notifications;
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      where: { id: notificationId, userId }
    });

    if (!notification) {
      throw new Error('Notification non trouvée');
    }

    notification.status = 'read';
    notification.readAt = new Date();
    await notification.save();

    return notification;
  }

  // Get unread notifications count
  async getUnreadCount(userId) {
    return await Notification.count({
      where: {
        userId,
        status: { [require('sequelize').Op.notIn]: ['read'] },
        channel: 'in_app'
      }
    });
  }
}

module.exports = new NotificationService();
