/**
 * Service de gestion intelligente des cartes
 * Centralisation automatique sur les événements avec logique optimisée
 */

class MapService {
  constructor() {
    this.defaultCenter = [36.8485, 10.1833]; // Tunis par défaut
    this.defaultZoom = 10;
    this.eventMarkers = [];
    this.agentMarkers = [];
  }

  /**
   * Calculer le centre optimal pour tous les événements
   * @param {Array} events - Liste des événements
   * @returns {Object} Centre et zoom optimaux
   */
  calculateOptimalCenter(events) {
    if (!events || events.length === 0) {
      return {
        center: this.defaultCenter,
        zoom: this.defaultZoom,
        bounds: null
      };
    }

    // Filtrer les événements avec coordonnées valides
    const validEvents = events.filter(event => 
      event.latitude && event.longitude &&
      !isNaN(event.latitude) && !isNaN(event.longitude)
    );

    if (validEvents.length === 0) {
      return {
        center: this.defaultCenter,
        zoom: this.defaultZoom,
        bounds: null
      };
    }

    // Un seul événement - centrer dessus
    if (validEvents.length === 1) {
      return {
        center: [validEvents[0].latitude, validEvents[0].longitude],
        zoom: 15,
        bounds: null
      };
    }

    // Plusieurs événements - calculer les limites
    const bounds = this.calculateBounds(validEvents);
    const center = this.calculateCenterFromBounds(bounds);
    const zoom = this.calculateZoomFromBounds(bounds);

    return {
      center,
      zoom,
      bounds
    };
  }

  /**
   * Calculer les limites géographiques des événements
   */
  calculateBounds(events) {
    const latitudes = events.map(e => parseFloat(e.latitude));
    const longitudes = events.map(e => parseFloat(e.longitude));

    return {
      minLat: Math.min(...latitudes),
      maxLat: Math.max(...latitudes),
      minLng: Math.min(...longitudes),
      maxLng: Math.max(...longitudes)
    };
  }

  /**
   * Calculer le centre à partir des limites
   */
  calculateCenterFromBounds(bounds) {
    return [
      (bounds.minLat + bounds.maxLat) / 2,
      (bounds.minLng + bounds.maxLng) / 2
    ];
  }

  /**
   * Calculer le niveau de zoom optimal
   */
  calculateZoomFromBounds(bounds) {
    const latDiff = bounds.maxLat - bounds.minLat;
    const lngDiff = bounds.maxLng - bounds.minLng;
    const maxDiff = Math.max(latDiff, lngDiff);

    // Logique de zoom basée sur la distance maximale
    if (maxDiff > 1) return 8;
    if (maxDiff > 0.5) return 10;
    if (maxDiff > 0.1) return 12;
    if (maxDiff > 0.05) return 14;
    return 15;
  }

  /**
   * Préparer les données des événements pour la carte
   */
  prepareEventData(events) {
    if (!events) return [];

    return events.map(event => ({
      id: event.id,
      name: event.name,
      location: event.location,
      latitude: parseFloat(event.latitude),
      longitude: parseFloat(event.longitude),
      startDate: event.startDate,
      endDate: event.endDate,
      status: this.getEventStatus(event),
      priority: this.getEventPriority(event),
      assignedAgents: event.assignedAgents || 0,
      description: event.description,
      color: this.getEventColor(event),
      icon: this.getEventIcon(event)
    })).filter(event => 
      !isNaN(event.latitude) && !isNaN(event.longitude)
    );
  }

  /**
   * Déterminer le statut d'un événement
   */
  getEventStatus(event) {
    const now = new Date();
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    if (now < startDate) return 'upcoming';
    if (now > endDate) return 'completed';
    return 'ongoing';
  }

  /**
   * Déterminer la priorité d'un événement
   */
  getEventPriority(event) {
    const status = this.getEventStatus(event);
    const hoursUntilStart = (new Date(event.startDate) - new Date()) / (1000 * 60 * 60);

    if (status === 'ongoing') return 'high';
    if (status === 'upcoming' && hoursUntilStart <= 24) return 'high';
    if (status === 'upcoming' && hoursUntilStart <= 72) return 'medium';
    return 'low';
  }

  /**
   * Obtenir la couleur d'un événement
   */
  getEventColor(event) {
    const status = this.getEventStatus(event);
    const priority = this.getEventPriority(event);

    switch (status) {
      case 'ongoing':
        return '#4CAF50'; // Vert pour en cours
      case 'upcoming':
        return priority === 'high' ? '#FF9800' : '#2196F3'; // Orange/Bleu pour à venir
      case 'completed':
        return '#9E9E9E'; // Gris pour terminé
      default:
        return '#2196F3';
    }
  }

  /**
   * Obtenir l'icône d'un événement
   */
  getEventIcon(event) {
    const status = this.getEventStatus(event);

    switch (status) {
      case 'ongoing':
        return 'play_circle_filled';
      case 'upcoming':
        return 'schedule';
      case 'completed':
        return 'check_circle';
      default:
        return 'location_on';
    }
  }

  /**
   * Préparer les données des agents pour la carte
   */
  prepareAgentData(agents) {
    if (!agents) return [];

    return agents.filter(agent => 
      agent.currentLatitude && agent.currentLongitude &&
      !isNaN(agent.currentLatitude) && !isNaN(agent.currentLongitude)
    ).map(agent => ({
      id: agent.id,
      name: `${agent.firstName} ${agent.lastName}`,
      latitude: parseFloat(agent.currentLatitude),
      longitude: parseFloat(agent.currentLongitude),
      status: agent.status || 'active',
      lastUpdate: agent.lastLocationUpdate,
      currentAssignment: agent.currentAssignment,
      color: this.getAgentColor(agent.status),
      icon: 'person_pin_circle'
    }));
  }

  /**
   * Obtenir la couleur d'un agent
   */
  getAgentColor(status) {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'busy':
        return '#FF9800';
      case 'offline':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  }

  /**
   * Filtrer les événements selon les critères
   */
  filterEvents(events, filters) {
    if (!events || !filters) return events;

    let filtered = events;

    // Filtre par statut
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(event => 
        this.getEventStatus(event) === filters.status
      );
    }

    // Filtre par priorité
    if (filters.priority && filters.priority !== 'all') {
      filtered = filtered.filter(event => 
        this.getEventPriority(event) === filters.priority
      );
    }

    // Filtre par date
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.startDate);
        return eventDate >= start && eventDate <= end;
      });
    }

    // Filtre par recherche
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(event =>
        event.name.toLowerCase().includes(searchTerm) ||
        event.location.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  }

  /**
   * Calculer la distance entre deux points
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

  /**
   * Grouper les événements proches
   */
  clusterEvents(events, maxDistance = 1) { // 1km par défaut
    const clusters = [];
    const processed = new Set();

    events.forEach(event => {
      if (processed.has(event.id)) return;

      const cluster = [event];
      processed.add(event.id);

      events.forEach(otherEvent => {
        if (processed.has(otherEvent.id)) return;

        const distance = this.calculateDistance(
          event.latitude, event.longitude,
          otherEvent.latitude, otherEvent.longitude
        );

        if (distance <= maxDistance) {
          cluster.push(otherEvent);
          processed.add(otherEvent.id);
        }
      });

      clusters.push(cluster);
    });

    return clusters;
  }

  /**
   * Générer un popup HTML pour un événement
   */
  generateEventPopup(event) {
    const statusBadge = this.getStatusBadge(event.status);
    const priorityBadge = this.getPriorityBadge(event.priority);

    return `
      <div class="event-popup">
        <div class="popup-header">
          <h3>${event.name}</h3>
          <div class="badges">
            ${statusBadge}
            ${priorityBadge}
          </div>
        </div>
        <div class="popup-content">
          <p><strong>📍 Lieu:</strong> ${event.location}</p>
          <p><strong>📅 Début:</strong> ${this.formatDate(event.startDate)}</p>
          <p><strong>🕒 Fin:</strong> ${this.formatDate(event.endDate)}</p>
          <p><strong>👥 Agents:</strong> ${event.assignedAgents}</p>
          ${event.description ? `<p><strong>📝 Description:</strong> ${event.description}</p>` : ''}
        </div>
        <div class="popup-actions">
          <button onclick="window.viewEvent('${event.id}')" class="btn-primary">
            Voir Détails
          </button>
          <button onclick="window.manageAgents('${event.id}')" class="btn-secondary">
            Gérer Agents
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Générer un badge de statut
   */
  getStatusBadge(status) {
    const badges = {
      ongoing: '<span class="badge badge-success">En Cours</span>',
      upcoming: '<span class="badge badge-warning">À Venir</span>',
      completed: '<span class="badge badge-secondary">Terminé</span>'
    };
    return badges[status] || '<span class="badge badge-primary">Inconnu</span>';
  }

  /**
   * Générer un badge de priorité
   */
  getPriorityBadge(priority) {
    const badges = {
      high: '<span class="badge badge-danger">Haute</span>',
      medium: '<span class="badge badge-warning">Moyenne</span>',
      low: '<span class="badge badge-info">Basse</span>'
    };
    return badges[priority] || '<span class="badge badge-light">Normal</span>';
  }

  /**
   * Formater une date
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

export default new MapService();