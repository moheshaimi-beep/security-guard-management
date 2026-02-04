/**
 * SERVICE SOCKET.IO POUR MOBILE APP
 * 🚀 Gestion temps réel pour React Native
 */

import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000'; // ⚠️ À modifier pour production

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventHandlers = new Map();
  }

  /**
   * 🔌 CONNEXION SOCKET.IO
   * @param {string} userId - ID de l'utilisateur
   * @param {string} role - Rôle (agent, supervisor, admin)
   * @param {string} eventId - ID de l'événement (optionnel)
   */
  connect(userId, role, eventId = null) {
    if (this.socket?.connected) {
      console.log('ℹ️ Socket.IO déjà connecté');
      return;
    }

    try {
      this.socket = io(SOCKET_URL, {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10
      });

      // Événements de connexion
      this.socket.on('connect', () => {
        console.log('✅ Socket.IO Mobile connecté');
        this.isConnected = true;
        
        // S'authentifier
        this.socket.emit('auth', {
          userId,
          role,
          eventId
        });
        
        this._triggerHandler('connected', { userId, role, eventId });
      });

      this.socket.on('auth:success', (data) => {
        console.log('✅ Authentification Socket.IO réussie:', data);
        this._triggerHandler('authenticated', data);
      });

      this.socket.on('auth:error', (error) => {
        console.error('❌ Erreur authentification Socket.IO:', error);
        this._triggerHandler('auth_error', error);
      });

      this.socket.on('disconnect', () => {
        console.log('🔴 Socket.IO Mobile déconnecté');
        this.isConnected = false;
        this._triggerHandler('disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Erreur connexion Socket.IO:', error.message);
        this.isConnected = false;
        this._triggerHandler('connection_error', error);
      });

      // ========================================
      // ÉVÉNEMENTS MÉTIER
      // ========================================

      // Tracking GPS
      this.socket.on('tracking:position_update', (data) => {
        this._triggerHandler('position_update', data);
      });

      this.socket.on('tracking:current_positions', (positions) => {
        this._triggerHandler('current_positions', positions);
      });

      // Check-in / Présence
      this.socket.on('checkin:new', (data) => {
        this._triggerHandler('checkin_new', data);
      });

      this.socket.on('checkin:updated', (data) => {
        this._triggerHandler('checkin_updated', data);
      });

      // Incidents
      this.socket.on('incident:new', (data) => {
        this._triggerHandler('incident_new', data);
      });

      this.socket.on('incident:updated', (data) => {
        this._triggerHandler('incident_updated', data);
      });

      // SOS / Urgence
      this.socket.on('sos:alert', (data) => {
        this._triggerHandler('sos_alert', data);
      });

      this.socket.on('sos:cancelled', (data) => {
        this._triggerHandler('sos_cancelled', data);
      });

      // Notifications
      this.socket.on('notification:new', (data) => {
        this._triggerHandler('notification_new', data);
      });

      // Événements
      this.socket.on('event:updated', (data) => {
        this._triggerHandler('event_updated', data);
      });

      this.socket.on('event:deleted', (data) => {
        this._triggerHandler('event_deleted', data);
      });

      // Affectations
      this.socket.on('assignment:new', (data) => {
        this._triggerHandler('assignment_new', data);
      });

      this.socket.on('assignment:updated', (data) => {
        this._triggerHandler('assignment_updated', data);
      });

    } catch (error) {
      console.error('Erreur connexion Socket.IO:', error);
    }
  }

  /**
   * 🔌 DÉCONNEXION
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.eventHandlers.clear();
      console.log('🔴 Socket.IO Mobile déconnecté manuellement');
    }
  }

  /**
   * 📡 ÉMETTRE UN ÉVÉNEMENT
   * @param {string} event - Nom de l'événement
   * @param {*} data - Données à envoyer
   */
  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ Socket.IO non connecté - impossible d\'émettre:', event);
    }
  }

  /**
   * 👂 ÉCOUTER UN ÉVÉNEMENT
   * @param {string} event - Nom de l'événement
   * @param {Function} handler - Fonction de callback
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * 🚫 RETIRER UN ÉCOUTEUR
   * @param {string} event - Nom de l'événement
   * @param {Function} handler - Fonction de callback
   */
  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 🔄 DÉCLENCHER LES HANDLERS ENREGISTRÉS
   * @private
   */
  _triggerHandler(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Erreur dans handler ${event}:`, error);
        }
      });
    }
  }

  /**
   * ========================================
   * MÉTHODES SPÉCIFIQUES POUR MOBILE
   * ========================================
   */

  /**
   * 📍 ENVOYER POSITION GPS
   * @param {number} latitude
   * @param {number} longitude
   * @param {number} accuracy
   */
  sendPosition(latitude, longitude, accuracy = 10) {
    this.emit('tracking:position', {
      latitude,
      longitude,
      accuracy,
      timestamp: Date.now()
    });
  }

  /**
   * ✅ ENVOYER CHECK-IN
   * @param {string} eventId - ID de l'événement
   * @param {number} latitude
   * @param {number} longitude
   * @param {string} photo - URI de la photo (base64)
   */
  sendCheckin(eventId, latitude, longitude, photo = null) {
    this.emit('checkin:create', {
      eventId,
      latitude,
      longitude,
      photo,
      timestamp: Date.now()
    });
  }

  /**
   * 🚨 ENVOYER SOS
   * @param {string} eventId - ID de l'événement
   * @param {number} latitude
   * @param {number} longitude
   * @param {string} message - Message d'urgence
   */
  sendSOS(eventId, latitude, longitude, message = '') {
    this.emit('sos:trigger', {
      eventId,
      latitude,
      longitude,
      message,
      timestamp: Date.now()
    });
  }

  /**
   * ❌ ANNULER SOS
   * @param {string} sosId - ID du SOS
   */
  cancelSOS(sosId) {
    this.emit('sos:cancel', { sosId });
  }

  /**
   * 📸 ENVOYER RAPPORT D'INCIDENT
   * @param {string} eventId - ID de l'événement
   * @param {string} type - Type d'incident
   * @param {string} description
   * @param {number} latitude
   * @param {number} longitude
   * @param {Array<string>} photos - URIs des photos
   */
  sendIncident(eventId, type, description, latitude, longitude, photos = []) {
    this.emit('incident:create', {
      eventId,
      type,
      description,
      latitude,
      longitude,
      photos,
      timestamp: Date.now()
    });
  }

  /**
   * 🔔 MARQUER NOTIFICATION COMME LUE
   * @param {string} notificationId - ID de la notification
   */
  markNotificationAsRead(notificationId) {
    this.emit('notification:read', { notificationId });
  }

  /**
   * 📊 S'ABONNER AU TRACKING D'UN ÉVÉNEMENT
   * @param {string} eventId - ID de l'événement
   */
  subscribeToEvent(eventId) {
    this.emit('tracking:subscribe', eventId);
  }

  /**
   * 📊 SE DÉSABONNER DU TRACKING D'UN ÉVÉNEMENT
   * @param {string} eventId - ID de l'événement
   */
  unsubscribeFromEvent(eventId) {
    this.emit('tracking:unsubscribe', eventId);
  }
}

// Singleton
const socketService = new SocketService();

export default socketService;
