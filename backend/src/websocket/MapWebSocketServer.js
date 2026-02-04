/**
 * SERVEUR WEBSOCKET POUR CARTE DYNAMIQUE
 * 🚀 Mises à jour temps réel des événements et agents
 */

const WebSocket = require('ws');
const { Event, User, Attendance, Assignment } = require('../models');
const { Op } = require('sequelize');

class MapWebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      port: 3001,
      path: '/ws/map-updates'
    });
    
    this.clients = new Set();
    this.updateInterval = null;
    this.lastUpdate = new Date();
    
    this.setupWebSocketServer();
    this.startPeriodicUpdates();
    
    console.log('🚀 Serveur WebSocket carte démarré sur le port 3001');
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      console.log('🟢 Nouvelle connexion carte WebSocket');
      
      this.clients.add(ws);
      
      // Envoyer les données initiales
      this.sendInitialData(ws);
      
      // Gérer les messages du client
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error('❌ Erreur parsing message client:', error);
        }
      });
      
      // Nettoyer à la déconnexion
      ws.on('close', () => {
        console.log('🔴 Déconnexion carte WebSocket');
        this.clients.delete(ws);
      });
      
      // Gérer les erreurs
      ws.on('error', (error) => {
        console.error('❌ Erreur WebSocket:', error);
        this.clients.delete(ws);
      });
      
      // Ping/Pong pour maintenir la connexion
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);
    });
  }

  async sendInitialData(ws) {
    try {
      // Récupérer les données actuelles
      const [events, agents] = await Promise.all([
        this.getCurrentEvents(),
        this.getCurrentAgents()
      ]);
      
      const initialData = {
        type: 'initial_data',
        payload: {
          events,
          agents,
          timestamp: new Date()
        }
      };
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(initialData));
      }
    } catch (error) {
      console.error('❌ Erreur envoi données initiales:', error);
    }
  }

  handleClientMessage(ws, data) {
    const { type, payload } = data;
    
    switch (type) {
      case 'subscribe_event':
        this.subscribeToEvent(ws, payload.eventId);
        break;
      case 'subscribe_agent':
        this.subscribeToAgent(ws, payload.agentId);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
      default:
        console.log('📦 Message client inconnu:', type);
    }
  }

  /**
   * 📡 MISES À JOUR PÉRIODIQUES
   */
  startPeriodicUpdates() {
    // Vérifier les mises à jour toutes les 10 secondes
    this.updateInterval = setInterval(async () => {
      await this.checkForUpdates();
    }, 10000);
    
    console.log('⏰ Mises à jour périodiques démarrées (10s)');
  }

  async checkForUpdates() {
    try {
      // Vérifier les événements modifiés
      const updatedEvents = await Event.findAll({
        where: {
          updatedAt: {
            [Op.gt]: this.lastUpdate
          }
        },
        include: [
          {
            model: Assignment,
            as: 'assignments',
            include: [
              {
                model: User,
                as: 'agent',
                attributes: ['id', 'firstName', 'lastName', 'status']
              }
            ]
          }
        ]
      });

      if (updatedEvents.length > 0) {
        this.broadcastEventUpdates(updatedEvents);
      }

      // Vérifier les positions d'agents mises à jour
      const updatedAgents = await User.findAll({
        where: {
          role: 'agent',
          [Op.or]: [
            { lastLocationUpdate: { [Op.gt]: this.lastUpdate } },
            { updatedAt: { [Op.gt]: this.lastUpdate } }
          ]
        },
        attributes: [
          'id', 'firstName', 'lastName', 'status', 
          'latitude', 'longitude', 'lastLocationUpdate'
        ]
      });

      if (updatedAgents.length > 0) {
        this.broadcastAgentUpdates(updatedAgents);
      }

      // Vérifier les nouveaux pointages
      const newAttendances = await Attendance.findAll({
        where: {
          createdAt: {
            [Op.gt]: this.lastUpdate
          }
        },
        include: [
          {
            model: Event,
            attributes: ['id', 'name', 'location']
          },
          {
            model: User,
            attributes: ['id', 'firstName', 'lastName']
          }
        ]
      });

      if (newAttendances.length > 0) {
        this.broadcastAttendanceUpdates(newAttendances);
      }

      this.lastUpdate = new Date();
      
    } catch (error) {
      console.error('❌ Erreur vérification mises à jour:', error);
    }
  }

  /**
   * 📍 DIFFUSION MISES À JOUR ÉVÉNEMENTS
   */
  broadcastEventUpdates(events) {
    events.forEach(event => {
      const eventData = event.toJSON();
      
      // Calculer le statut
      const now = new Date();
      const start = new Date(eventData.startDate);
      const end = new Date(eventData.endDate);
      
      let status = 'upcoming';
      if (now >= start && now <= end) {
        status = 'ongoing';
      } else if (now > end) {
        status = 'completed';
      }

      const updateData = {
        type: 'event_update',
        payload: {
          ...eventData,
          status,
          assignedAgents: eventData.assignments?.length || 0,
          agents: eventData.assignments?.map(a => a.agent) || []
        },
        timestamp: new Date()
      };

      this.broadcast(updateData);
      console.log(`📍 Événement mis à jour diffusé: ${eventData.name}`);
    });
  }

  /**
   * 👤 DIFFUSION MISES À JOUR AGENTS
   */
  broadcastAgentUpdates(agents) {
    agents.forEach(agent => {
      const agentData = agent.toJSON();
      
      const updateData = {
        type: 'agent_location',
        payload: agentData,
        timestamp: new Date()
      };

      this.broadcast(updateData);
      console.log(`👤 Position agent diffusée: ${agentData.firstName} ${agentData.lastName}`);
    });
  }

  /**
   * ⏰ DIFFUSION MISES À JOUR POINTAGES
   */
  async broadcastAttendanceUpdates(attendances) {
    for (const attendance of attendances) {
      const attendanceData = attendance.toJSON();
      
      // Compter le nombre d'agents pointés pour cet événement
      const agentsCount = await Attendance.count({
        where: { 
          eventId: attendanceData.eventId,
          clockInTime: { [Op.ne]: null }
        }
      });

      const updateData = {
        type: 'attendance_update',
        payload: {
          ...attendanceData,
          agentsCount,
          eventName: attendanceData.Event?.name,
          agentName: `${attendanceData.User?.firstName} ${attendanceData.User?.lastName}`
        },
        timestamp: new Date()
      };

      this.broadcast(updateData);
      console.log(`⏰ Pointage diffusé: ${updateData.payload.agentName} -> ${updateData.payload.eventName}`);
    }
  }

  /**
   * 🚨 DIFFUSION ALERTE D'URGENCE
   */
  broadcastEmergencyAlert(alertData) {
    const emergencyData = {
      type: 'emergency',
      payload: {
        ...alertData,
        priority: 'critical',
        requiresAction: true
      },
      timestamp: new Date()
    };

    this.broadcast(emergencyData);
    console.log('🚨 ALERTE D\'URGENCE DIFFUSÉE:', alertData);
  }

  /**
   * 📡 FONCTIONS DE DIFFUSION
   */
  broadcast(data) {
    const message = JSON.stringify(data);
    const deadClients = new Set();
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          console.error('❌ Erreur envoi à client:', error);
          deadClients.add(client);
        }
      } else {
        deadClients.add(client);
      }
    });
    
    // Nettoyer les clients déconnectés
    deadClients.forEach(client => {
      this.clients.delete(client);
    });
  }

  subscribeToEvent(ws, eventId) {
    // Marquer le client comme intéressé par cet événement
    if (!ws.subscribedEvents) {
      ws.subscribedEvents = new Set();
    }
    ws.subscribedEvents.add(eventId);
    
    console.log(`📍 Client abonné à l'événement ${eventId}`);
  }

  subscribeToAgent(ws, agentId) {
    // Marquer le client comme intéressé par cet agent
    if (!ws.subscribedAgents) {
      ws.subscribedAgents = new Set();
    }
    ws.subscribedAgents.add(agentId);
    
    console.log(`👤 Client abonné à l'agent ${agentId}`);
  }

  /**
   * 📊 RÉCUPÉRATION DONNÉES ACTUELLES
   */
  async getCurrentEvents() {
    try {
      const events = await Event.findAll({
        where: {
          endDate: { [Op.gte]: new Date() }
        },
        include: [
          {
            model: Assignment,
            as: 'assignments',
            include: [
              {
                model: User,
                as: 'agent',
                attributes: ['id', 'firstName', 'lastName', 'status']
              }
            ]
          }
        ],
        order: [['startDate', 'ASC']]
      });

      return events.map(event => {
        const eventData = event.toJSON();
        const now = new Date();
        const start = new Date(eventData.startDate);
        const end = new Date(eventData.endDate);
        
        let status = 'upcoming';
        if (now >= start && now <= end) {
          status = 'ongoing';
        } else if (now > end) {
          status = 'completed';
        }

        return {
          ...eventData,
          status,
          assignedAgents: eventData.assignments?.length || 0,
          agents: eventData.assignments?.map(a => a.agent) || []
        };
      });
    } catch (error) {
      console.error('❌ Erreur récupération événements:', error);
      return [];
    }
  }

  async getCurrentAgents() {
    try {
      const agents = await User.findAll({
        where: {
          role: 'agent',
          status: { [Op.in]: ['active', 'busy'] }
        },
        attributes: [
          'id', 'firstName', 'lastName', 'status', 
          'latitude', 'longitude', 'lastLocationUpdate',
          'profilePhoto'
        ]
      });

      return agents.map(agent => agent.toJSON());
    } catch (error) {
      console.error('❌ Erreur récupération agents:', error);
      return [];
    }
  }

  /**
   * 🛠️ UTILITAIRES
   */
  getConnectionStats() {
    return {
      activeConnections: this.clients.size,
      lastUpdate: this.lastUpdate,
      uptime: process.uptime()
    };
  }

  shutdown() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1001, 'Serveur en arrêt');
      }
    });
    
    this.wss.close();
    console.log('🔴 Serveur WebSocket carte arrêté');
  }
}

module.exports = MapWebSocketServer;