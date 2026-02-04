/**
 * SERVICE DE SYNCHRONISATION TEMPS RÉEL AVEC SOCKET.IO
 * Gestion centralisée des communications temps réel
 * Migré de WebSocket natif vers Socket.IO
 */

import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

class SyncService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.listeners = new Map(); // event -> Set of callbacks
    this.userId = null;
    this.rooms = new Set();
  }

  /**
   * Se connecter au serveur Socket.IO
   */
  connect(userId, rooms = []) {
    if (this.socket?.connected) {
      console.log('⚠️ Déjà connecté au serveur de synchronisation');
      return;
    }

    this.userId = userId;
    this.rooms = new Set(rooms);

    console.log('🔗 Tentative de connexion Socket.IO:', SOCKET_URL);

    try {
      this.socket = io(SOCKET_URL, {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts
      });

      // Événements de connexion
      this.socket.on('connect', () => {
        console.log('🟢 Connecté au serveur de synchronisation Socket.IO');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Authentification automatique
        this.socket.emit('auth', {
          userId: this.userId,
          role: 'user'
        });
        
        // Rejoindre les rooms
        rooms.forEach(room => {
          this.socket.emit('event:join', room);
        });
        
        this.emit('connected');
      });

      this.socket.on('auth:success', (data) => {
        console.log('✅ Authentifié Socket.IO:', data);
      });

      this.socket.on('auth:error', (error) => {
        console.error('❌ Erreur authentification Socket.IO:', error);
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 Déconnecté du serveur de synchronisation');
        this.isConnected = false;
        this.emit('disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Erreur connexion Socket.IO:', error.message);
        this.isConnected = false;
      });

      // Événements métier (synchronisation)
      this.setupBusinessEvents();

    } catch (error) {
      console.error('❌ Impossible de créer Socket.IO:', error);
      console.error('   Erreur détaillée:', error.message);
    }
  }

  /**
   * Configurer les événements métier
   */
  setupBusinessEvents() {
    // Notifications
    this.socket.on('notification:new', (data) => {
      this.emit('notification:created', data);
    });

    // Check-in
    this.socket.on('checkin:new', (data) => {
      this.emit('checkin', data);
      this.emit('attendance:created', data);
    });

    // Incidents
    this.socket.on('incident:new', (data) => {
      this.emit('incident:created', data);
    });

    this.socket.on('incident:updated', (data) => {
      this.emit('incident:updated', data);
    });

    // SOS
    this.socket.on('sos:alert', (data) => {
      this.emit('sos:created', data);
      this.emit('sos:urgent', data);
    });

    // Tracking GPS
    this.socket.on('tracking:position_update', (data) => {
      this.emit('location:updated', data);
    });

    // Messages
    this.socket.on('message:new', (data) => {
      this.emit('message:received', data);
    });

    // Pong (heartbeat)
    this.socket.on('pong', (data) => {
      // Réponse au ping
    });
  }

  /**
   * Se déconnecter
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  /**
   * Envoyer un message au serveur
   */
  send(type, payload = {}) {
    if (this.socket?.connected) {
      this.socket.emit(type, payload);
    }
  }

  /**
   * Rejoindre une room (événement)
   */
  joinRoom(roomId) {
    this.rooms.add(roomId);
    if (this.socket?.connected) {
      this.socket.emit('event:join', roomId);
    }
  }

  /**
   * Quitter une room
   */
  leaveRoom(roomId) {
    this.rooms.delete(roomId);
    if (this.socket?.connected) {
      this.socket.emit('event:leave', roomId);
    }
  }

  /**
   * S'abonner à un événement
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Retourner une fonction de désabonnement
    return () => this.off(event, callback);
  }

  /**
   * Se désabonner d'un événement
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Émettre un événement local
   */
  emit(event, data, timestamp) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data, timestamp);
        } catch (error) {
          console.error(`❌ Erreur dans le listener ${event}:`, error);
        }
      });
    }
  }

  /**
   * MÉTHODES UTILITAIRES POUR LES ENTITÉS
   */

  // Users
  onUserCreated(callback) { return this.on('user:created', callback); }
  onUserUpdated(callback) { return this.on('user:updated', callback); }
  onUserDeleted(callback) { return this.on('user:deleted', callback); }
  onUserSelfUpdated(callback) { return this.on('user:self_updated', callback); }

  // Events
  onEventCreated(callback) { return this.on('event:created', callback); }
  onEventUpdated(callback) { return this.on('event:updated', callback); }
  onEventDeleted(callback) { return this.on('event:deleted', callback); }
  onEventStatusChanged(callback) { return this.on('event:status_changed', callback); }

  // Assignments
  onAssignmentCreated(callback) { return this.on('assignment:created', callback); }
  onAssignmentUpdated(callback) { return this.on('assignment:updated', callback); }
  onAssignmentDeleted(callback) { return this.on('assignment:deleted', callback); }
  onAssignmentConfirmed(callback) { return this.on('assignment:confirmed', callback); }
  onAssignmentReceived(callback) { return this.on('assignment:received', callback); }

  // Attendance
  onAttendanceCreated(callback) { return this.on('attendance:created', callback); }
  onAttendanceUpdated(callback) { return this.on('attendance:updated', callback); }
  onCheckIn(callback) { return this.on('checkin', callback); }
  onCheckOut(callback) { return this.on('checkout', callback); }

  // Notifications
  onNotificationCreated(callback) { return this.on('notification:created', callback); }
  onNotificationRead(callback) { return this.on('notification:read', callback); }

  // Incidents
  onIncidentCreated(callback) { return this.on('incident:created', callback); }
  onIncidentUpdated(callback) { return this.on('incident:updated', callback); }
  onIncidentResolved(callback) { return this.on('incident:resolved', callback); }
  onIncidentUrgent(callback) { return this.on('incident:urgent', callback); }

  // SOS
  onSOSCreated(callback) { return this.on('sos:created', callback); }
  onSOSResolved(callback) { return this.on('sos:resolved', callback); }
  onSOSUrgent(callback) { return this.on('sos:urgent', callback); }

  // Zones
  onZoneCreated(callback) { return this.on('zone:created', callback); }
  onZoneUpdated(callback) { return this.on('zone:updated', callback); }
  onZoneDeleted(callback) { return this.on('zone:deleted', callback); }

  // Geo Tracking
  onLocationUpdated(callback) { return this.on('location:updated', callback); }
  onLocationSelfUpdated(callback) { return this.on('location:self_updated', callback); }

  // Stats
  onStatsUpdated(callback) { return this.on('stats:updated', callback); }
}

// Instance singleton
const syncService = new SyncService();

export default syncService;
