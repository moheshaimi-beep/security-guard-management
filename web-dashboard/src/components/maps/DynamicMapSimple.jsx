/**
 * CARTE DYNAMIQUE SIMPLIFIÉE POUR DASHBOARD
 * ✨ Compatible avec la stack existante Tailwind CSS + React Icons
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  FiMapPin, FiUsers, FiRefreshCw, FiSettings, FiZoomIn, FiZoomOut,
  FiNavigation, FiActivity, FiClock, FiUser, FiCalendar
} from 'react-icons/fi';
import 'leaflet/dist/leaflet.css';

// Configuration des icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

// Composant de contrôle automatique de la carte
const MapController = ({ events, agents, autoCenter }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!autoCenter || (!events?.length && !agents?.length)) return;
    
    const allPoints = [
      ...events.filter(e => e.latitude && e.longitude).map(e => [parseFloat(e.latitude), parseFloat(e.longitude)]),
      ...agents.filter(a => a.latitude && a.longitude).map(a => [parseFloat(a.latitude), parseFloat(a.longitude)])
    ];
    
    if (allPoints.length === 0) return;
    
    if (allPoints.length === 1) {
      map.setView(allPoints[0], 15);
    } else {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 16 });
    }
  }, [map, events, agents, autoCenter]);
  
  return null;
};

// Marqueur d'événement personnalisé
const EventMarker = ({ event, onClick }) => {
  if (!event.latitude || !event.longitude) return null;
  
  const position = [parseFloat(event.latitude), parseFloat(event.longitude)];
  
  const getEventIcon = () => {
    const getColor = () => {
      const now = new Date();
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      
      if (now >= start && now <= end) return '#EF4444'; // Rouge - en cours
      if (now < start) return '#F59E0B'; // Orange - à venir
      return '#10B981'; // Vert - terminé
    };
    
    const color = getColor();
    
    return L.divIcon({
      html: `
        <div style="
          background: ${color};
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
        </div>
      `,
      className: 'event-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  };
  
  return (
    <Marker 
      position={position} 
      icon={getEventIcon()}
      eventHandlers={{ click: () => onClick?.(event) }}
    >
      <Popup>
        <div className="min-w-[200px]">
          <h3 className="font-bold text-gray-900 mb-2">{event.name}</h3>
          
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              (() => {
                const now = new Date();
                const start = new Date(event.startDate);
                const end = new Date(event.endDate);
                
                if (now >= start && now <= end) return 'bg-red-100 text-red-800';
                if (now < start) return 'bg-orange-100 text-orange-800';
                return 'bg-green-100 text-green-800';
              })()
            }`}>
              {(() => {
                const now = new Date();
                const start = new Date(event.startDate);
                const end = new Date(event.endDate);
                
                if (now >= start && now <= end) return 'En cours';
                if (now < start) return 'À venir';
                return 'Terminé';
              })()}
            </span>
          </div>
          
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <FiMapPin size={12} />
              <span>{event.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <FiClock size={12} />
              <span>{new Date(event.startDate).toLocaleDateString()}</span>
            </div>
            {event.assignments?.length > 0 && (
              <div className="flex items-center gap-1">
                <FiUsers size={12} />
                <span>{event.assignments.length} agent(s) assigné(s)</span>
              </div>
            )}
          </div>
          
          {event.description && (
            <p className="text-xs text-gray-500 mt-2">
              {event.description.substring(0, 100)}...
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  );
};

// Marqueur d'agent personnalisé
const AgentMarker = ({ agent, onClick }) => {
  if (!agent.latitude || !agent.longitude) return null;
  
  const position = [parseFloat(agent.latitude), parseFloat(agent.longitude)];
  
  const getAgentIcon = () => {
    const getColor = () => {
      switch (agent.status) {
        case 'active': return '#10B981'; // Vert
        case 'busy': return '#F59E0B'; // Orange
        case 'offline': return '#6B7280'; // Gris
        default: return '#6B7280';
      }
    };
    
    const color = getColor();
    
    return L.divIcon({
      html: `
        <div style="
          background: ${color};
          width: 25px;
          height: 25px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
      `,
      className: 'agent-marker',
      iconSize: [25, 25],
      iconAnchor: [12.5, 12.5]
    });
  };
  
  return (
    <Marker 
      position={position} 
      icon={getAgentIcon()}
      eventHandlers={{ click: () => onClick?.(agent) }}
    >
      <Popup>
        <div className="min-w-[150px]">
          <h3 className="font-bold text-gray-900 mb-2">
            {agent.firstName} {agent.lastName}
          </h3>
          
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              agent.status === 'active' ? 'bg-green-100 text-green-800' :
              agent.status === 'busy' ? 'bg-orange-100 text-orange-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {agent.status === 'active' ? 'Actif' :
               agent.status === 'busy' ? 'Occupé' : 'Hors ligne'}
            </span>
          </div>
          
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <FiUser size={12} />
              <span>Agent de sécurité</span>
            </div>
            {agent.lastLocationUpdate && (
              <div className="flex items-center gap-1">
                <FiClock size={12} />
                <span>
                  Dernière position: {new Date(agent.lastLocationUpdate).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

// Composant principal de carte dynamique
const DynamicMap = () => {
  const [events, setEvents] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoCenter, setAutoCenter] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showAgents, setShowAgents] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // Chargement des données
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [eventsRes, agentsRes] = await Promise.all([
        fetch('/api/map/events').catch(() => ({ ok: false })),
        fetch('/api/map/agents').catch(() => ({ ok: false }))
      ]);
      
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.data?.events || []);
      }
      
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(agentsData.data?.agents || []);
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('❌ Erreur chargement données carte:', error);
      setError('Impossible de charger les données de la carte');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Chargement initial et mise à jour automatique
  useEffect(() => {
    loadData();
    
    const interval = setInterval(loadData, 30000); // Mise à jour toutes les 30s
    return () => clearInterval(interval);
  }, [loadData]);
  
  const stats = {
    totalEvents: events.length,
    ongoingEvents: events.filter(e => {
      const now = new Date();
      const start = new Date(e.startDate);
      const end = new Date(e.endDate);
      return now >= start && now <= end;
    }).length,
    activeAgents: agents.filter(a => a.status === 'active').length,
    totalAgents: agents.length
  };
  
  return (
    <div className="relative h-full w-full bg-white rounded-lg shadow-md overflow-hidden">
      {/* En-tête avec statistiques et contrôles */}
      <div className="absolute top-4 left-4 right-4 z-[1000] bg-white/95 backdrop-blur-md rounded-lg shadow-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FiMapPin className="text-blue-600" size={20} />
              <h2 className="text-lg font-bold text-gray-900">Carte Dynamique</h2>
              {loading && (
                <div className="animate-spin">
                  <FiRefreshCw size={16} />
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <div className="flex items-center gap-1 text-sm">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>{stats.ongoingEvents}/{stats.totalEvents} événements</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>{stats.activeAgents}/{stats.totalAgents} agents</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEvents(!showEvents)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                showEvents 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FiCalendar size={14} className="mr-1 inline" />
              Événements
            </button>
            
            <button
              onClick={() => setShowAgents(!showAgents)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                showAgents 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FiUsers size={14} className="mr-1 inline" />
              Agents
            </button>
            
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50"
              title="Actualiser"
            >
              <FiRefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Carte principale */}
      <MapContainer
        center={[33.5731, -7.5898]} // Casablanca par défaut
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />
        
        <MapController
          events={events}
          agents={agents}
          autoCenter={autoCenter}
        />
        
        {/* Marqueurs d'événements */}
        {showEvents && events.map(event => (
          <EventMarker
            key={event.id}
            event={event}
            onClick={(e) => console.log('Événement sélectionné:', e)}
          />
        ))}
        
        {/* Marqueurs d'agents */}
        {showAgents && agents.map(agent => (
          <AgentMarker
            key={agent.id}
            agent={agent}
            onClick={(a) => console.log('Agent sélectionné:', a)}
          />
        ))}
      </MapContainer>
      
      {/* Erreur */}
      {error && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      {/* Indicateur de mise à jour */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-gray-800/90 text-white text-xs px-3 py-2 rounded-lg">
        Dernière mise à jour: {lastUpdate.toLocaleTimeString()}
      </div>
      
      {/* Contrôle de centrage */}
      <button
        onClick={() => setAutoCenter(!autoCenter)}
        className={`absolute bottom-4 right-4 z-[1000] p-3 rounded-full shadow-lg transition-colors ${
          autoCenter 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
        title={autoCenter ? 'Centrage automatique activé' : 'Centrage automatique désactivé'}
      >
        <FiNavigation size={20} />
      </button>
      
      <style jsx>{`
        .event-marker {
          transition: all 0.3s ease;
        }
        
        .event-marker:hover {
          transform: scale(1.1);
        }
        
        .agent-marker {
          transition: all 0.3s ease;
        }
        
        .agent-marker:hover {
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
};

export default DynamicMap;