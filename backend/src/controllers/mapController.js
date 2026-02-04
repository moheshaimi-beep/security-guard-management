/**
 * API Controller pour les données de la carte
 * Endpoints optimisés pour la visualisation géographique
 */

const { Event, User, Assignment, Attendance } = require('../models');
const { Op } = require('sequelize');

class MapController {
  
  /**
   * Obtenir tous les événements pour la carte
   * GET /api/map/events
   */
  async getMapEvents(req, res) {
    try {
      const { 
        status, 
        priority, 
        search, 
        includeCompleted = false,
        startDate,
        endDate 
      } = req.query;

      // Construire les conditions WHERE
      const whereConditions = {};
      
      // Filtrer par dates si spécifiées
      if (startDate || endDate) {
        whereConditions.startDate = {};
        if (startDate) whereConditions.startDate[Op.gte] = startDate;
        if (endDate) whereConditions.startDate[Op.lte] = endDate;
      } else if (!includeCompleted) {
        // Par défaut, exclure les événements terminés
        whereConditions.endDate = { [Op.gte]: new Date() };
      }

      // Filtrer par recherche
      if (search) {
        whereConditions[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { location: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      // Récupérer les événements avec les agents affectés
      const events = await Event.findAll({
        where: whereConditions,
        include: [
          {
            model: Assignment,
            as: 'assignments',
            include: [
              {
                model: User,
                as: 'agent',
                attributes: ['id', 'firstName', 'lastName', 'profilePhoto', 'status']
              }
            ]
          }
        ],
        order: [['startDate', 'ASC']]
      });

      // Enrichir avec des données calculées
      const enrichedEvents = events.map(event => {
        const eventData = event.toJSON();
        
        // Calculer le statut
        const now = new Date();
        const start = new Date(eventData.startDate);
        const end = new Date(eventData.endDate);
        
        let eventStatus = 'upcoming';
        if (now >= start && now <= end) {
          eventStatus = 'ongoing';
        } else if (now > end) {
          eventStatus = 'completed';
        }

        // Calculer la priorité
        const hoursUntilStart = (start - now) / (1000 * 60 * 60);
        let eventPriority = 'low';
        if (eventStatus === 'ongoing') {
          eventPriority = 'high';
        } else if (eventStatus === 'upcoming' && hoursUntilStart <= 24) {
          eventPriority = 'high';
        } else if (eventStatus === 'upcoming' && hoursUntilStart <= 72) {
          eventPriority = 'medium';
        }

        // Filtrer par statut et priorité si spécifiés
        if (status && status !== 'all' && eventStatus !== status) return null;
        if (priority && priority !== 'all' && eventPriority !== priority) return null;

        return {
          ...eventData,
          status: eventStatus,
          priority: eventPriority,
          assignedAgents: eventData.assignments?.length || 0,
          agents: eventData.assignments?.map(a => a.agent) || []
        };
      }).filter(Boolean);

      // Calculer les limites géographiques
      const validEvents = enrichedEvents.filter(e => e.latitude && e.longitude);
      let bounds = null;
      
      if (validEvents.length > 0) {
        const latitudes = validEvents.map(e => parseFloat(e.latitude));
        const longitudes = validEvents.map(e => parseFloat(e.longitude));
        
        bounds = {
          minLat: Math.min(...latitudes),
          maxLat: Math.max(...latitudes),
          minLng: Math.min(...longitudes),
          maxLng: Math.max(...longitudes)
        };
      }

      res.json({
        success: true,
        data: {
          events: enrichedEvents,
          bounds,
          stats: {
            total: enrichedEvents.length,
            ongoing: enrichedEvents.filter(e => e.status === 'ongoing').length,
            upcoming: enrichedEvents.filter(e => e.status === 'upcoming').length,
            completed: enrichedEvents.filter(e => e.status === 'completed').length
          }
        }
      });

    } catch (error) {
      console.error('❌ MAP EVENTS ERROR:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des événements'
      });
    }
  }

  /**
   * Obtenir les agents actifs avec leurs positions
   * GET /api/map/agents
   */
  async getMapAgents(req, res) {
    try {
      const { includeOffline = false, eventId } = req.query;

      const whereConditions = {
        role: 'agent'
      };

      // Filtrer par agents avec position GPS
      if (!includeOffline) {
        whereConditions[Op.and] = [
          { currentLatitude: { [Op.not]: null } },
          { currentLongitude: { [Op.not]: null } }
        ];
      }

      let include = [];

      // Si un événement est spécifié, inclure les affectations
      if (eventId) {
        include.push({
          model: Assignment,
          as: 'assignments',
          where: { eventId },
          required: false
        });
      }

      const agents = await User.findAll({
        where: whereConditions,
        attributes: [
          'id', 'firstName', 'lastName', 'email', 'phone',
          'currentLatitude', 'currentLongitude', 'lastLocationUpdate',
          'status', 'profilePhoto'
        ],
        include,
        order: [['lastLocationUpdate', 'DESC']]
      });

      // Enrichir avec des données calculées
      const enrichedAgents = agents.map(agent => {
        const agentData = agent.toJSON();
        
        // Déterminer le statut de l'agent
        let agentStatus = agentData.status || 'offline';
        const lastUpdate = agentData.lastLocationUpdate;
        
        if (lastUpdate) {
          const hoursAgo = (new Date() - new Date(lastUpdate)) / (1000 * 60 * 60);
          if (hoursAgo > 2) {
            agentStatus = 'offline';
          } else if (agentData.assignments?.length > 0) {
            agentStatus = 'busy';
          } else {
            agentStatus = 'active';
          }
        }

        return {
          ...agentData,
          status: agentStatus,
          latitude: parseFloat(agentData.currentLatitude),
          longitude: parseFloat(agentData.currentLongitude),
          hasValidPosition: !!(agentData.currentLatitude && agentData.currentLongitude),
          isAssigned: (agentData.assignments?.length || 0) > 0
        };
      });

      res.json({
        success: true,
        data: {
          agents: enrichedAgents,
          stats: {
            total: enrichedAgents.length,
            active: enrichedAgents.filter(a => a.status === 'active').length,
            busy: enrichedAgents.filter(a => a.status === 'busy').length,
            offline: enrichedAgents.filter(a => a.status === 'offline').length,
            withPosition: enrichedAgents.filter(a => a.hasValidPosition).length
          }
        }
      });

    } catch (error) {
      console.error('❌ MAP AGENTS ERROR:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des agents'
      });
    }
  }

  /**
   * Obtenir les données d'un événement spécifique
   * GET /api/map/events/:id
   */
  async getEventDetails(req, res) {
    try {
      const { id } = req.params;

      const event = await Event.findByPk(id, {
        include: [
          {
            model: Assignment,
            as: 'assignments',
            include: [
              {
                model: User,
                as: 'agent',
                attributes: ['id', 'firstName', 'lastName', 'profilePhoto', 'phone', 'currentLatitude', 'currentLongitude']
              }
            ]
          },
          {
            model: Attendance,
            as: 'attendances',
            include: [
              {
                model: User,
                as: 'agent',
                attributes: ['id', 'firstName', 'lastName']
              }
            ]
          }
        ]
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Événement non trouvé'
        });
      }

      const eventData = event.toJSON();

      // Calculer les statistiques de présence
      const assignedCount = eventData.assignments?.length || 0;
      const presentCount = eventData.attendances?.filter(a => a.status === 'present').length || 0;

      // Enrichir avec des données calculées
      const enriched = {
        ...eventData,
        assignedCount,
        presentCount,
        attendanceRate: assignedCount > 0 ? (presentCount / assignedCount * 100).toFixed(1) : 0,
        agentsWithPosition: eventData.assignments?.filter(a => 
          a.agent.currentLatitude && a.agent.currentLongitude
        ).length || 0
      };

      res.json({
        success: true,
        data: { event: enriched }
      });

    } catch (error) {
      console.error('❌ EVENT DETAILS ERROR:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des détails'
      });
    }
  }

  /**
   * Obtenir les statistiques globales pour la carte
   * GET /api/map/stats
   */
  async getMapStats(req, res) {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Statistiques des événements
      const [eventStats] = await Promise.all([
        Event.findAll({
          attributes: [
            'id', 'startDate', 'endDate'
          ],
          raw: true
        })
      ]);

      // Calculer les statuts des événements
      const eventsByStatus = eventStats.reduce((acc, event) => {
        const start = new Date(event.startDate);
        const end = new Date(event.endDate);
        
        if (now >= start && now <= end) {
          acc.ongoing++;
        } else if (now < start) {
          acc.upcoming++;
        } else {
          acc.completed++;
        }
        
        return acc;
      }, { ongoing: 0, upcoming: 0, completed: 0 });

      // Statistiques des agents
      const agentStats = await User.count({
        where: { role: 'agent' },
        group: ['status']
      });

      // Statistiques des pointages d'aujourd'hui
      const todayAttendance = await Attendance.count({
        where: {
          date: today
        }
      });

      res.json({
        success: true,
        data: {
          events: {
            total: eventStats.length,
            ...eventsByStatus
          },
          agents: {
            total: agentStats.reduce((sum, stat) => sum + stat.count, 0),
            byStatus: agentStats.reduce((acc, stat) => {
              acc[stat.status || 'unknown'] = stat.count;
              return acc;
            }, {})
          },
          attendance: {
            today: todayAttendance
          },
          lastUpdate: now.toISOString()
        }
      });

    } catch (error) {
      console.error('❌ MAP STATS ERROR:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques'
      });
    }
  }

  /**
   * Rechercher des lieux à proximité d'un point
   * GET /api/map/nearby
   */
  async getNearbyLocations(req, res) {
    try {
      const { latitude, longitude, radius = 5 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude et longitude requises'
        });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radiusKm = parseFloat(radius);

      // Rechercher les événements proches
      const events = await Event.findAll({
        where: {
          latitude: { [Op.not]: null },
          longitude: { [Op.not]: null }
        }
      });

      // Filtrer par distance
      const nearbyEvents = events.filter(event => {
        const distance = this.calculateDistance(
          lat, lng, 
          parseFloat(event.latitude), 
          parseFloat(event.longitude)
        );
        return distance <= radiusKm;
      }).map(event => ({
        ...event.toJSON(),
        distance: this.calculateDistance(
          lat, lng,
          parseFloat(event.latitude),
          parseFloat(event.longitude)
        ).toFixed(2)
      }));

      // Rechercher les agents proches
      const agents = await User.findAll({
        where: {
          role: 'agent',
          currentLatitude: { [Op.not]: null },
          currentLongitude: { [Op.not]: null }
        }
      });

      const nearbyAgents = agents.filter(agent => {
        const distance = this.calculateDistance(
          lat, lng,
          parseFloat(agent.currentLatitude),
          parseFloat(agent.currentLongitude)
        );
        return distance <= radiusKm;
      }).map(agent => ({
        id: agent.id,
        name: `${agent.firstName} ${agent.lastName}`,
        latitude: parseFloat(agent.currentLatitude),
        longitude: parseFloat(agent.currentLongitude),
        status: agent.status,
        distance: this.calculateDistance(
          lat, lng,
          parseFloat(agent.currentLatitude),
          parseFloat(agent.currentLongitude)
        ).toFixed(2)
      }));

      res.json({
        success: true,
        data: {
          center: { latitude: lat, longitude: lng },
          radius: radiusKm,
          events: nearbyEvents,
          agents: nearbyAgents
        }
      });

    } catch (error) {
      console.error('❌ NEARBY LOCATIONS ERROR:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la recherche de proximité'
      });
    }
  }

  /**
   * Calculer la distance entre deux points (formule de Haversine)
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convertir en radians
   */
  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }
}

module.exports = new MapController();