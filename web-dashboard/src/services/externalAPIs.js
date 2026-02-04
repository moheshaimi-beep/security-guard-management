/**
 * Services d'intégration avec APIs externes
 * Collection d'APIs open source pour améliorer le projet
 */

// ============================================
// 1. MÉTÉO - Open-Meteo (Gratuit, sans clé API)
// ============================================
export const weatherAPI = {
  /**
   * Obtenir la météo actuelle pour une position
   * @param {number} latitude
   * @param {number} longitude
   */
  getCurrentWeather: async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`
      );
      const data = await response.json();
      return {
        temperature: data.current_weather?.temperature,
        windSpeed: data.current_weather?.windspeed,
        weatherCode: data.current_weather?.weathercode,
        isDay: data.current_weather?.is_day,
        time: data.current_weather?.time
      };
    } catch (error) {
      console.error('Erreur météo:', error);
      return null;
    }
  },

  /**
   * Obtenir les prévisions sur 7 jours
   */
  getForecast: async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto`
      );
      return await response.json();
    } catch (error) {
      console.error('Erreur prévisions:', error);
      return null;
    }
  },

  /**
   * Convertir le code météo en description
   */
  getWeatherDescription: (code) => {
    const descriptions = {
      0: 'Ciel dégagé',
      1: 'Principalement dégagé',
      2: 'Partiellement nuageux',
      3: 'Couvert',
      45: 'Brouillard',
      48: 'Brouillard givrant',
      51: 'Bruine légère',
      53: 'Bruine modérée',
      55: 'Bruine dense',
      61: 'Pluie légère',
      63: 'Pluie modérée',
      65: 'Pluie forte',
      71: 'Neige légère',
      73: 'Neige modérée',
      75: 'Neige forte',
      77: 'Grains de neige',
      80: 'Averses légères',
      81: 'Averses modérées',
      82: 'Averses violentes',
      85: 'Averses de neige légères',
      86: 'Averses de neige fortes',
      95: 'Orage',
      96: 'Orage avec grêle légère',
      99: 'Orage avec grêle forte'
    };
    return descriptions[code] || 'Inconnu';
  },

  /**
   * Obtenir l'icône météo
   */
  getWeatherIcon: (code, isDay = true) => {
    if (code === 0) return isDay ? '☀️' : '🌙';
    if (code <= 3) return isDay ? '⛅' : '☁️';
    if (code <= 48) return '🌫️';
    if (code <= 55) return '🌧️';
    if (code <= 65) return '🌧️';
    if (code <= 77) return '❄️';
    if (code <= 82) return '🌧️';
    if (code <= 86) return '🌨️';
    return '⛈️';
  }
};

// ============================================
// 2. GÉOCODAGE - Nominatim (OpenStreetMap)
// ============================================
export const geocodingAPI = {
  /**
   * Convertir une adresse en coordonnées
   */
  geocode: async (address) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'SecurityGuardManagement/1.0'
          }
        }
      );
      const data = await response.json();
      if (data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
          displayName: data[0].display_name
        };
      }
      return null;
    } catch (error) {
      console.error('Erreur géocodage:', error);
      return null;
    }
  },

  /**
   * Convertir des coordonnées en adresse
   */
  reverseGeocode: async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        {
          headers: {
            'User-Agent': 'SecurityGuardManagement/1.0'
          }
        }
      );
      return await response.json();
    } catch (error) {
      console.error('Erreur reverse geocoding:', error);
      return null;
    }
  },

  /**
   * Rechercher des adresses avec autocomplétion
   */
  searchAddress: async (query, limit = 5) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'SecurityGuardManagement/1.0'
          }
        }
      );
      return await response.json();
    } catch (error) {
      console.error('Erreur recherche:', error);
      return [];
    }
  }
};

// ============================================
// 3. NOTIFICATIONS PUSH - ntfy.sh (Gratuit)
// ============================================
export const pushNotificationAPI = {
  /**
   * Envoyer une notification push via ntfy.sh
   * @param {string} topic - Identifiant du canal (ex: 'security-guard-alerts')
   * @param {string} message - Message à envoyer
   * @param {object} options - Options supplémentaires
   */
  send: async (topic, message, options = {}) => {
    const {
      title = 'Security Guard Management',
      priority = 'default', // min, low, default, high, urgent
      tags = [],
      click = null,
      actions = []
    } = options;

    try {
      const headers = {
        'Title': title,
        'Priority': priority
      };

      if (tags.length > 0) headers['Tags'] = tags.join(',');
      if (click) headers['Click'] = click;
      if (actions.length > 0) headers['Actions'] = JSON.stringify(actions);

      const response = await fetch(`https://ntfy.sh/${topic}`, {
        method: 'POST',
        headers,
        body: message
      });

      return response.ok;
    } catch (error) {
      console.error('Erreur notification:', error);
      return false;
    }
  },

  /**
   * Envoyer une alerte urgente
   */
  sendUrgent: async (topic, message, title) => {
    return pushNotificationAPI.send(topic, message, {
      title,
      priority: 'urgent',
      tags: ['warning', 'rotating_light']
    });
  },

  /**
   * Envoyer une notification d'incident
   */
  sendIncidentAlert: async (topic, incident) => {
    return pushNotificationAPI.send(topic,
      `Incident: ${incident.description}\nLieu: ${incident.location}`,
      {
        title: `🚨 Incident ${incident.severity}`,
        priority: incident.severity === 'critical' ? 'urgent' : 'high',
        tags: ['police_car', 'warning']
      }
    );
  }
};

// ============================================
// 4. QR CODE - Génération et lecture
// ============================================
export const qrCodeAPI = {
  /**
   * Générer un QR code (nécessite npm install qrcode)
   */
  generate: async (data, options = {}) => {
    try {
      const QRCode = (await import('qrcode')).default;
      const {
        width = 256,
        margin = 2,
        color = { dark: '#000000', light: '#ffffff' }
      } = options;

      return await QRCode.toDataURL(data, { width, margin, color });
    } catch (error) {
      console.error('Erreur génération QR:', error);
      return null;
    }
  },

  /**
   * Générer un QR code pour un pointage
   */
  generateAttendanceQR: async (eventId, agentId, date) => {
    const data = JSON.stringify({
      type: 'attendance',
      eventId,
      agentId,
      date,
      timestamp: Date.now()
    });
    return qrCodeAPI.generate(data);
  },

  /**
   * Générer un QR code pour un événement
   */
  generateEventQR: async (eventId, eventName) => {
    const data = JSON.stringify({
      type: 'event',
      eventId,
      name: eventName,
      generated: new Date().toISOString()
    });
    return qrCodeAPI.generate(data, { width: 300 });
  }
};

// ============================================
// 5. VALIDATION - APIs gratuites
// ============================================
export const validationAPI = {
  /**
   * Valider un numéro de téléphone (format basique)
   */
  validatePhone: (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    // Format français
    if (/^(0|33)[1-9]\d{8}$/.test(cleaned)) return { valid: true, country: 'FR' };
    // Format international
    if (/^\d{10,15}$/.test(cleaned)) return { valid: true, country: 'INTL' };
    return { valid: false };
  },

  /**
   * Valider un email
   */
  validateEmail: (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  /**
   * Valider un numéro SIRET (France)
   */
  validateSIRET: (siret) => {
    if (!/^\d{14}$/.test(siret)) return false;

    // Algorithme de Luhn
    let sum = 0;
    for (let i = 0; i < 14; i++) {
      let digit = parseInt(siret[i]);
      if (i % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    return sum % 10 === 0;
  }
};

// ============================================
// 6. CALCULS UTILITAIRES
// ============================================
export const calculationAPI = {
  /**
   * Calculer la distance entre deux points GPS (Haversine)
   */
  calculateDistance: (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return Math.round(R * c); // Distance en mètres
  },

  /**
   * Vérifier si un point est dans un cercle (geofencing)
   */
  isInsideGeofence: (pointLat, pointLon, centerLat, centerLon, radiusMeters) => {
    const distance = calculationAPI.calculateDistance(pointLat, pointLon, centerLat, centerLon);
    return {
      isInside: distance <= radiusMeters,
      distance,
      radius: radiusMeters
    };
  },

  /**
   * Calculer les heures travaillées
   */
  calculateWorkHours: (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffMs = end - start;
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Heures avec 2 décimales
  },

  /**
   * Formater la durée en heures:minutes
   */
  formatDuration: (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${m.toString().padStart(2, '0')}`;
  }
};

// ============================================
// 7. HELPERS DIVERS
// ============================================
export const helpers = {
  /**
   * Générer un ID unique
   */
  generateUID: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  /**
   * Formater un numéro de téléphone français
   */
  formatPhoneFR: (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    if (cleaned.length === 11 && cleaned.startsWith('33')) {
      return '+33 ' + cleaned.slice(2).replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    return phone;
  },

  /**
   * Tronquer un texte avec ellipsis
   */
  truncate: (text, maxLength = 50) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  },

  /**
   * Capitaliser la première lettre
   */
  capitalize: (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  /**
   * Formater une date en français
   */
  formatDateFR: (date, options = {}) => {
    const d = new Date(date);
    const defaultOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    };
    return d.toLocaleDateString('fr-FR', defaultOptions);
  },

  /**
   * Délai (pour éviter trop de requêtes)
   */
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Debounce function
   */
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};

// Export par défaut
export default {
  weather: weatherAPI,
  geocoding: geocodingAPI,
  push: pushNotificationAPI,
  qrCode: qrCodeAPI,
  validation: validationAPI,
  calculation: calculationAPI,
  helpers
};
