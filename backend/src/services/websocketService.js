/**
 * SERVICE WEBSOCKET CENTRALISÉ
 * Synchronisation temps réel de toutes les données
 */

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // userId -> Set of WebSocket connections
    this.rooms = new Map(); // roomId -> Set of WebSocket connections
  }

  /**
   * Initialiser le serveur WebSocket
   */
  initialize(server) {
    const WebSocket = require('ws');
    
    console.log('🔧 Initialisation du serveur WebSocket sur /ws/sync...');
    
    try {
      this.wss = new WebSocket.Server({ 
        server, 
        path: '/ws/sync',
        // Désactiver la vérification du masque pour certains clients
        perMessageDeflate: false
      });

      // Log des erreurs du serveur WebSocket
      this.wss.on('error', (error) => {
        console.error('❌ Erreur serveur WebSocket:', error);
      });

      this.wss.on('connection', (ws, req) => {
        console.log('🔌 Nouvelle connexion WebSocket sync');
        console.log('📡 URL de connexion:', req.url);

        // Authentification via query params ou headers
        const url = new URL(req.url, 'http://localhost');
        const userId = url.searchParams.get('userId');
        const rooms = url.searchParams.get('rooms')?.split(',') || [];

        console.log('👤 UserId:', userId);
        console.log('🏠 Rooms:', rooms);

        if (userId) {
          this.addClientToUser(userId, ws);
          console.log(`✅ Client connecté pour user: ${userId}`);
        }

        rooms.forEach(room => {
          this.addClientToRoom(room, ws);
          console.log(`✅ Client rejoint la room: ${room}`);
        });

        // Message de bienvenue
        ws.send(JSON.stringify({
          type: 'connected',
          timestamp: new Date().toISOString(),
          message: 'Connecté au serveur de synchronisation'
        }));

        // Gestion des messages du client
        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message);
            this.handleClientMessage(ws, data, userId);
          } catch (error) {
            console.error('❌ Erreur parsing message WebSocket:', error);
          }
        });

        // Gestion de la déconnexion
        ws.on('close', () => {
          console.log('🔌 Client WebSocket sync déconnecté');
          this.removeClient(ws, userId, rooms);
        });

        // Gestion des erreurs
        ws.on('error', (error) => {
          console.error('❌ Erreur WebSocket client:', error);
        });
      });

      console.log('✅ Serveur WebSocket de synchronisation initialisé sur /ws/sync');
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du WebSocket:', error);
      throw error;
    }
  }

  /**
   * Ajouter un client à un utilisateur
   */
  addClientToUser(userId, ws) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(ws);
    ws.userId = userId;
  }

  /**
   * Ajouter un client à une room
   */
  addClientToRoom(roomId, ws) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId).add(ws);
    if (!ws.rooms) ws.rooms = new Set();
    ws.rooms.add(roomId);
  }

  /**
   * Retirer un client
   */
  removeClient(ws, userId, rooms) {
    if (userId && this.clients.has(userId)) {
      this.clients.get(userId).delete(ws);
      if (this.clients.get(userId).size === 0) {
        this.clients.delete(userId);
      }
    }

    rooms.forEach(roomId => {
      if (this.rooms.has(roomId)) {
        this.rooms.get(roomId).delete(ws);
        if (this.rooms.get(roomId).size === 0) {
          this.rooms.delete(roomId);
        }
      }
    });
  }

  /**
   * Gérer les messages du client
   */
  handleClientMessage(ws, data, userId) {
    const { type, payload } = data;

    switch (type) {
      case 'join_room':
        this.addClientToRoom(payload.roomId, ws);
        ws.send(JSON.stringify({
          type: 'room_joined',
          roomId: payload.roomId
        }));
        break;

      case 'leave_room':
        if (this.rooms.has(payload.roomId)) {
          this.rooms.get(payload.roomId).delete(ws);
        }
        if (ws.rooms) ws.rooms.delete(payload.roomId);
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        break;

      default:
        console.log('📦 Message WebSocket non géré:', type);
    }
  }

  /**
   * ÉMETTRE DES ÉVÉNEMENTS DE SYNCHRONISATION
   */

  // Événements généraux
  broadcast(event, data) {
    const message = JSON.stringify({
      type: 'sync',
      event,
      data,
      timestamp: new Date().toISOString()
    });

    this.wss?.clients.forEach(client => {
      if (client.readyState === 1) { // OPEN
        client.send(message);
      }
    });
  }

  // Envoyer à un utilisateur spécifique
  sendToUser(userId, event, data) {
    const message = JSON.stringify({
      type: 'sync',
      event,
      data,
      timestamp: new Date().toISOString()
    });

    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.forEach(client => {
        if (client.readyState === 1) {
          client.send(message);
        }
      });
    }
  }

  // Envoyer à une room spécifique
  sendToRoom(roomId, event, data) {
    const message = JSON.stringify({
      type: 'sync',
      event,
      data,
      timestamp: new Date().toISOString()
    });

    const roomClients = this.rooms.get(roomId);
    if (roomClients) {
      roomClients.forEach(client => {
        if (client.readyState === 1) {
          client.send(message);
        }
      });
    }
  }

  /**
   * ÉVÉNEMENTS DE SYNCHRONISATION PAR ENTITÉ
   */

  // Users
  userCreated(user) {
    this.broadcast('user:created', user);
  }

  userUpdated(user) {
    this.broadcast('user:updated', user);
    this.sendToUser(user.id, 'user:self_updated', user);
  }

  userDeleted(userId) {
    this.broadcast('user:deleted', { id: userId });
  }

  // Events
  eventCreated(event) {
    this.broadcast('event:created', event);
    this.sendToRoom(`event:${event.id}`, 'event:created', event);
  }

  eventUpdated(event) {
    this.broadcast('event:updated', event);
    this.sendToRoom(`event:${event.id}`, 'event:updated', event);
  }

  eventDeleted(eventId) {
    this.broadcast('event:deleted', { id: eventId });
    this.sendToRoom(`event:${eventId}`, 'event:deleted', { id: eventId });
  }

  eventStatusChanged(eventId, status, oldStatus) {
    this.broadcast('event:status_changed', { id: eventId, status, oldStatus });
    this.sendToRoom(`event:${eventId}`, 'event:status_changed', { id: eventId, status, oldStatus });
  }

  // Assignments
  assignmentCreated(assignment) {
    this.broadcast('assignment:created', assignment);
    this.sendToUser(assignment.agentId, 'assignment:received', assignment);
    this.sendToRoom(`event:${assignment.eventId}`, 'assignment:created', assignment);
  }

  assignmentUpdated(assignment) {
    this.broadcast('assignment:updated', assignment);
    this.sendToUser(assignment.agentId, 'assignment:updated', assignment);
    this.sendToRoom(`event:${assignment.eventId}`, 'assignment:updated', assignment);
  }

  assignmentDeleted(assignmentId, agentId, eventId) {
    this.broadcast('assignment:deleted', { id: assignmentId });
    this.sendToUser(agentId, 'assignment:deleted', { id: assignmentId });
    this.sendToRoom(`event:${eventId}`, 'assignment:deleted', { id: assignmentId });
  }

  assignmentConfirmed(assignment) {
    this.broadcast('assignment:confirmed', assignment);
    this.sendToUser(assignment.agentId, 'assignment:confirmed', assignment);
    this.sendToRoom(`event:${assignment.eventId}`, 'assignment:confirmed', assignment);
  }

  // Attendance
  attendanceCreated(attendance) {
    this.broadcast('attendance:created', attendance);
    this.sendToUser(attendance.agentId, 'attendance:created', attendance);
    this.sendToRoom(`event:${attendance.eventId}`, 'attendance:created', attendance);
  }

  attendanceUpdated(attendance) {
    this.broadcast('attendance:updated', attendance);
    this.sendToUser(attendance.agentId, 'attendance:updated', attendance);
    this.sendToRoom(`event:${attendance.eventId}`, 'attendance:updated', attendance);
  }

  // Check-in/Check-out
  checkIn(attendance, agent) {
    this.broadcast('checkin', { attendance, agent });
    this.sendToRoom(`event:${attendance.eventId}`, 'checkin', { attendance, agent });
  }

  checkOut(attendance, agent) {
    this.broadcast('checkout', { attendance, agent });
    this.sendToRoom(`event:${attendance.eventId}`, 'checkout', { attendance, agent });
  }

  // Notifications
  notificationCreated(notification) {
    this.sendToUser(notification.userId, 'notification:created', notification);
  }

  notificationRead(notificationId, userId) {
    this.sendToUser(userId, 'notification:read', { id: notificationId });
  }

  // Incidents
  incidentCreated(incident) {
    this.broadcast('incident:created', incident);
    this.sendToRoom(`event:${incident.eventId}`, 'incident:created', incident);
    if (incident.severity === 'high' || incident.severity === 'critical') {
      this.broadcast('incident:urgent', incident);
    }
  }

  incidentUpdated(incident) {
    this.broadcast('incident:updated', incident);
    this.sendToRoom(`event:${incident.eventId}`, 'incident:updated', incident);
  }

  incidentResolved(incidentId, eventId) {
    this.broadcast('incident:resolved', { id: incidentId });
    this.sendToRoom(`event:${eventId}`, 'incident:resolved', { id: incidentId });
  }

  // SOS Alerts
  sosAlertCreated(alert) {
    this.broadcast('sos:created', alert);
    this.sendToRoom(`event:${alert.eventId}`, 'sos:created', alert);
    // Notification urgente
    this.broadcast('sos:urgent', alert);
  }

  sosAlertResolved(alertId, eventId) {
    this.broadcast('sos:resolved', { id: alertId });
    this.sendToRoom(`event:${eventId}`, 'sos:resolved', { id: alertId });
  }

  // Zones
  zoneCreated(zone) {
    this.broadcast('zone:created', zone);
  }

  zoneUpdated(zone) {
    this.broadcast('zone:updated', zone);
  }

  zoneDeleted(zoneId) {
    this.broadcast('zone:deleted', { id: zoneId });
  }

  // Geo Tracking
  locationUpdated(userId, location) {
    this.broadcast('location:updated', { userId, ...location });
    this.sendToUser(userId, 'location:self_updated', location);
  }

  // Statistiques en temps réel
  statsUpdated(type, stats) {
    this.broadcast('stats:updated', { type, stats });
  }
}

// Instance singleton
const websocketService = new WebSocketService();

module.exports = websocketService;
