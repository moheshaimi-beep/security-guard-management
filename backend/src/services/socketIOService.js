/**
 * 🚀 SERVICE SOCKET.IO CENTRALISÉ
 * Gestion temps réel de toutes les fonctionnalités :
 * - Tracking GPS
 * - Notifications
 * - Messages
 * - Incidents
 * - Check-in/out
 * - Synchronisation données
 */

const { User, Event, GeoTracking } = require('../models');
const { Op } = require('sequelize');

class SocketIOService {
  constructor() {
    this.io = null;
    this.connections = new Map(); // socketId -> { userId, role, eventId, rooms }
    this.userSockets = new Map(); // userId -> Set of socketIds
    this.agentPositions = new Map(); // userId -> positionData
    this.lastMovement = new Map(); // userId -> timestamp
  }

  /**
   * Initialiser Socket.IO avec tous les événements
   */
  initialize(io) {
    this.io = io;
    
    console.log('🔧 Initialisation Socket.IO Service...');
    
    // Namespace principal pour toutes les communications
    this.io.on('connection', (socket) => {
      console.log(`✅ Client Socket.IO connecté: ${socket.id}`);
      
      // Authentification
      socket.on('auth', (data) => this.handleAuth(socket, data));
      
      // Tracking GPS
      socket.on('tracking:position', (data) => this.handlePositionUpdate(socket, data));
      socket.on('tracking:subscribe', (eventId) => this.subscribeToTracking(socket, eventId));
      socket.on('tracking:unsubscribe', (eventId) => this.unsubscribeFromTracking(socket, eventId));
      
      // Events
      socket.on('event:join', (eventId) => this.joinEvent(socket, eventId));
      socket.on('event:leave', (eventId) => this.leaveEvent(socket, eventId));
      
      // Notifications
      socket.on('notifications:subscribe', () => this.subscribeToNotifications(socket));
      socket.on('notifications:mark_read', (notificationId) => this.markNotificationRead(socket, notificationId));
      
      // Messages
      socket.on('message:send', (data) => this.handleMessageSend(socket, data));
      socket.on('messages:subscribe', (roomId) => this.subscribeToMessages(socket, roomId));
      
      // Incidents
      socket.on('incident:create', (data) => this.handleIncidentCreate(socket, data));
      socket.on('incident:update', (data) => this.handleIncidentUpdate(socket, data));
      
      // Check-in/out
      socket.on('checkin:subscribe', (eventId) => this.subscribeToCheckin(socket, eventId));
      
      // SOS
      socket.on('sos:trigger', (data) => this.handleSOSTrigger(socket, data));
      
      // Déconnexion
      socket.on('disconnect', () => this.handleDisconnect(socket));
      
      // Heartbeat pour maintenir la connexion
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });
    });
    
    console.log('✅ Socket.IO Service initialisé avec succès');
  }

  /**
   * Authentification du client Socket.IO
   */
  async handleAuth(socket, data) {
    try {
      const { userId, role, eventId, token } = data;
      
      console.log('🔐 Authentification Socket.IO:', { userId, role, eventId });
      
      // Vérifier que l'utilisateur existe
      let user = await User.findByPk(userId);
      if (!user) {
        // Essayer par CIN
        user = await User.findOne({ where: { cin: userId } });
      }
      
      if (!user) {
        console.error('❌ Utilisateur non trouvé:', userId);
        socket.emit('auth:error', { message: 'Utilisateur non trouvé' });
        socket.disconnect();
        return;
      }
      
      // Stocker la connexion
      this.connections.set(socket.id, {
        userId: user.id,
        userIdentifier: userId,
        role: role || user.role,
        eventId,
        rooms: new Set(),
        socket
      });
      
      // Ajouter aux sockets de l'utilisateur
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id).add(socket.id);
      
      // Rejoindre la room de l'utilisateur
      socket.join(`user:${user.id}`);
      
      // Si un événement est spécifié, rejoindre sa room
      if (eventId) {
        socket.join(`event:${eventId}`);
        this.connections.get(socket.id).rooms.add(`event:${eventId}`);
      }
      
      // Envoyer confirmation
      socket.emit('auth:success', {
        userId: user.id,
        userIdentifier: userId,
        role: user.role,
        message: 'Authentification réussie'
      });
      
      console.log(`✅ Client authentifié: ${user.role} ${userId} (${socket.id})`);
      
      // Si superviseur/admin, envoyer les positions actuelles
      if (['admin', 'supervisor', 'responsable'].includes(user.role) && eventId) {
        await this.sendCurrentPositions(socket, eventId);
      }
    } catch (error) {
      console.error('❌ Erreur authentification Socket.IO:', error);
      socket.emit('auth:error', { message: 'Erreur d\'authentification' });
    }
  }

  /**
   * Mise à jour de position GPS
   */
  async handlePositionUpdate(socket, data) {
    try {
      const connection = this.connections.get(socket.id);
      if (!connection) {
        socket.emit('tracking:error', { message: 'Non authentifié' });
        return;
      }
      
      const { latitude, longitude, accuracy, speed, heading, batteryLevel, isMoving } = data;
      const { userId, userIdentifier } = connection;
      
      // Déterminer si l'agent est en mouvement
      const lastMove = this.lastMovement.get(userId);
      const now = Date.now();
      const isCurrentlyMoving = isMoving !== undefined ? isMoving : (speed > 0.5 || (lastMove && (now - lastMove) < 5000));
      
      if (isCurrentlyMoving) {
        this.lastMovement.set(userId, now);
      }
      
      // Récupérer les infos utilisateur
      const user = await User.findByPk(userId, {
        attributes: ['id', 'firstName', 'lastName', 'employeeId', 'role', 'phone', 'cin']
      });
      
      // Créer l'objet position
      const positionData = {
        userId: userIdentifier,
        latitude,
        longitude,
        accuracy,
        speed: speed || 0,
        heading: heading || null,
        batteryLevel: batteryLevel || null,
        timestamp: Date.now(),
        isMoving: isCurrentlyMoving,
        user: user ? {
          id: user.id,
          cin: user.cin,
          firstName: user.firstName,
          lastName: user.lastName,
          employeeId: user.employeeId,
          role: user.role,
          phone: user.phone
        } : null
      };
      
      // Stocker la position
      this.agentPositions.set(userIdentifier, positionData);
      
      // Sauvegarder en base de données
      if (connection.eventId) {
        try {
          await GeoTracking.create({
            userId: userId,
            eventId: connection.eventId,
            latitude,
            longitude,
            accuracy,
            speed: speed || null,
            heading: heading || null,
            batteryLevel: batteryLevel || null,
            isMoving: isCurrentlyMoving,
            timestamp: new Date()
          });
        } catch (dbError) {
          console.error('❌ Erreur sauvegarde position:', dbError.message);
        }
      }
      
      // Diffuser la position à tous les superviseurs/admins de l'événement
      if (connection.eventId) {
        this.io.to(`event:${connection.eventId}`).emit('tracking:position_update', positionData);
      }
      
      // Confirmer la réception
      socket.emit('tracking:position_ack', {
        timestamp: Date.now(),
        received: true
      });
      
      console.log(`📍 Position mise à jour: ${user?.firstName} ${user?.lastName} (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`);
    } catch (error) {
      console.error('❌ Erreur mise à jour position:', error);
      socket.emit('tracking:error', { message: error.message });
    }
  }

  /**
   * Envoyer les positions actuelles
   */
  async sendCurrentPositions(socket, eventId) {
    try {
      const positions = [];
      
      // Récupérer toutes les positions de l'événement
      for (const [userId, position] of this.agentPositions.entries()) {
        positions.push(position);
      }
      
      // Récupérer aussi les dernières positions depuis la DB
      const dbPositions = await GeoTracking.findAll({
        where: {
          eventId,
          timestamp: {
            [Op.gte]: new Date(Date.now() - 5 * 60 * 1000) // Dernières 5 minutes
          }
        },
        include: [{
          model: User,
          attributes: ['id', 'firstName', 'lastName', 'employeeId', 'role', 'phone', 'cin']
        }],
        order: [['timestamp', 'DESC']],
        limit: 100
      });
      
      const dbPositionsFormatted = dbPositions.map(pos => ({
        userId: pos.User?.cin || pos.userId,
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
        speed: pos.speed,
        heading: pos.heading,
        batteryLevel: pos.batteryLevel,
        timestamp: pos.timestamp.getTime(),
        isMoving: pos.isMoving,
        user: pos.User ? {
          id: pos.User.id,
          cin: pos.User.cin,
          firstName: pos.User.firstName,
          lastName: pos.User.lastName,
          employeeId: pos.User.employeeId,
          role: pos.User.role,
          phone: pos.User.phone
        } : null
      }));
      
      // Fusionner et dédupliquer
      const allPositions = [...positions, ...dbPositionsFormatted];
      const uniquePositions = Array.from(
        new Map(allPositions.map(p => [p.userId, p])).values()
      );
      
      socket.emit('tracking:current_positions', uniquePositions);
      console.log(`📊 Envoyé ${uniquePositions.length} positions actuelles`);
    } catch (error) {
      console.error('❌ Erreur envoi positions actuelles:', error);
    }
  }

  /**
   * S'abonner au tracking GPS d'un événement
   */
  subscribeToTracking(socket, eventId) {
    const connection = this.connections.get(socket.id);
    if (!connection) return;
    
    socket.join(`tracking:${eventId}`);
    connection.rooms.add(`tracking:${eventId}`);
    
    console.log(`📡 Client ${socket.id} abonné au tracking de l'événement ${eventId}`);
    
    // Envoyer les positions actuelles
    this.sendCurrentPositions(socket, eventId);
  }

  /**
   * Se désabonner du tracking GPS
   */
  unsubscribeFromTracking(socket, eventId) {
    const connection = this.connections.get(socket.id);
    if (!connection) return;
    
    socket.leave(`tracking:${eventId}`);
    connection.rooms.delete(`tracking:${eventId}`);
    
    console.log(`📡 Client ${socket.id} désabonné du tracking de l'événement ${eventId}`);
  }

  /**
   * Rejoindre un événement
   */
  joinEvent(socket, eventId) {
    const connection = this.connections.get(socket.id);
    if (!connection) return;
    
    socket.join(`event:${eventId}`);
    connection.rooms.add(`event:${eventId}`);
    connection.eventId = eventId;
    
    console.log(`🎯 Client ${socket.id} a rejoint l'événement ${eventId}`);
  }

  /**
   * Quitter un événement
   */
  leaveEvent(socket, eventId) {
    const connection = this.connections.get(socket.id);
    if (!connection) return;
    
    socket.leave(`event:${eventId}`);
    connection.rooms.delete(`event:${eventId}`);
    
    console.log(`🎯 Client ${socket.id} a quitté l'événement ${eventId}`);
  }

  /**
   * S'abonner aux notifications
   */
  subscribeToNotifications(socket) {
    const connection = this.connections.get(socket.id);
    if (!connection) return;
    
    socket.join(`notifications:${connection.userId}`);
    console.log(`🔔 Client ${socket.id} abonné aux notifications`);
  }

  /**
   * Marquer une notification comme lue
   */
  markNotificationRead(socket, notificationId) {
    const connection = this.connections.get(socket.id);
    if (!connection) return;
    
    // Émettre à tous les clients de l'utilisateur
    this.io.to(`user:${connection.userId}`).emit('notification:read', { notificationId });
  }

  /**
   * Envoyer un message
   */
  handleMessageSend(socket, data) {
    const connection = this.connections.get(socket.id);
    if (!connection) return;
    
    const { roomId, message, recipientId } = data;
    
    // Diffuser le message
    if (roomId) {
      this.io.to(`messages:${roomId}`).emit('message:new', {
        ...data,
        senderId: connection.userId,
        timestamp: Date.now()
      });
    } else if (recipientId) {
      this.io.to(`user:${recipientId}`).emit('message:new', {
        ...data,
        senderId: connection.userId,
        timestamp: Date.now()
      });
    }
  }

  /**
   * S'abonner aux messages d'une room
   */
  subscribeToMessages(socket, roomId) {
    socket.join(`messages:${roomId}`);
    console.log(`💬 Client ${socket.id} abonné aux messages de la room ${roomId}`);
  }

  /**
   * Créer un incident
   */
  handleIncidentCreate(socket, data) {
    const connection = this.connections.get(socket.id);
    if (!connection) return;
    
    // Diffuser l'incident à tous les superviseurs de l'événement
    if (connection.eventId) {
      this.io.to(`event:${connection.eventId}`).emit('incident:new', {
        ...data,
        createdBy: connection.userId,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Mettre à jour un incident
   */
  handleIncidentUpdate(socket, data) {
    const connection = this.connections.get(socket.id);
    if (!connection) return;
    
    // Diffuser la mise à jour
    if (connection.eventId) {
      this.io.to(`event:${connection.eventId}`).emit('incident:updated', {
        ...data,
        updatedBy: connection.userId,
        timestamp: Date.now()
      });
    }
  }

  /**
   * S'abonner aux check-in d'un événement
   */
  subscribeToCheckin(socket, eventId) {
    socket.join(`checkin:${eventId}`);
    console.log(`✓ Client ${socket.id} abonné aux check-in de l'événement ${eventId}`);
  }

  /**
   * Déclencher une alerte SOS
   */
  handleSOSTrigger(socket, data) {
    const connection = this.connections.get(socket.id);
    if (!connection) return;
    
    console.log(`🚨 ALERTE SOS déclenchée par ${connection.userId}`);
    
    // Diffuser l'alerte SOS à tous les superviseurs
    if (connection.eventId) {
      this.io.to(`event:${connection.eventId}`).emit('sos:alert', {
        ...data,
        userId: connection.userId,
        timestamp: Date.now(),
        severity: 'critical'
      });
    }
    
    // Diffuser aussi globalement aux admins
    this.io.emit('sos:alert', {
      ...data,
      userId: connection.userId,
      eventId: connection.eventId,
      timestamp: Date.now(),
      severity: 'critical'
    });
  }

  /**
   * Déconnexion
   */
  handleDisconnect(socket) {
    const connection = this.connections.get(socket.id);
    
    if (connection) {
      console.log(`❌ Client Socket.IO déconnecté: ${socket.id} (${connection.userIdentifier})`);
      
      // Retirer de la liste des sockets de l'utilisateur
      const userSocketsSet = this.userSockets.get(connection.userId);
      if (userSocketsSet) {
        userSocketsSet.delete(socket.id);
        if (userSocketsSet.size === 0) {
          this.userSockets.delete(connection.userId);
        }
      }
      
      // Supprimer la connexion
      this.connections.delete(socket.id);
    } else {
      console.log(`❌ Client Socket.IO déconnecté: ${socket.id}`);
    }
  }

  /**
   * Méthodes utilitaires pour émettre des événements depuis les routes
   */

  // Émettre à tous les clients
  emit(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  // Émettre à un utilisateur spécifique
  emitToUser(userId, event, data) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  // Émettre à un événement
  emitToEvent(eventId, event, data) {
    if (this.io) {
      this.io.to(`event:${eventId}`).emit(event, data);
    }
  }

  // Émettre une notification
  emitNotification(userId, notification) {
    this.emitToUser(userId, 'notification:new', notification);
  }

  // Émettre un check-in
  emitCheckin(eventId, checkinData) {
    if (this.io) {
      this.io.to(`checkin:${eventId}`).emit('checkin:new', checkinData);
      this.io.to(`event:${eventId}`).emit('checkin:new', checkinData);
    }
  }

  // Émettre une mise à jour d'incident
  emitIncidentUpdate(eventId, incidentData) {
    this.emitToEvent(eventId, 'incident:updated', incidentData);
  }
}

// Export singleton
const socketIOService = new SocketIOService();
module.exports = socketIOService;
