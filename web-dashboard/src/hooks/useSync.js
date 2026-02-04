/**
 * HOOK REACT POUR LA SYNCHRONISATION TEMPS RÉEL
 * Utilisation facile de syncService dans les composants React
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import syncService from '../services/syncService';

/**
 * Hook principal pour la synchronisation
 */
export const useSync = (userId, rooms = []) => {
  const [isConnected, setIsConnected] = useState(false);
  const hasConnectedRef = useRef(false);

  useEffect(() => {
    if (!userId || hasConnectedRef.current) return;

    // Se connecter
    syncService.connect(userId, rooms);
    hasConnectedRef.current = true;

    // Écouter les événements de connexion
    const unsubConnected = syncService.on('connected', () => {
      setIsConnected(true);
    });

    const unsubDisconnected = syncService.on('disconnected', () => {
      setIsConnected(false);
    });

    // Cleanup
    return () => {
      unsubConnected();
      unsubDisconnected();
      syncService.disconnect();
      hasConnectedRef.current = false;
    };
  }, [userId, rooms.join(',')]);

  return {
    isConnected,
    joinRoom: syncService.joinRoom.bind(syncService),
    leaveRoom: syncService.leaveRoom.bind(syncService)
  };
};

/**
 * Hook pour écouter un événement spécifique
 */
export const useSyncEvent = (event, callback, dependencies = []) => {
  useEffect(() => {
    const unsubscribe = syncService.on(event, callback);
    return unsubscribe;
  }, [event, ...dependencies]);
};

/**
 * Hook pour les utilisateurs
 */
export const useSyncUsers = (onUpdate) => {
  useSyncEvent('user:created', (user) => {
    onUpdate && onUpdate({ type: 'created', user });
  });

  useSyncEvent('user:updated', (user) => {
    onUpdate && onUpdate({ type: 'updated', user });
  });

  useSyncEvent('user:deleted', ({ id }) => {
    onUpdate && onUpdate({ type: 'deleted', userId: id });
  });
};

/**
 * Hook pour les événements
 */
export const useSyncEvents = (onUpdate) => {
  useSyncEvent('event:created', (event) => {
    onUpdate && onUpdate({ type: 'created', event });
  });

  useSyncEvent('event:updated', (event) => {
    onUpdate && onUpdate({ type: 'updated', event });
  });

  useSyncEvent('event:deleted', ({ id }) => {
    onUpdate && onUpdate({ type: 'deleted', eventId: id });
  });

  useSyncEvent('event:status_changed', ({ id, status, oldStatus }) => {
    onUpdate && onUpdate({ type: 'status_changed', eventId: id, status, oldStatus });
  });
};

/**
 * Hook pour les affectations
 */
export const useSyncAssignments = (onUpdate) => {
  useSyncEvent('assignment:created', (assignment) => {
    onUpdate && onUpdate({ type: 'created', assignment });
  });

  useSyncEvent('assignment:updated', (assignment) => {
    onUpdate && onUpdate({ type: 'updated', assignment });
  });

  useSyncEvent('assignment:deleted', ({ id }) => {
    onUpdate && onUpdate({ type: 'deleted', assignmentId: id });
  });

  useSyncEvent('assignment:confirmed', (assignment) => {
    onUpdate && onUpdate({ type: 'confirmed', assignment });
  });

  useSyncEvent('assignment:received', (assignment) => {
    onUpdate && onUpdate({ type: 'received', assignment });
  });
};

/**
 * Hook pour les pointages
 */
export const useSyncAttendance = (onUpdate) => {
  useSyncEvent('attendance:created', (attendance) => {
    onUpdate && onUpdate({ type: 'created', attendance });
  });

  useSyncEvent('attendance:updated', (attendance) => {
    onUpdate && onUpdate({ type: 'updated', attendance });
  });

  useSyncEvent('checkin', ({ attendance, agent }) => {
    onUpdate && onUpdate({ type: 'checkin', attendance, agent });
  });

  useSyncEvent('checkout', ({ attendance, agent }) => {
    onUpdate && onUpdate({ type: 'checkout', attendance, agent });
  });
};

/**
 * Hook pour les notifications
 */
export const useSyncNotifications = (onUpdate) => {
  useSyncEvent('notification:created', (notification) => {
    onUpdate && onUpdate({ type: 'created', notification });
  });

  useSyncEvent('notification:read', ({ id }) => {
    onUpdate && onUpdate({ type: 'read', notificationId: id });
  });
};

/**
 * Hook pour les incidents
 */
export const useSyncIncidents = (onUpdate) => {
  useSyncEvent('incident:created', (incident) => {
    onUpdate && onUpdate({ type: 'created', incident });
  });

  useSyncEvent('incident:updated', (incident) => {
    onUpdate && onUpdate({ type: 'updated', incident });
  });

  useSyncEvent('incident:resolved', ({ id }) => {
    onUpdate && onUpdate({ type: 'resolved', incidentId: id });
  });

  useSyncEvent('incident:urgent', (incident) => {
    onUpdate && onUpdate({ type: 'urgent', incident });
  });
};

/**
 * Hook pour les SOS
 */
export const useSyncSOS = (onUpdate) => {
  useSyncEvent('sos:created', (alert) => {
    onUpdate && onUpdate({ type: 'created', alert });
  });

  useSyncEvent('sos:resolved', ({ id }) => {
    onUpdate && onUpdate({ type: 'resolved', alertId: id });
  });

  useSyncEvent('sos:urgent', (alert) => {
    onUpdate && onUpdate({ type: 'urgent', alert });
  });
};

/**
 * Hook pour les zones
 */
export const useSyncZones = (onUpdate) => {
  useSyncEvent('zone:created', (zone) => {
    onUpdate && onUpdate({ type: 'created', zone });
  });

  useSyncEvent('zone:updated', (zone) => {
    onUpdate && onUpdate({ type: 'updated', zone });
  });

  useSyncEvent('zone:deleted', ({ id }) => {
    onUpdate && onUpdate({ type: 'deleted', zoneId: id });
  });
};

/**
 * Hook pour la géolocalisation
 */
export const useSyncLocation = (onUpdate) => {
  useSyncEvent('location:updated', (data) => {
    onUpdate && onUpdate({ type: 'updated', ...data });
  });
};

/**
 * Hook pour les statistiques
 */
export const useSyncStats = (onUpdate) => {
  useSyncEvent('stats:updated', ({ type, stats }) => {
    onUpdate && onUpdate({ type, stats });
  });
};

/**
 * Hook tout-en-un pour auto-rafraîchissement d'une liste
 */
export const useAutoRefresh = (fetchFunction, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFunction();
      setData(result);
    } catch (err) {
      setError(err);
      console.error('Erreur de chargement:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, ...dependencies]);

  // Charger initialement
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Écouter les événements de sync pour rafraîchir
  useSyncEvent('sync', () => {
    loadData();
  });

  return { data, loading, error, refresh: loadData };
};

export default {
  useSync,
  useSyncEvent,
  useSyncUsers,
  useSyncEvents,
  useSyncAssignments,
  useSyncAttendance,
  useSyncNotifications,
  useSyncIncidents,
  useSyncSOS,
  useSyncZones,
  useSyncLocation,
  useSyncStats,
  useAutoRefresh
};
