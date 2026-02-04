/**
 * SERVEUR WEBSOCKET POUR TRACKING GPS TEMPS RÉEL
 * 🚀 Diffusion instantanée des positions des agents
 */

const WebSocket = require('ws');
const { GeoTracking, User, Event } = require('../models');
const { Op } = require('sequelize');

class TrackingWebSocketServer {
  constructor(server) {
    // ✅ CONFIG MINIMALE (comme test-ws-server.js qui fonctionne!)
    this.wss = new WebSocket.Server({ 
      server: server,
      path: '/ws/tracking'
      // PAS de perMessageDeflate, maxPayload, clientTracking
    });
    
    this.clients = new Map(); // Map<wsClient, { userId, role, eventId }>
    this.agentPositions = new Map(); // Map<userId, positionData>
    this.lastMovement = new Map(); // Map<userId, timestamp>
    
    this.setupWebSocketServer();
    
    console.log('🚀 Serveur WebSocket Tracking GPS démarré sur /ws/tracking');
  }
  
  setupWebSocketServer() {
    console.log('🔧 Configuration du handler WebSocket...');
    
    // 🎯 COPIE EXACTE DU TEST SERVER QUI FONCTIONNE!
    this.wss.on('connection', (ws) => {
      console.log('✅ CLIENT CONNECTÉ !');
      
      // Envoyer message TEXTE BRUT immédiatement (comme test server)
      ws.send('Bonjour du serveur GPS!');
      console.log('📤 Message envoyé au client');
      
      // Écouter messages
      ws.on('message', (msg) => {
        console.log('📥 MESSAGE REÇU:', msg.toString());
        ws.send(`Echo: ${msg}`);
      });
      
      ws.on('close', () => {
        console.log('❌ CLIENT DÉCONNECTÉ');
      });
      
      ws.on('error', (err) => {
        console.error('❌ ERREUR:', err.message);
      });
    });
    
    console.log('✅ Handler WebSocket configuré');
  }
  
  async handleAuth(ws, data) {
    try {
      const { userId, role, eventId } = data;
      
      console.log('🔐 Tentative d\'authentification WebSocket:', { userId, role, eventId });
      
      // Vérifier que l'utilisateur existe (userId peut être un UUID ou un CIN)
      let user = await User.findByPk(userId);
      if (!user) {
        // Essayer de trouver par CIN
        user = await User.findOne({ where: { cin: userId } });
      }
      
      if (!user) {
        console.error('❌ Utilisateur non trouvé:', userId);
        ws.send(JSON.stringify({ type: 'error', message: 'Utilisateur non trouvé' }));
        ws.close();
        return;
      }
      
      // Stocker les infos du client avec l'UUID réel de l'utilisateur
      this.clients.set(ws, { userId: user.id, userIdentifier: userId, role, eventId });
      console.log('✅ Client authentifié:', { userId: user.id, userIdentifier: userId, role, eventId });
      
      // Envoyer confirmation
      ws.send(JSON.stringify({ 
        type: 'auth_success', 
        message: 'Authentification réussie',
        role,
        userId 
      }));
      
      // Si c'est un superviseur/admin, envoyer les positions actuelles
      if (role === 'admin' || role === 'supervisor' || role === 'responsable') {
        await this.sendCurrentPositions(ws, eventId);
      }
      
      console.log(`✅ Client authentifié: ${role} ${userId}`);
    } catch (error) {
      console.error('❌ Erreur authentification:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Erreur d\'authentification' }));
    }
  }
  
  async handlePositionUpdate(ws, data) {
    try {
      const { userId, latitude, longitude, accuracy, speed, heading, batteryLevel, timestamp, isMoving } = data;
      const clientInfo = this.clients.get(ws);
      
      if (!clientInfo || clientInfo.userIdentifier !== userId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Non autorisé' }));
        return;
      }
      
      // Utiliser l'UUID réel pour les opérations internes
      const realUserId = clientInfo.userId;
      
      // Déterminer si l'agent est en mouvement
      const lastMove = this.lastMovement.get(realUserId);
      const now = Date.now();
      const isCurrentlyMoving = isMoving !== undefined ? isMoving : (speed > 0.5 || (lastMove && (now - lastMove) < 5000)); // En mouvement si vitesse > 0.5 m/s ou dernier mouvement < 5s
      
      if (isCurrentlyMoving) {
        this.lastMovement.set(realUserId, now);
      }
      
      // Récupérer les infos utilisateur
      const user = await User.findByPk(realUserId, {
        attributes: ['id', 'firstName', 'lastName', 'employeeId', 'role', 'phone', 'cin']
      });
      
      // Créer l'objet position
      const positionData = {
        userId, // Garder le CIN pour le frontend
        latitude,
        longitude,
        accuracy,
        speed: speed || 0,
        heading: heading || null,
        batteryLevel: batteryLevel || null,
        timestamp: timestamp || Date.now(),
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
      
      // Stocker la position (utiliser le CIN comme clé pour compatibilité frontend)
      this.agentPositions.set(userId, positionData);
      
      // Diffuser la position à tous les superviseurs/admins IMMÉDIATEMENT
      this.broadcastPosition(positionData);
      
      console.log(`📍 Position mise à jour: ${user.firstName} ${user.lastName} - ${isCurrentlyMoving ? '🏃 En mouvement' : '🛑 À l\'arrêt'}`);
      
      // Enregistrer dans la base de données (utiliser l'UUID réel)
      try {
        await GeoTracking.create({
          userId: realUserId, // UUID pour la base de données
          latitude,
          longitude,
          accuracy,
          speed: speed || 0,
          heading,
          batteryLevel,
          recordedAt: new Date(timestamp || Date.now())
        });
      } catch (dbError) {
        // Log l'erreur mais ne pas bloquer la diffusion
        console.error('⚠️  Erreur sauvegarde GeoTracking (position diffusée):', dbError.message);
      }
      
    } catch (error) {
      console.error('❌ Erreur mise à jour position:', error);
    }
  }
  
  handleEventSubscription(ws, data) {
    const { eventId } = data;
    const clientInfo = this.clients.get(ws);
    
    if (clientInfo) {
      clientInfo.eventId = eventId;
      this.clients.set(ws, clientInfo);
      console.log(`📌 Client ${clientInfo.userId} abonné à l'événement ${eventId}`);
    }
  }
  
  async sendCurrentPositions(ws, eventId = null) {
    try {
      // Récupérer toutes les positions actives
      const positions = Array.from(this.agentPositions.values());
      
      // Filtrer par événement si spécifié
      let filteredPositions = positions;
      if (eventId) {
        // TODO: Filtrer par agents assignés à l'événement
        // Pour l'instant on envoie toutes les positions
      }
      
      ws.send(JSON.stringify({
        type: 'initial_positions',
        positions: filteredPositions
      }));
      
      console.log(`📤 ${filteredPositions.length} position(s) envoyée(s) au client`);
    } catch (error) {
      console.error('❌ Erreur envoi positions initiales:', error);
    }
  }
  
  broadcastPosition(positionData) {
    const message = JSON.stringify({
      type: 'position_update',
      position: positionData
    });
    
    let sentCount = 0;
    let totalClients = 0;
    let filteredOut = [];
    
    this.clients.forEach((clientInfo, ws) => {
      totalClients++;
      // Envoyer uniquement aux superviseurs, admins et responsables
      if (clientInfo.role === 'admin' || clientInfo.role === 'supervisor' || clientInfo.role === 'responsable') {
        // Filtrer par événement si le client est abonné à un événement spécifique
        // Pour l'instant on envoie à tout le monde
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
          sentCount++;
        }
      } else {
        filteredOut.push({ role: clientInfo.role, userId: clientInfo.userIdentifier });
      }
    });
    
    if (sentCount > 0) {
      console.log(`📡 Position diffusée à ${sentCount}/${totalClients} client(s)`);
    }
    
    if (filteredOut.length > 0) {
      console.log(`⚠️ Clients filtrés (role non autorisé):`, filteredOut);
    }
    
    if (totalClients > 0 && sentCount === 0) {
      console.error(`❌ Aucun client n'a reçu la position! Total: ${totalClients}, Filtrés: ${filteredOut.length}`);
    }
  }
  
  // Nettoyer les positions obsolètes (pas de mise à jour depuis 5 minutes)
  cleanStalePositions() {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    this.agentPositions.forEach((position, userId) => {
      if (position.timestamp < fiveMinutesAgo) {
        this.agentPositions.delete(userId);
        console.log(`🧹 Position obsolète supprimée: ${userId}`);
      }
    });
  }
  
  startPeriodicCleanup() {
    // Nettoyer toutes les 2 minutes
    setInterval(() => {
      this.cleanStalePositions();
    }, 2 * 60 * 1000);
  }
  
  shutdown() {
    console.log('🔄 Arrêt du serveur WebSocket Tracking...');
    this.wss.close();
  }
}

module.exports = TrackingWebSocketServer;
