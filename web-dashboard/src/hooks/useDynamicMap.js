/**
 * HOOK REACT POUR CARTE DYNAMIQUE
 * 🎯 Intégration complète du service de carte dynamique
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamicMapService from '../services/DynamicMapService';

export const useDynamicMap = (config = {}) => {
  const [events, setEvents] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [mapBounds, setMapBounds] = useState(null);
  const [stats, setStats] = useState({
    totalEvents: 0,
    ongoingEvents: 0,
    activeAgents: 0,
    totalAgents: 0
  });
  
  const unsubscribeRef = useRef();
  const retryTimeoutRef = useRef();
  
  const {
    autoRefresh = true,
    refreshInterval = 30000,
    enableWebSocket = true,
    filters = {},
    onEventUpdate,
    onAgentUpdate,
    onError
  } = config;

  /**
   * 📡 GESTION DES MISES À JOUR WEBSOCKET
   */
  const handleWebSocketUpdate = useCallback((event, data) => {
    switch (event) {
      case 'connected':
        setConnectionStatus('connected');
        setError(null);
        break;
        
      case 'error':
        setConnectionStatus('error');
        setError(data.message);
        if (onError) onError(data.message);
        break;
        
      case 'event_update':
        setEvents(prevEvents => {
          const updatedEvents = [...prevEvents];
          const existingIndex = updatedEvents.findIndex(e => e.id === data.id);
          
          if (existingIndex >= 0) {
            updatedEvents[existingIndex] = { ...updatedEvents[existingIndex], ...data };
          } else {
            updatedEvents.push(data);
          }
          
          if (onEventUpdate) onEventUpdate(data);
          return updatedEvents;
        });
        break;
        
      case 'agent_location':
        setAgents(prevAgents => {
          const updatedAgents = [...prevAgents];
          const existingIndex = updatedAgents.findIndex(a => a.id === data.id);
          
          if (existingIndex >= 0) {
            updatedAgents[existingIndex] = { ...updatedAgents[existingIndex], ...data };
          } else {
            updatedAgents.push(data);
          }
          
          if (onAgentUpdate) onAgentUpdate(data);
          return updatedAgents;
        });
        break;
        
      case 'agent_move_frame':
        // Animation fluide de mouvement d'agent
        setAgents(prevAgents => {
          const updatedAgents = [...prevAgents];
          const agentIndex = updatedAgents.findIndex(a => a.id === data.id);
          
          if (agentIndex >= 0) {
            updatedAgents[agentIndex] = {
              ...updatedAgents[agentIndex],
              latitude: data.latitude,
              longitude: data.longitude,
              isAnimating: data.progress < 1
            };
          }
          
          return updatedAgents;
        });
        break;
        
      case 'attendance_update':
        // Mettre à jour le badge de l'événement
        setEvents(prevEvents => {
          const updatedEvents = [...prevEvents];
          const eventIndex = updatedEvents.findIndex(e => e.id === data.eventId);
          
          if (eventIndex >= 0) {
            updatedEvents[eventIndex] = {
              ...updatedEvents[eventIndex],
              assignedAgents: data.agentsCount
            };
          }
          
          return updatedEvents;
        });
        break;
        
      case 'emergency':
        // Gérer les alertes d'urgence
        setError(`🚨 URGENCE: ${data.message}`);
        if (onError) onError(data.message, 'emergency');
        break;
        
      default:
        console.log('📦 Événement WebSocket non géré:', event);
    }
  }, [onEventUpdate, onAgentUpdate, onError]);

  /**
   * 📊 CHARGEMENT DES DONNÉES
   */
  const loadData = useCallback(async (showLoading = true) => {
    if (loading) return;
    
    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      const [eventsData, agentsData] = await Promise.all([
        dynamicMapService.loadEventsWithCache(filters),
        dynamicMapService.loadAgentsWithCache(filters)
      ]);

      setEvents(eventsData.events || []);
      setAgents(agentsData.agents || []);
      
      // Calculer les limites géographiques
      const bounds = dynamicMapService.calculateOptimalBounds(
        eventsData.events || [],
        agentsData.agents || []
      );
      setMapBounds(bounds);
      
      // Calculer les statistiques
      const newStats = {
        totalEvents: eventsData.events?.length || 0,
        ongoingEvents: eventsData.events?.filter(e => e.status === 'ongoing').length || 0,
        activeAgents: agentsData.agents?.filter(a => a.status === 'active').length || 0,
        totalAgents: agentsData.agents?.length || 0
      };
      setStats(newStats);
      
    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
      setError(error.message);
      if (onError) onError(error.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [filters, loading, onError]);

  /**
   * 🔄 RECHARGEMENT AVEC RETRY
   */
  const reloadWithRetry = useCallback(async (maxRetries = 3) => {
    let retries = 0;
    
    const attemptLoad = async () => {
      try {
        await loadData();
        setConnectionStatus('connected');
      } catch (error) {
        retries++;
        if (retries < maxRetries) {
          console.log(`🔄 Tentative ${retries}/${maxRetries} dans 2s...`);
          retryTimeoutRef.current = setTimeout(attemptLoad, 2000);
        } else {
          setConnectionStatus('error');
          setError('Impossible de charger les données après plusieurs tentatives');
        }
      }
    };
    
    await attemptLoad();
  }, [loadData]);

  /**
   * ⚡ ACTIONS RAPIDES
   */
  const refreshData = useCallback(() => {
    loadData(true);
  }, [loadData]);

  const clearCache = useCallback(() => {
    dynamicMapService.clearCache();
    loadData(true);
  }, [loadData]);

  const centerOnEvents = useCallback(() => {
    if (events.length > 0) {
      const validEvents = events.filter(e => e.latitude && e.longitude);
      if (validEvents.length > 0) {
        const bounds = dynamicMapService.calculateOptimalBounds(validEvents, []);
        setMapBounds(bounds);
      }
    }
  }, [events]);

  const centerOnAgents = useCallback(() => {
    if (agents.length > 0) {
      const validAgents = agents.filter(a => a.latitude && a.longitude);
      if (validAgents.length > 0) {
        const bounds = dynamicMapService.calculateOptimalBounds([], validAgents);
        setMapBounds(bounds);
      }
    }
  }, [agents]);

  /**
   * 🔍 FILTRAGE ET RECHERCHE
   */
  const filteredEvents = useCallback((searchTerm = '', statusFilter = 'all') => {
    return events.filter(event => {
      const matchesSearch = !searchTerm || 
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        event.status === statusFilter ||
        (statusFilter === 'active_upcoming' && ['ongoing', 'upcoming'].includes(event.status));
      
      return matchesSearch && matchesStatus;
    });
  }, [events]);

  const filteredAgents = useCallback((searchTerm = '', statusFilter = 'all') => {
    return agents.filter(agent => {
      const matchesSearch = !searchTerm || 
        `${agent.firstName} ${agent.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [agents]);

  /**
   * 🎯 EFFETS ET CYCLE DE VIE
   */
  useEffect(() => {
    // Chargement initial
    loadData();
    
    // S'abonner aux mises à jour WebSocket si activé
    if (enableWebSocket) {
      unsubscribeRef.current = dynamicMapService.subscribe(handleWebSocketUpdate);
    }
    
    // Nettoyage à la déconnexion
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [loadData, enableWebSocket, handleWebSocketUpdate]);

  // Actualisation automatique
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;
    
    const interval = setInterval(() => {
      loadData(false); // Pas de loader pour l'actualisation automatique
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadData]);

  // Mettre à jour le statut de connexion
  useEffect(() => {
    if (enableWebSocket) {
      const status = dynamicMapService.connectionStatus;
      setConnectionStatus(status.isConnected ? 'connected' : 'disconnected');
    }
  }, [enableWebSocket]);

  return {
    // Données
    events,
    agents,
    mapBounds,
    stats,
    
    // État
    loading,
    error,
    connectionStatus: connectionStatus,
    
    // Actions
    refreshData,
    clearCache,
    reloadWithRetry,
    centerOnEvents,
    centerOnAgents,
    
    // Filtres
    filteredEvents,
    filteredAgents,
    
    // Métadonnées
    connectionInfo: dynamicMapService.connectionStatus
  };
};

export default useDynamicMap;