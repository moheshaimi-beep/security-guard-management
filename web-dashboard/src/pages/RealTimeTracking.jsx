import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  FiUsers, FiActivity, FiBattery, FiMapPin, FiClock
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import api from '../services/api';
import useAuthStore from '../hooks/useAuth';
import { useSync, useSyncEvent } from '../hooks/useSync';

// Socket.IO URL
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Composant pour recentrer la carte
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

// Créer des icônes personnalisées pour les agents et responsables
const createAgentIcon = (isMoving, batteryLevel, role, type = 'agent') => {
  let color = '#10B981'; // Vert par défaut
  
  if (batteryLevel && batteryLevel < 20) {
    color = '#EF4444'; // Rouge si batterie faible
  } else if (!isMoving) {
    color = '#F59E0B'; // Orange si arrêté
  }
  
  // Icône et taille selon le type
  const icon = type === 'supervisor' ? '👔' : '👤';
  const size = type === 'supervisor' ? 45 : 40;
  const borderColor = type === 'supervisor' ? '#9333EA' : 'white';
  
  const html = `
    <div style="
      position: relative;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        border: 3px solid ${borderColor};
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${type === 'supervisor' ? 22 : 20}px;
        ${isMoving ? 'animation: pulse 1.5s infinite;' : ''}
      ">
        ${icon}
      </div>
      ${isMoving ? `
        <div style="
          position: absolute;
          width: ${size + 20}px;
          height: ${size + 20}px;
          border: 2px solid ${color};
          border-radius: 50%;
          animation: ripple 1.5s infinite;
          opacity: 0.6;
        "></div>
      ` : ''}
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      @keyframes ripple {
        0% { transform: scale(0.5); opacity: 1; }
        100% { transform: scale(1.5); opacity: 0; }
      }
    </style>
  `;
  
  return L.divIcon({
    html,
    className: 'custom-agent-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

const RealTimeTracking = () => {
  const { user } = useAuthStore(); // Obtenir l'utilisateur depuis Zustand
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [supervisorsWithAgents, setSupervisorsWithAgents] = useState([]);
  const [agents, setAgents] = useState(new Map());
  const [stats, setStats] = useState({
    total: 0,
    moving: 0,
    stopped: 0,
    lowBattery: 0
  });
  const [mapCenter, setMapCenter] = useState([33.5731, -7.5898]); // Casablanca par défaut
  const [connected, setConnected] = useState(false);
  const [trails, setTrails] = useState(new Map()); // Traînées de mouvement
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [supervisors, setSupervisors] = useState(new Map()); // Positions des responsables
  const [collapsedGroups, setCollapsedGroups] = useState(new Set()); // Groupes pliés
  const [currentTime, setCurrentTime] = useState(Date.now()); // Pour le countdown
  
  const socketRef = useRef(null);
  const isMountedRef = useRef(true); // Pour éviter les reconnexions après démontage
  const animationsRef = useRef(new Map()); // Pour les animations en cours

  // 🔄 SOCKET.IO - Synchronisation temps réel GPS
  const { isConnected } = useSync(user?.id, ['location:all', user?.role === 'supervisor' ? 'supervisor' : 'agent']);

  // Notification de connexion Socket.IO sync
  useEffect(() => {
    if (isConnected) {
      toast.success('🗺️ Suivi GPS temps réel activé', { autoClose: 2000 });
    }
  }, [isConnected]);

  // Événement: Position mise à jour
  useSyncEvent('location:updated', ({ userId, latitude, longitude, accuracy, speed, battery }) => {
    setAgents(prev => {
      const newAgents = new Map(prev);
      const agent = newAgents.get(userId);
      if (agent) {
        newAgents.set(userId, {
          ...agent,
          latitude,
          longitude,
          accuracy,
          speed,
          battery,
          isMoving: speed > 0.5,
          lastUpdate: new Date()
        });
      }
      return newAgents;
    });
  });

  // Événement: Agent entre/sort d'une zone
  useSyncEvent('zone:entered', ({ userId, zoneName }) => {
    const agent = Array.from(agents.values()).find(a => a.userId === userId);
    if (agent) {
      toast.info(`📍 ${agent.firstName} est entré dans ${zoneName}`);
    }
  });

  useSyncEvent('zone:exited', ({ userId, zoneName }) => {
    const agent = Array.from(agents.values()).find(a => a.userId === userId);
    if (agent) {
      toast.warning(`📍 ${agent.firstName} a quitté ${zoneName}`);
    }
  });
  
  // Charger les événements au démarrage
  useEffect(() => {
    loadEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Mettre à jour le temps écoulé toutes les secondes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Fonction pour calculer le temps écoulé
  const getElapsedTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const seconds = Math.floor((currentTime - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };
  
  // ========================================
  // 🔌 Socket.IO Connection Logic
  // ========================================
  const connectSocketIO = useCallback(() => {
    // Ne pas se reconnecter si déjà connecté
    if (socketRef.current?.connected) {
      console.log('ℹ️ Socket.IO déjà connecté, pas de reconnexion');
      return;
    }
    
    try {
      const socket = io(SOCKET_URL, {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10
      });
      
      socket.on('connect', () => {
        console.log('✅ Socket.IO Tracking connecté');
        setConnected(true);
        
        // S'authentifier avec l'utilisateur Zustand
        if (user) {
          console.log('🔑 Authentification Socket.IO avec:', {
            userId: user.id,
            role: user.role,
            eventId: selectedEvent?.id
          });
          socket.emit('auth', {
            userId: user.id,
            role: user.role,
            eventId: selectedEvent?.id
          });
        } else {
          console.error('❌ Utilisateur non connecté! Veuillez vous reconnecter.');
        }
      });

      socket.on('auth:success', (data) => {
        console.log('✅ Authentifié Socket.IO:', data);
        // S'abonner au tracking si un événement est sélectionné
        if (selectedEvent?.id) {
          socket.emit('tracking:subscribe', selectedEvent.id);
        }
      });

      socket.on('auth:error', (error) => {
        console.error('❌ Erreur authentification Socket.IO:', error);
        toast.error('Erreur d\'authentification temps réel');
      });
      
      socket.on('tracking:position_update', (data) => {
        console.log('📍 Position reçue Socket.IO:', data);
        handleSocketIOMessage(data);
      });

      socket.on('tracking:current_positions', (positions) => {
        console.log('📊 Positions actuelles reçues:', positions.length);
        positions.forEach(position => handleSocketIOMessage(position));
      });
      
      socket.on('disconnect', () => {
        console.log('🔴 Socket.IO Tracking déconnecté');
        setConnected(false);
      });
      
      socket.on('connect_error', (error) => {
        console.error('❌ Erreur connexion Socket.IO:', error.message);
        setConnected(false);
      });
      
      socketRef.current = socket;
    } catch (error) {
      console.error('Erreur connexion Socket.IO:', error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedEvent]); // ⚠️ Dépendances pour la closure
  
  // Recentrer la carte quand l'événement change
  useEffect(() => {
    if (selectedEvent?.latitude && selectedEvent?.longitude) {
      setMapCenter([selectedEvent.latitude, selectedEvent.longitude]);
    }
  }, [selectedEvent]);
  
  // Connexion Socket.IO - se connecte UNE SEULE FOIS au montage du composant
  useEffect(() => {
    isMountedRef.current = true;
    connectSocketIO();
    return () => {
      isMountedRef.current = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [connectSocketIO]); // ✅ Se reconnecte quand connectSocketIO change (user ou selectedEvent)
  
  // 🔄 Mettre à jour l'abonnement quand l'événement change
  useEffect(() => {
    if (socketRef.current?.connected && selectedEvent && user) {
      console.log('🔄 Mise à jour eventId dans Socket.IO:', selectedEvent.id);
      socketRef.current.emit('tracking:subscribe', selectedEvent.id);
    }
  }, [selectedEvent, user]); // ✅ Update subscription quand event change
  
  const loadEvents = async () => {
    try {
      setLoading(true);
      console.log('📅 Chargement des événements...');
      const response = await api.get('/events');
      
      // Filtrer les événements actifs et futurs
      const activeAndFutureEvents = response.data.data.events.filter(event => {
        // Utiliser le status calculé par le backend
        return event.status === 'active' || event.status === 'pending';
      });
      
      console.log(`📊 ${activeAndFutureEvents.length} événements actifs/futurs trouvés`);
      
      // Trier par date (les actifs en premier, puis par date de début)
      activeAndFutureEvents.sort((a, b) => {
        // Les événements actifs en premier
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        // Sinon trier par date de début
        return new Date(a.startDate) - new Date(b.startDate);
      });
      
      setEvents(activeAndFutureEvents);
      
      // Sélectionner automatiquement le premier événement actif
      if (activeAndFutureEvents.length > 0) {
        const firstEvent = activeAndFutureEvents[0];
        console.log('🎯 Auto-sélection événement:', firstEvent.name);
        setSelectedEvent(firstEvent);
        // Charger immédiatement les assignments
        await loadAssignments(firstEvent.id);
      } else {
        console.warn('⚠️ Aucun événement actif trouvé');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('❌ Erreur chargement événements:', error);
      toast.error('Erreur lors du chargement des événements');
      setLoading(false);
    }
  };
  
  const loadAssignments = async (eventId) => {
    try {
      console.log('🔍 Chargement assignments pour événement:', eventId);
      
      // 🔥 IMPORTANT: Vider les positions actuelles quand on change d'événement
      console.log('🧹 Nettoyage des positions avant changement d\'événement');
      setAgents(new Map());
      setSupervisors(new Map());
      setTrails(new Map());
      
      const response = await api.get(`/assignments?eventId=${eventId}`);
      const assignmentsList = response.data.data.assignments || [];
      
      console.log(`✅ ${assignmentsList.length} assignments chargés`);
      console.log('📋 Assignments détail:', assignmentsList.map(a => ({
        id: a.id,
        agentCIN: a.agent?.cin,
        agentId: a.agent?.id,
        agentName: `${a.agent?.firstName} ${a.agent?.lastName}`,
        role: a.role,
        status: a.status
      })));
      
      setAssignments(assignmentsList);
      
      // Regrouper par superviseur - EXCLURE les superviseurs de la liste des agents
      const grouped = {};
      
      assignmentsList.forEach(assignment => {
        const agent = assignment.agent;
        const supervisor = assignment.supervisor;
        
        if (!agent) {
          console.warn('⚠️ Assignment sans agent:', assignment.id);
          return;
        }
        
        // Si pas de superviseur, créer un groupe "Sans responsable"
        const supervisorId = supervisor?.id || 'no-supervisor';
        const supervisorName = supervisor 
          ? `${supervisor.firstName} ${supervisor.lastName}` 
          : 'Sans responsable';
        
        if (!grouped[supervisorId]) {
          grouped[supervisorId] = {
            supervisor: supervisor || { id: 'no-supervisor', firstName: 'Sans', lastName: 'responsable' },
            supervisorName,
            agents: []
          };
        }
        
        // ✅ NE PAS ajouter le superviseur dans sa propre liste d'agents
        // Vérifier si l'agent est différent du superviseur
        if (!supervisor || agent.id !== supervisor.id) {
          grouped[supervisorId].agents.push({
            ...agent,
            assignmentId: assignment.id,
            status: assignment.status
          });
        } else {
          console.log(`🔄 Superviseur ${agent.firstName} ${agent.lastName} exclu de sa propre liste d'agents`);
        }
      });
      
      setSupervisorsWithAgents(Object.values(grouped));
      
      console.log('📊 Superviseurs et agents regroupés:', Object.values(grouped));
      console.log(`✅ ${Object.keys(grouped).length} groupes créés`);
    } catch (error) {
      console.error('❌ Erreur chargement assignments:', error);
      toast.error('Erreur lors du chargement des affectations');
    }
  };
  
  const handleSocketIOMessage = (data) => {
    console.log('🔔 Socket.IO message reçu:', data);
    
    // Socket.IO envoie directement les données sans wrapper "type"
    // On détecte le type de message par la structure
    if (data.userId && data.latitude && data.longitude) {
      // C'est une mise à jour de position
      console.log('📍 Nouvelle position Socket.IO reçue:', data);
      console.log('🔢 agents.size avant update:', agents.size);
      console.log('🔢 supervisors.size avant update:', supervisors.size);
      updatePersonPosition(data);
      console.log('🔢 agents.size après update:', agents.size);
      console.log('🔢 supervisors.size après update:', supervisors.size);
    } else if (data.error) {
      // C'est une erreur
      console.error('❌ Erreur Socket.IO:', data.error);
      toast.error(data.error);
    } else {
      console.log('⚠️ Format de message Socket.IO inconnu:', data);
    }
  };
  
  const updatePersonPosition = (position, animate = true) => {
    console.log('📍 updatePersonPosition appelée:', position);
    console.log('🎯 selectedEvent:', selectedEvent?.id, selectedEvent?.name);
    console.log('📋 assignments:', assignments.length, 'assignments');
    console.log('📋 assignments détail:', assignments.map(a => ({ 
      agentId: a.agent?.id, 
      agentCIN: a.agent?.cin,
      agentName: a.agent?.firstName + ' ' + a.agent?.lastName,
      agentRole: a.role, // primary, backup, supervisor
      status: a.status // confirmed, pending, etc.
    })));
    
    // Vérifier si la personne est assignée à l'événement sélectionné
    // Le simulateur envoie le CIN comme userId, pas l'UUID
    if (selectedEvent) {
      const assignment = assignments.find(a => 
        a.agent?.cin === position.userId || a.agent?.id === position.userId
      );
      
      const isAssigned = !!assignment;
      
      console.log(`User ${position.userId}: isAssigned=${isAssigned}, status=${assignment?.status}, assignment role=${assignment?.role}`);
      
      if (!isAssigned) {
        console.log(`❌ User ${position.userId} ignoré - pas affecté à cet événement`);
        return; // Ignorer si pas affecté à cet événement
      }
      
      // Déterminer si c'est un agent ou superviseur basé sur le rôle dans l'assignment
      const isSupervisorRole = assignment.role === 'supervisor';
      
      if (isSupervisorRole) {
        console.log('➕ Ajout/update superviseur:', position.userId);
        setSupervisors(prev => {
          const newSupervisors = new Map(prev);
          const oldPosition = newSupervisors.get(position.userId);
          
          if (animate && oldPosition && oldPosition.latitude !== position.latitude && oldPosition.longitude !== position.longitude) {
            animateMarkerMovement(position.userId, oldPosition, position);
            
            setTrails(prevTrails => {
              const newTrails = new Map(prevTrails);
              const trail = newTrails.get(position.userId) || [];
              trail.push([oldPosition.latitude, oldPosition.longitude]);
              if (trail.length > 50) trail.shift();
              newTrails.set(position.userId, trail);
              return newTrails;
            });
          }
          
          newSupervisors.set(position.userId, position);
          console.log('✅ Superviseur ajouté, nouvelle taille:', newSupervisors.size);
          console.log('📍 Position ajoutée:', position.latitude, position.longitude);
          return newSupervisors;
        });
      } else {
        console.log('➕ Ajout/update agent:', position.userId);
        setAgents(prev => {
          const newAgents = new Map(prev);
          const oldPosition = newAgents.get(position.userId);
          
          if (animate && oldPosition && oldPosition.latitude !== position.latitude && oldPosition.longitude !== position.longitude) {
            animateMarkerMovement(position.userId, oldPosition, position);
            
            setTrails(prevTrails => {
              const newTrails = new Map(prevTrails);
              const trail = newTrails.get(position.userId) || [];
              trail.push([oldPosition.latitude, oldPosition.longitude]);
              if (trail.length > 50) trail.shift();
              newTrails.set(position.userId, trail);
              return newTrails;
            });
          }
          
          newAgents.set(position.userId, position);
          console.log('✅ Agent ajouté, nouvelle taille:', newAgents.size);
          console.log('📍 Position ajoutée:', position.latitude, position.longitude);
          return newAgents;
        });
      }
    }
    
    updateStats();
  };

  const updateStats = () => {
    setStats(prev => {
      const moving = Array.from(agents.values()).filter(a => a.isMoving).length;
      const stopped = agents.size - moving;
      const lowBattery = Array.from(agents.values()).filter(a => a.batteryLevel && a.batteryLevel < 20).length;
      
      return {
        total: agents.size,
        moving,
        stopped,
        lowBattery
      };
    });
  };

  // Fonction pour calculer l'offset des marqueurs superposés
  const calculateMarkerOffset = (position, userId) => {
    // Trouver toutes les personnes au même endroit (dans un rayon de 0.00001°)
    const nearby = [];
    const tolerance = 0.00001;
    
    // Vérifier agents
    Array.from(agents.entries()).forEach(([id, agent]) => {
      if (Math.abs(agent.latitude - position[0]) < tolerance && 
          Math.abs(agent.longitude - position[1]) < tolerance) {
        nearby.push({ id, type: 'agent' });
      }
    });
    
    // Vérifier responsables
    Array.from(supervisors.entries()).forEach(([id, supervisor]) => {
      if (Math.abs(supervisor.latitude - position[0]) < tolerance && 
          Math.abs(supervisor.longitude - position[1]) < tolerance) {
        nearby.push({ id: 'supervisor-' + id, type: 'supervisor' });
      }
    });
    
    // Si plusieurs personnes au même endroit, les disposer en cercle
    if (nearby.length > 1) {
      const currentId = userId.startsWith('supervisor-') ? userId : userId;
      const index = nearby.findIndex(p => p.id === currentId || 'supervisor-' + p.id === currentId);
      if (index !== -1) {
        const angle = (index * 360) / nearby.length;
        const radius = 0.00005; // ~5 mètres
        return {
          lat: radius * Math.cos(angle * Math.PI / 180),
          lng: radius * Math.sin(angle * Math.PI / 180)
        };
      }
    }
    
    return { lat: 0, lng: 0 };
  };

  const animateMarkerMovement = (userId, from, to) => {
    // Annuler l'animation précédente si elle existe
    if (animationsRef.current.has(userId)) {
      cancelAnimationFrame(animationsRef.current.get(userId));
    }
    
    const duration = 1000; // 1 seconde
    const startTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing pour un mouvement fluide
      const eased = easeInOutCubic(progress);
      
      const lat = from.latitude + (to.latitude - from.latitude) * eased;
      const lng = from.longitude + (to.longitude - from.longitude) * eased;
      
      setAgents(prev => {
        const newAgents = new Map(prev);
        const agent = newAgents.get(userId);
        if (agent) {
          newAgents.set(userId, {
            ...agent,
            latitude: lat,
            longitude: lng
          });
        }
        return newAgents;
      });
      
      if (progress < 1) {
        const frameId = requestAnimationFrame(animate);
        animationsRef.current.set(userId, frameId);
      } else {
        animationsRef.current.delete(userId);
      }
    };
    
    animate();
  };
  
  const easeInOutCubic = (t) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex items-center justify-between max-w-full mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <FiMapPin className="text-2xl text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tracking GPS Temps Réel</h1>
              <p className="text-sm text-gray-600">Suivi des agents en direct</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Sélecteur d'événement */}
            <div className="relative">
              <label className="block text-xs text-gray-600 mb-1">Événement</label>
              <select
                value={selectedEvent?.id || ''}
                onChange={(e) => {
                  const event = events.find(ev => ev.id === e.target.value);
                  console.log('🔄 Changement événement:', event?.name);
                  
                  // 🧹 Nettoyer immédiatement la carte avant de changer d'événement
                  console.log('🧹 Nettoyage de la carte et des positions');
                  setAgents(new Map());
                  setSupervisors(new Map());
                  setTrails(new Map());
                  
                  setSelectedEvent(event);
                  // Charger les assignments pour le nouvel événement
                  if (event) {
                    loadAssignments(event.id);
                  }
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm min-w-[300px] bg-white"
              >
                {events.length === 0 ? (
                  <option value="">Aucun événement actif</option>
                ) : (
                  events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.name} - {new Date(event.startDate).toLocaleDateString('fr-FR')}
                    </option>
                  ))
                )}
              </select>
            </div>
            
            <div className={`px-3 py-2 rounded-lg ${connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} ${connected ? 'animate-pulse' : ''}`}></div>
                <span className="text-sm font-medium">{connected ? 'Connecté' : 'Déconnecté'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="grid grid-cols-4 gap-4 max-w-full mx-auto">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FiUsers className="text-white text-xl" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Agents</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <div className="bg-green-600 p-2 rounded-lg">
              <FiActivity className="text-white text-xl" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.moving}</p>
              <p className="text-sm text-gray-600">En mouvement</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
            <div className="bg-orange-600 p-2 rounded-lg">
              <FiClock className="text-white text-xl" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.stopped}</p>
              <p className="text-sm text-gray-600">À l'arrêt</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
            <div className="bg-red-600 p-2 rounded-lg">
              <FiBattery className="text-white text-xl" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.lowBattery}</p>
              <p className="text-sm text-gray-600">Batterie faible</p>
            </div>
          </div>
        </div>
      </div>

      {/* Map et Sidebar */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Sidebar Responsables & Agents */}
        {showSidebar && (
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FiUsers className="text-blue-600" />
                Responsables & Agents
              </h3>
              {selectedEvent && (
                <p className="text-xs text-gray-600 mt-1">
                  {supervisorsWithAgents.reduce((sum, s) => sum + s.agents.length, 0)} agent(s) • {supervisorsWithAgents.length} responsable(s)
                </p>
              )}
            </div>
            
            <div className="p-4">
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm">Chargement...</p>
                </div>
              ) : supervisorsWithAgents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiUsers className="text-4xl mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Aucun agent assigné</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {supervisorsWithAgents.map((group) => {
                    // Chercher la position du superviseur par CIN ou ID
                    const supervisorPosition = supervisors.get(group.supervisor.cin) || supervisors.get(group.supervisor.id);
                    const isSupervisorTracked = supervisorPosition !== undefined;
                    const isCollapsed = collapsedGroups.has(group.supervisor.id);
                    
                    return (
                    <div key={group.supervisor.id} className="bg-gray-50 rounded-lg p-3">
                      <div 
                        className="flex items-center gap-2 mb-3 cursor-pointer hover:bg-gray-100 rounded p-2 -m-2"
                        onClick={() => {
                          setCollapsedGroups(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(group.supervisor.id)) {
                              newSet.delete(group.supervisor.id);
                            } else {
                              newSet.add(group.supervisor.id);
                            }
                            return newSet;
                          });
                        }}
                      >
                        <div className="text-gray-500 transition-transform" style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSupervisorTracked ? 'bg-purple-500' : 'bg-purple-100'}`}>
                          <span className="text-lg">{isSupervisorTracked ? '👔' : '👔'}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">
                            {group.supervisorName}
                          </p>
                          <p className="text-xs text-gray-600">
                            {group.agents.length} agent(s)
                          </p>
                          {isSupervisorTracked && (
                            <p className="text-xs text-green-600 mt-1">
                              📍 {supervisorPosition.isMoving ? 'En mouvement' : 'À l\'arrêt'}
                            </p>
                          )}
                          {!isSupervisorTracked && group.supervisor.id !== 'no-supervisor' && (
                            <p className="text-xs text-gray-400 mt-1">
                              Position non disponible
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {!isCollapsed && (
                      <div className="space-y-2 pl-2">
                        {group.agents.map((agent) => {
                          // Chercher la position de l'agent par CIN ou ID
                          const agentPosition = agents.get(agent.cin) || agents.get(agent.id);
                          const isTracked = agentPosition !== undefined;
                          
                          return (
                            <div key={agent.id} className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200">
                              <div className={`w-2 h-2 rounded-full ${isTracked ? (agentPosition.isMoving ? 'bg-green-500 animate-pulse' : 'bg-orange-500') : 'bg-gray-300'}`}></div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm truncate">
                                  {agent.firstName} {agent.lastName}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {agent.employeeId}
                                </p>
                                {isTracked && (
                                  <p className={`text-xs font-medium ${agentPosition.isMoving ? 'text-green-600' : 'text-orange-600'}`}>
                                    {agentPosition.isMoving ? '🏃 En mouvement' : '🛑 À l\'arrêt'}
                                  </p>
                                )}
                                {!isTracked && (
                                  <p className="text-xs text-gray-400">
                                    Position non disponible
                                  </p>
                                )}
                              </div>
                              {isTracked && agentPosition.batteryLevel && (
                                <div className={`text-xs ${agentPosition.batteryLevel < 20 ? 'text-red-600' : 'text-gray-600'}`}>
                                  🔋 {agentPosition.batteryLevel}%
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer 
            center={mapCenter} 
            zoom={13} 
            className="h-full w-full"
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <RecenterMap center={mapCenter} />
            
            {/* Zone de l'événement */}
            {selectedEvent?.latitude && selectedEvent?.longitude && (
              <>
                <Circle
                  center={[selectedEvent.latitude, selectedEvent.longitude]}
                  radius={selectedEvent.geoRadius || 100}
                  pathOptions={{
                    color: 'blue',
                    fillColor: 'blue',
                    fillOpacity: 0.1
                  }}
                />
                <Marker
                  position={[selectedEvent.latitude, selectedEvent.longitude]}
                  icon={L.divIcon({
                    html: `<div style="
                      width: 40px;
                      height: 40px;
                      background: #3B82F6;
                      border-radius: 50%;
                      border: 3px solid white;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 20px;
                    ">📍</div>`,
                    className: 'custom-event-marker',
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                  })}
                >
                  <Tooltip direction="top" offset={[0, -20]} opacity={0.95} permanent={false}>
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '6px 10px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      border: '2px solid white'
                    }}>
                      <div style={{ color: 'white', fontWeight: 'bold', fontSize: '13px', marginBottom: '2px' }}>
                        📍 {selectedEvent.name}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '10px' }}>
                        Zone: {selectedEvent.geoRadius || 100}m • {supervisorsWithAgents.reduce((sum, s) => sum + s.agents.length, 0)} agents
                      </div>
                    </div>
                  </Tooltip>
                  <Popup maxWidth={350}>
                    <div className="p-4" style={{ minWidth: '300px' }}>
                      {/* Header avec gradient */}
                      <div className="relative mb-4 p-4 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white -m-4 mb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <span className="text-2xl">📍</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-xl">{selectedEvent.name}</h3>
                            <p className="text-blue-100 text-sm font-medium">Zone de sécurité active</p>
                          </div>
                          <div className="text-right">
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                              selectedEvent.status === 'active' ? 'bg-green-400 text-green-900' :
                              selectedEvent.status === 'pending' ? 'bg-yellow-400 text-yellow-900' :
                              'bg-red-400 text-red-900'
                            }`}>
                              {selectedEvent.status === 'active' ? '🟢 EN COURS' :
                               selectedEvent.status === 'pending' ? '🟡 EN ATTENTE' :
                               '🔴 TERMINÉ'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Stats Cards */}
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                          <div className="text-green-600 font-bold text-lg">{supervisorsWithAgents.reduce((sum, s) => sum + s.agents.length, 0)}</div>
                          <div className="text-green-700 text-xs font-medium">👥 Agents</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                          <div className="text-blue-600 font-bold text-lg">{selectedEvent.geoRadius || 100}m</div>
                          <div className="text-blue-700 text-xs font-medium">🔵 Zone</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center">
                          <div className="text-purple-600 font-bold text-lg">{supervisorsWithAgents.length}</div>
                          <div className="text-purple-700 text-xs font-medium">👔 Superviseurs</div>
                        </div>
                      </div>

                      {/* Informations détaillées */}
                      <div className="space-y-3">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-blue-600 text-sm">📍</span>
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 text-sm mb-1">Localisation</div>
                              <div className="text-gray-600 text-xs leading-relaxed">{selectedEvent.location || 'Non définie'}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-3">
                          <div className="flex-1 bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-orange-500">📅</span>
                              <div className="font-semibold text-gray-900 text-sm">Période</div>
                            </div>
                            <div className="text-gray-600 text-xs">
                              {new Date(selectedEvent.startDate).toLocaleDateString('fr-FR', { 
                                day: '2-digit', 
                                month: 'short',
                                year: 'numeric'
                              })} - {new Date(selectedEvent.endDate).toLocaleDateString('fr-FR', { 
                                day: '2-digit', 
                                month: 'short' 
                              })}
                            </div>
                          </div>
                          
                          <div className="flex-1 bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-red-500">🕐</span>
                              <div className="font-semibold text-gray-900 text-sm">Actif depuis</div>
                            </div>
                            <div className={`text-sm font-mono font-bold ${
                              getElapsedTime(selectedEvent.startDate).includes('h') ? 'text-red-600' :
                              getElapsedTime(selectedEvent.startDate).includes('m') && parseInt(getElapsedTime(selectedEvent.startDate)) > 30 ? 'text-orange-600' :
                              'text-green-600'
                            }`}>
                              {getElapsedTime(selectedEvent.startDate)}
                            </div>
                          </div>
                        </div>

                        {/* Barre d'activité */}
                        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-gray-900 text-sm">📊 Activité en temps réel</div>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-xs text-green-600 font-medium">Live</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="text-green-700 font-medium">Actifs</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                              <span className="text-orange-700 font-medium">En pause</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              <span className="text-red-700 font-medium">Batterie faible</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </>
            )}
            
            {/* Afficher les responsables */}
            {(() => {
              console.log('🗺️ Rendu des superviseurs - Nombre:', supervisors.size);
              console.log('🗺️ Superviseurs data:', Array.from(supervisors.entries()));
              return Array.from(supervisors.entries()).map(([userId, supervisor]) => {
              // Calculer offset si plusieurs personnes au même endroit
              const offset = calculateMarkerOffset([supervisor.latitude, supervisor.longitude], 'supervisor-' + userId);
              const adjustedLat = supervisor.latitude + offset.lat;
              const adjustedLng = supervisor.longitude + offset.lng;
              
              return (
                <Marker
                  key={'supervisor-' + userId}
                  position={[adjustedLat, adjustedLng]}
                  icon={createAgentIcon(supervisor.isMoving, supervisor.batteryLevel, 'supervisor', 'supervisor')}
                >
                  <Tooltip direction="top" offset={[0, -15]} opacity={0.95}>
                    <div style={{ 
                      padding: '8px 12px',
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
                      border: '2px solid white',
                      minWidth: '180px'
                    }}>
                      <div style={{ color: 'white', fontWeight: 'bold', fontSize: '13px', marginBottom: '4px', textAlign: 'center' }}>
                        👔 Responsable
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.95)', fontSize: '11px', display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span>{supervisor.isMoving ? '🏃 En mouvement' : '🛑 À l\'arrêt'}</span>
                        <span>🔋 {supervisor.batteryLevel}%</span>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '10px', textAlign: 'center', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.3)' }}>
                        🕐 Il y a {getElapsedTime(supervisor.timestamp)}
                      </div>
                    </div>
                  </Tooltip>
                  <Popup maxWidth={320}>
                    <div className="p-3" style={{ minWidth: '280px' }}>
                      <div className="border-b border-purple-200 pb-2 mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-2xl">👔</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-base text-gray-900">Responsable</h3>
                            <p className="text-xs text-purple-600 font-medium">CIN: {userId}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        <div className="bg-gray-50 rounded-lg p-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${supervisor.isMoving ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                              {supervisor.isMoving ? '🏃 En déplacement' : '🛑 Stationnaire'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-purple-600 font-semibold min-w-[70px]">📍 GPS:</span>
                          <span className="text-gray-600 text-xs font-mono">{supervisor.latitude?.toFixed(6)}, {supervisor.longitude?.toFixed(6)}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-purple-600 font-semibold min-w-[70px]">📡 Précision:</span>
                          <span className="text-gray-700">±{supervisor.accuracy?.toFixed(0)} mètres</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-purple-600 font-semibold min-w-[70px]">🔋 Batterie:</span>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                              <div className={`h-2 rounded-full ${supervisor.batteryLevel > 50 ? 'bg-green-500' : supervisor.batteryLevel > 20 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${supervisor.batteryLevel}%` }}></div>
                            </div>
                            <span className="text-gray-700 font-semibold">{supervisor.batteryLevel}%</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-purple-600 font-semibold min-w-[70px]">🕐 Dernière:</span>
                          <span className="text-gray-700">{new Date(supervisor.timestamp).toLocaleTimeString('fr-FR')}</span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
              });
            })()}
            
            {/* Afficher les agents */}
            {(() => {
              console.log('🗺️ Rendu des agents - Nombre:', agents.size);
              console.log('🗺️ Agents data:', Array.from(agents.entries()));
              return Array.from(agents.entries()).map(([userId, agent]) => {
              const trail = trails.get(userId) || [];
              // Calculer offset si plusieurs personnes au même endroit
              const offset = calculateMarkerOffset([agent.latitude, agent.longitude], userId);
              const adjustedLat = agent.latitude + offset.lat;
              const adjustedLng = agent.longitude + offset.lng;
              
              return (
                <React.Fragment key={userId}>
                  {/* Traînée */}
                  {trail.length > 0 && (
                    <Polyline 
                      positions={[...trail, [agent.latitude, agent.longitude]]}
                      pathOptions={{ color: agent.isMoving ? '#10B981' : '#F59E0B', weight: 2, opacity: 0.6 }}
                    />
                  )}
                  
                  {/* Marqueur agent */}
                  <Marker
                    position={[adjustedLat, adjustedLng]}
                    icon={createAgentIcon(agent.isMoving, agent.batteryLevel, agent.role, 'agent')}
                  >
                    <Tooltip direction="top" offset={[0, -15]} opacity={0.95}>
                      <div style={{ 
                        padding: '8px 12px',
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
                        border: '2px solid white',
                        minWidth: '200px'
                      }}>
                        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '13px', marginBottom: '4px', textAlign: 'center' }}>
                          👮 {agent.firstName} {agent.lastName}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.95)', fontSize: '11px', display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span>{agent.isMoving ? '🏃 En mouvement' : '🛑 À l\'arrêt'}</span>
                          <span>🔋 {agent.batteryLevel || 0}%</span>
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '10px', textAlign: 'center', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.3)' }}>
                          🕐 Il y a {getElapsedTime(agent.timestamp)}
                        </div>
                      </div>
                    </Tooltip>
                    <Popup maxWidth={320}>
                      <div className="p-3" style={{ minWidth: '280px' }}>
                        <div className="border-b border-blue-200 pb-2 mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-2xl">👮</span>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-base text-gray-900">{agent.firstName} {agent.lastName}</h3>
                              <p className="text-xs text-blue-600 font-medium">{agent.employeeId || agent.role}</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2.5">
                          <div className="bg-gray-50 rounded-lg p-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${agent.isMoving ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                {agent.isMoving ? '🏃 En déplacement' : '🛑 Stationnaire'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <span className="text-blue-600 font-semibold min-w-[70px]">📍 GPS:</span>
                            <span className="text-gray-600 text-xs font-mono">{agent.latitude?.toFixed(6)}, {agent.longitude?.toFixed(6)}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <span className="text-blue-600 font-semibold min-w-[70px]">📡 Précision:</span>
                            <span className="text-gray-700">±{agent.accuracy?.toFixed(0)} mètres</span>
                          </div>
                          {agent.batteryLevel && (
                          <div className="flex items-start gap-2 text-sm">
                            <span className="text-blue-600 font-semibold min-w-[70px]">🔋 Batterie:</span>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                                <div className={`h-2 rounded-full ${agent.batteryLevel > 50 ? 'bg-green-500' : agent.batteryLevel > 20 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${agent.batteryLevel}%` }}></div>
                              </div>
                              <span className="text-gray-700 font-semibold">{agent.batteryLevel}%</span>
                            </div>
                          </div>
                          )}
                          <div className="flex items-start gap-2 text-sm">
                            <span className="text-blue-600 font-semibold min-w-[70px]">🕐 Dernière:</span>
                            <span className="text-gray-700">{new Date(agent.timestamp).toLocaleTimeString('fr-FR')}</span>
                          </div>
                          {trail.length > 0 && (
                          <div className="flex items-start gap-2 text-sm">
                            <span className="text-blue-600 font-semibold min-w-[70px]">📏 Trajet:</span>
                            <span className="text-gray-700">{trail.length} point{trail.length > 1 ? 's' : ''}</span>
                          </div>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
              });
            })()}
          </MapContainer>

          {/* Légende */}
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
            <h3 className="font-semibold text-gray-900 mb-2">Légende</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span>En mouvement</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                <span>À l'arrêt</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span>Batterie faible (&lt;20%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">👤</span>
                <span>Agent</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">👔</span>
                <span>Responsable</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <span>Zone événement</span>
              </div>
            </div>
          </div>
          
          {/* Bouton toggle sidebar */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000] hover:bg-gray-50"
          >
            <FiUsers className="text-xl text-gray-700" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RealTimeTracking;
