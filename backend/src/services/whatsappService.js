/**
 * WhatsApp Service - Integration avec Evolution API (Open Source)
 * Pour envoyer des notifications WhatsApp aux agents
 *
 * Documentation: https://doc.evolution-api.com/
 */

const axios = require('axios');

class WhatsAppService {
  constructor() {
    // Configuration Evolution API
    this.apiUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    this.apiKey = process.env.EVOLUTION_API_KEY || '';
    this.instanceName = process.env.EVOLUTION_INSTANCE || 'security-guard';
    this.enabled = process.env.WHATSAPP_ENABLED === 'true';

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey,
      },
      timeout: 30000,
    });
  }

  /**
   * Verifier si le service est configure
   */
  isConfigured() {
    return this.enabled && this.apiUrl && this.apiKey;
  }

  /**
   * Formater le numero de telephone
   * @param {string} phone - Numero de telephone
   * @returns {string} Numero formate
   */
  formatPhoneNumber(phone) {
    // Nettoyer le numero
    let cleaned = phone.replace(/\D/g, '');

    // Ajouter le code pays si necessaire (France par defaut)
    if (cleaned.startsWith('0')) {
      cleaned = '33' + cleaned.substring(1);
    }

    // S'assurer que le numero commence par le code pays
    if (!cleaned.startsWith('33') && !cleaned.startsWith('1')) {
      cleaned = '33' + cleaned;
    }

    return cleaned;
  }

  /**
   * Verifier le statut de l'instance WhatsApp
   */
  async checkInstance() {
    try {
      const response = await this.client.get(`/instance/connectionState/${this.instanceName}`);
      return {
        connected: response.data?.state === 'open',
        state: response.data?.state,
      };
    } catch (error) {
      console.error('WhatsApp instance check error:', error.message);
      return { connected: false, state: 'error' };
    }
  }

  /**
   * Creer une nouvelle instance WhatsApp
   */
  async createInstance() {
    try {
      const response = await this.client.post('/instance/create', {
        instanceName: this.instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      });
      return response.data;
    } catch (error) {
      console.error('Create instance error:', error.message);
      throw error;
    }
  }

  /**
   * Obtenir le QR code pour connecter WhatsApp
   */
  async getQRCode() {
    try {
      const response = await this.client.get(`/instance/qrcode/${this.instanceName}`);
      return response.data;
    } catch (error) {
      console.error('Get QR code error:', error.message);
      throw error;
    }
  }

  /**
   * Envoyer un message texte
   * @param {string} phone - Numero de telephone
   * @param {string} message - Message a envoyer
   */
  async sendTextMessage(phone, message) {
    if (!this.isConfigured()) {
      console.log('WhatsApp not configured, skipping message');
      return { success: false, reason: 'not_configured' };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);

      const response = await this.client.post(`/message/sendText/${this.instanceName}`, {
        number: formattedPhone,
        text: message,
      });

      return {
        success: true,
        messageId: response.data?.key?.id,
        data: response.data,
      };
    } catch (error) {
      console.error('Send message error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Envoyer un message avec boutons
   * @param {string} phone - Numero de telephone
   * @param {string} title - Titre du message
   * @param {string} description - Description
   * @param {Array} buttons - Boutons [{buttonId, buttonText}]
   */
  async sendButtonMessage(phone, title, description, buttons) {
    if (!this.isConfigured()) {
      return { success: false, reason: 'not_configured' };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);

      const response = await this.client.post(`/message/sendButtons/${this.instanceName}`, {
        number: formattedPhone,
        title: title,
        description: description,
        buttons: buttons.map(b => ({
          type: 'reply',
          reply: {
            id: b.buttonId,
            title: b.buttonText,
          }
        })),
      });

      return {
        success: true,
        messageId: response.data?.key?.id,
        data: response.data,
      };
    } catch (error) {
      console.error('Send button message error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Envoyer un message avec image
   * @param {string} phone - Numero de telephone
   * @param {string} imageUrl - URL de l'image
   * @param {string} caption - Legende de l'image
   */
  async sendImageMessage(phone, imageUrl, caption = '') {
    if (!this.isConfigured()) {
      return { success: false, reason: 'not_configured' };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);

      const response = await this.client.post(`/message/sendMedia/${this.instanceName}`, {
        number: formattedPhone,
        mediatype: 'image',
        media: imageUrl,
        caption: caption,
      });

      return {
        success: true,
        messageId: response.data?.key?.id,
        data: response.data,
      };
    } catch (error) {
      console.error('Send image message error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Envoyer un document
   * @param {string} phone - Numero de telephone
   * @param {string} documentUrl - URL du document
   * @param {string} fileName - Nom du fichier
   */
  async sendDocument(phone, documentUrl, fileName) {
    if (!this.isConfigured()) {
      return { success: false, reason: 'not_configured' };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);

      const response = await this.client.post(`/message/sendMedia/${this.instanceName}`, {
        number: formattedPhone,
        mediatype: 'document',
        media: documentUrl,
        fileName: fileName,
      });

      return {
        success: true,
        messageId: response.data?.key?.id,
        data: response.data,
      };
    } catch (error) {
      console.error('Send document error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Envoyer une localisation
   * @param {string} phone - Numero de telephone
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {string} name - Nom du lieu
   */
  async sendLocation(phone, latitude, longitude, name = '') {
    if (!this.isConfigured()) {
      return { success: false, reason: 'not_configured' };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);

      const response = await this.client.post(`/message/sendLocation/${this.instanceName}`, {
        number: formattedPhone,
        name: name,
        address: name,
        latitude: latitude,
        longitude: longitude,
      });

      return {
        success: true,
        messageId: response.data?.key?.id,
        data: response.data,
      };
    } catch (error) {
      console.error('Send location error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ============================================
  // TEMPLATES DE MESSAGES METIER
  // ============================================

  /**
   * Notification d'affectation
   */
  async sendAssignmentNotification(agent, event) {
    const message = `📋 *Nouvelle Affectation*

Bonjour ${agent.firstName},

Vous avez ete affecte(e) a l'evenement suivant:

📍 *${event.name}*
📅 Date: ${new Date(event.startDate).toLocaleDateString('fr-FR')}
⏰ Horaires: ${event.checkInTime} - ${event.checkOutTime}
📍 Lieu: ${event.location}

Merci de confirmer votre presence.

_Security Guard Management_`;

    return this.sendTextMessage(agent.phone, message);
  }

  /**
   * Rappel de pointage
   */
  async sendCheckInReminder(agent, event) {
    const message = `⏰ *Rappel de Pointage*

Bonjour ${agent.firstName},

N'oubliez pas votre pointage pour:

📍 *${event.name}*
⏰ Debut prevu: ${event.checkInTime}

Utilisez l'application pour pointer votre arrivee.

_Security Guard Management_`;

    return this.sendTextMessage(agent.phone, message);
  }

  /**
   * Confirmation de pointage arrivee
   */
  async sendCheckInConfirmation(agent, attendance) {
    const message = `✅ *Pointage Confirme*

${agent.firstName}, votre arrivee a ete enregistree.

⏰ Heure: ${new Date(attendance.checkInTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
📍 Position: ${attendance.isWithinGeofence ? 'Dans la zone ✓' : 'Hors zone ⚠️'}

Bonne journee!

_Security Guard Management_`;

    return this.sendTextMessage(agent.phone, message);
  }

  /**
   * Notification de fin de service
   */
  async sendShiftEndReminder(agent, event) {
    const message = `🔔 *Fin de Service*

${agent.firstName}, votre service se termine bientot.

📍 *${event.name}*
⏰ Fin prevue: ${event.checkOutTime}

N'oubliez pas de pointer votre depart.

_Security Guard Management_`;

    return this.sendTextMessage(agent.phone, message);
  }

  /**
   * Alerte incident
   */
  async sendIncidentAlert(supervisor, incident, reporter) {
    const message = `🚨 *ALERTE INCIDENT*

Type: ${incident.type}
Gravite: ${incident.severity.toUpperCase()}

Signale par: ${reporter.firstName} ${reporter.lastName}
📍 Lieu: ${incident.locationAddress || 'Non specifie'}
⏰ Heure: ${new Date(incident.createdAt).toLocaleTimeString('fr-FR')}

Description:
${incident.description.substring(0, 200)}${incident.description.length > 200 ? '...' : ''}

Connectez-vous au dashboard pour plus de details.

_Security Guard Management_`;

    return this.sendTextMessage(supervisor.phone, message);
  }

  /**
   * Alerte SOS urgence
   */
  async sendSOSAlert(supervisor, agent, location) {
    const message = `🆘 *ALERTE SOS URGENTE* 🆘

L'agent ${agent.firstName} ${agent.lastName} a declenche une alerte d'urgence!

📍 Position: ${location.latitude?.toFixed(6)}, ${location.longitude?.toFixed(6)}
⏰ Heure: ${new Date().toLocaleTimeString('fr-FR')}
📞 Tel: ${agent.phone}

Action immediate requise!

_Security Guard Management_`;

    // Envoyer le message avec la localisation
    await this.sendTextMessage(supervisor.phone, message);

    if (location.latitude && location.longitude) {
      await this.sendLocation(
        supervisor.phone,
        location.latitude,
        location.longitude,
        `SOS - ${agent.firstName} ${agent.lastName}`
      );
    }

    return { success: true };
  }

  /**
   * Rapport quotidien
   */
  async sendDailyReport(supervisor, stats) {
    const message = `📊 *Rapport Quotidien*

Date: ${new Date().toLocaleDateString('fr-FR')}

👥 Agents actifs: ${stats.activeAgents}
✅ Presents: ${stats.present}
⏰ Retards: ${stats.late}
❌ Absents: ${stats.absent}
🚨 Incidents: ${stats.incidents}

Taux de presence: ${stats.attendanceRate}%

Consultez le dashboard pour le rapport complet.

_Security Guard Management_`;

    return this.sendTextMessage(supervisor.phone, message);
  }

  /**
   * Planning de la semaine
   */
  async sendWeeklySchedule(agent, assignments) {
    let message = `📅 *Planning de la Semaine*

Bonjour ${agent.firstName},

Voici vos affectations pour cette semaine:\n\n`;

    assignments.forEach((a, index) => {
      message += `${index + 1}. *${a.event?.name}*
   📅 ${new Date(a.startDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
   ⏰ ${a.event?.checkInTime} - ${a.event?.checkOutTime}
   📍 ${a.event?.location}\n\n`;
    });

    message += `_Security Guard Management_`;

    return this.sendTextMessage(agent.phone, message);
  }
}

// Singleton
const whatsappService = new WhatsAppService();

module.exports = whatsappService;
