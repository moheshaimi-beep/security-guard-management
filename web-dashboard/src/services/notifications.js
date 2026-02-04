/**
 * Service de notifications multi-canal
 * - Push notifications via ntfy.sh (gratuit)
 * - Notifications navigateur (Web Push)
 * - Notifications in-app
 */

// Configuration ntfy.sh
const NTFY_SERVER = 'https://ntfy.sh';
const NTFY_TOPIC = 'security-guard-mgmt'; // À personnaliser par installation

/**
 * Notifications Push via ntfy.sh
 * Gratuit, sans inscription, fonctionne partout
 */
export const pushNotifications = {
  /**
   * Envoyer une notification push
   * @param {string} message - Message à envoyer
   * @param {object} options - Options de notification
   */
  send: async (message, options = {}) => {
    const {
      title = 'Security Guard Management',
      priority = 'default', // min, low, default, high, urgent
      tags = [],
      topic = NTFY_TOPIC,
      click = null,
      actions = [],
      attach = null,
      delay = null
    } = options;

    try {
      const headers = {
        'Title': title,
        'Priority': priority
      };

      if (tags.length > 0) headers['Tags'] = tags.join(',');
      if (click) headers['Click'] = click;
      if (attach) headers['Attach'] = attach;
      if (delay) headers['Delay'] = delay;
      if (actions.length > 0) {
        headers['Actions'] = actions.map(a =>
          `${a.action}, ${a.label}, ${a.url || a.command}`
        ).join('; ');
      }

      const response = await fetch(`${NTFY_SERVER}/${topic}`, {
        method: 'POST',
        headers,
        body: message
      });

      return { success: response.ok, status: response.status };
    } catch (error) {
      console.error('Erreur notification push:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Alerte urgente (incident, urgence)
   */
  sendUrgent: async (message, title = 'ALERTE URGENTE') => {
    return pushNotifications.send(message, {
      title,
      priority: 'urgent',
      tags: ['rotating_light', 'warning']
    });
  },

  /**
   * Notification d'incident
   */
  sendIncident: async (incident) => {
    const severityTags = {
      low: ['information_source'],
      medium: ['warning'],
      high: ['rotating_light'],
      critical: ['rotating_light', 'sos']
    };

    return pushNotifications.send(
      `📍 ${incident.location}\n📝 ${incident.description}`,
      {
        title: `🚨 Incident ${incident.severity?.toUpperCase() || 'SIGNALÉ'}`,
        priority: incident.severity === 'critical' ? 'urgent' : 'high',
        tags: severityTags[incident.severity] || ['warning'],
        click: `${window.location.origin}/incidents/${incident.id}`
      }
    );
  },

  /**
   * Notification de retard agent
   */
  sendLateAlert: async (agent, event, minutesLate) => {
    return pushNotifications.send(
      `${agent.firstName} ${agent.lastName} a ${minutesLate} min de retard pour "${event.name}"`,
      {
        title: '⏰ Agent en retard',
        priority: minutesLate > 30 ? 'high' : 'default',
        tags: ['clock', 'warning']
      }
    );
  },

  /**
   * Notification de pointage
   */
  sendCheckInAlert: async (agent, event, type = 'checkin') => {
    const emoji = type === 'checkin' ? '✅' : '👋';
    const action = type === 'checkin' ? 'arrivé' : 'parti';

    return pushNotifications.send(
      `${agent.firstName} ${agent.lastName} est ${action} - ${event.name}`,
      {
        title: `${emoji} Pointage ${type === 'checkin' ? 'Entrée' : 'Sortie'}`,
        priority: 'low',
        tags: [type === 'checkin' ? 'white_check_mark' : 'wave']
      }
    );
  },

  /**
   * Notification météo dangereuse
   */
  sendWeatherAlert: async (event, weatherCondition) => {
    return pushNotifications.send(
      `Conditions météo dangereuses pour "${event.name}": ${weatherCondition}`,
      {
        title: '🌩️ Alerte Météo',
        priority: 'high',
        tags: ['cloud', 'warning']
      }
    );
  },

  /**
   * S'abonner au topic (retourne l'URL pour l'app mobile)
   */
  getSubscriptionUrl: (topic = NTFY_TOPIC) => {
    return `${NTFY_SERVER}/${topic}`;
  },

  /**
   * Générer le lien d'abonnement pour l'app ntfy
   */
  getAppLink: (topic = NTFY_TOPIC) => {
    return `ntfy://${topic}`;
  }
};

/**
 * Notifications navigateur (Web Push API)
 */
export const browserNotifications = {
  /**
   * Vérifier si les notifications sont supportées
   */
  isSupported: () => {
    return 'Notification' in window;
  },

  /**
   * Demander la permission
   */
  requestPermission: async () => {
    if (!browserNotifications.isSupported()) {
      return { granted: false, reason: 'not_supported' };
    }

    const permission = await Notification.requestPermission();
    return {
      granted: permission === 'granted',
      permission
    };
  },

  /**
   * Vérifier si la permission est accordée
   */
  hasPermission: () => {
    return Notification.permission === 'granted';
  },

  /**
   * Envoyer une notification navigateur
   */
  send: (title, options = {}) => {
    if (!browserNotifications.hasPermission()) {
      console.warn('Notifications non autorisées');
      return null;
    }

    const {
      body = '',
      icon = '/logo192.png',
      badge = '/badge.png',
      tag = 'sgm-notification',
      requireInteraction = false,
      silent = false,
      data = {},
      onClick = null
    } = options;

    const notification = new Notification(title, {
      body,
      icon,
      badge,
      tag,
      requireInteraction,
      silent,
      data
    });

    if (onClick) {
      notification.onclick = onClick;
    }

    return notification;
  },

  /**
   * Notification d'incident
   */
  sendIncident: (incident) => {
    return browserNotifications.send(
      `🚨 Incident: ${incident.type || 'Signalement'}`,
      {
        body: `${incident.location}\n${incident.description}`,
        tag: `incident-${incident.id}`,
        requireInteraction: incident.severity === 'critical',
        onClick: () => window.open(`/incidents/${incident.id}`, '_blank')
      }
    );
  }
};

/**
 * Gestionnaire de notifications in-app
 * Stockage local des notifications non lues
 */
export const inAppNotifications = {
  STORAGE_KEY: 'sgm_notifications',

  /**
   * Obtenir toutes les notifications
   */
  getAll: () => {
    try {
      const stored = localStorage.getItem(inAppNotifications.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  /**
   * Ajouter une notification
   */
  add: (notification) => {
    const notifications = inAppNotifications.getAll();
    const newNotification = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      read: false,
      ...notification
    };
    notifications.unshift(newNotification);
    // Garder max 100 notifications
    const trimmed = notifications.slice(0, 100);
    localStorage.setItem(inAppNotifications.STORAGE_KEY, JSON.stringify(trimmed));
    return newNotification;
  },

  /**
   * Marquer comme lu
   */
  markAsRead: (id) => {
    const notifications = inAppNotifications.getAll();
    const updated = notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    localStorage.setItem(inAppNotifications.STORAGE_KEY, JSON.stringify(updated));
  },

  /**
   * Marquer toutes comme lues
   */
  markAllAsRead: () => {
    const notifications = inAppNotifications.getAll();
    const updated = notifications.map(n => ({ ...n, read: true }));
    localStorage.setItem(inAppNotifications.STORAGE_KEY, JSON.stringify(updated));
  },

  /**
   * Supprimer une notification
   */
  delete: (id) => {
    const notifications = inAppNotifications.getAll();
    const filtered = notifications.filter(n => n.id !== id);
    localStorage.setItem(inAppNotifications.STORAGE_KEY, JSON.stringify(filtered));
  },

  /**
   * Compter les non lues
   */
  getUnreadCount: () => {
    return inAppNotifications.getAll().filter(n => !n.read).length;
  },

  /**
   * Effacer toutes les notifications
   */
  clear: () => {
    localStorage.removeItem(inAppNotifications.STORAGE_KEY);
  }
};

/**
 * Service unifié de notifications
 * Envoie sur tous les canaux configurés
 */
export const notificationService = {
  /**
   * Envoyer une notification sur tous les canaux
   */
  notify: async (message, options = {}) => {
    const {
      title = 'Notification',
      channels = ['browser', 'inapp'], // 'push', 'browser', 'inapp'
      priority = 'default',
      type = 'info', // 'info', 'success', 'warning', 'error'
      data = {}
    } = options;

    const results = {};

    // In-App (toujours)
    if (channels.includes('inapp')) {
      results.inapp = inAppNotifications.add({
        title,
        message,
        type,
        data
      });
    }

    // Browser
    if (channels.includes('browser') && browserNotifications.hasPermission()) {
      results.browser = browserNotifications.send(title, {
        body: message,
        ...data
      });
    }

    // Push (ntfy)
    if (channels.includes('push')) {
      results.push = await pushNotifications.send(message, {
        title,
        priority,
        ...data
      });
    }

    return results;
  },

  /**
   * Notification d'incident (tous canaux)
   */
  notifyIncident: async (incident) => {
    return notificationService.notify(
      `${incident.location}: ${incident.description}`,
      {
        title: `🚨 Incident ${incident.severity?.toUpperCase() || ''}`,
        channels: ['push', 'browser', 'inapp'],
        priority: incident.severity === 'critical' ? 'urgent' : 'high',
        type: 'error',
        data: { incidentId: incident.id }
      }
    );
  },

  /**
   * Initialiser les notifications navigateur
   */
  init: async () => {
    if (browserNotifications.isSupported() && !browserNotifications.hasPermission()) {
      await browserNotifications.requestPermission();
    }
  }
};

export default notificationService;
