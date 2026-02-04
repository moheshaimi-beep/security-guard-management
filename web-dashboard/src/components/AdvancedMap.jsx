/**
 * Advanced Map Component
 * Real-time agent tracking with multiple layers and features
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  FiMapPin, FiUsers, FiCalendar, FiLayers, FiMaximize2,
  FiRefreshCw, FiNavigation, FiTarget, FiFilter, FiClock,
  FiWifi, FiWifiOff, FiAlertTriangle, FiCheckCircle, FiZap
} from 'react-icons/fi';

// Custom marker icons
const createCustomIcon = (color, pulse = false) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="relative">
        ${pulse ? '<div class="absolute -inset-2 bg-' + color + '-500 rounded-full animate-ping opacity-30"></div>' : ''}
        <div class="w-10 h-10 bg-${color}-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

const createEventIcon = (status) => {
  const colors = {
    active: 'green',
    upcoming: 'blue',
    completed: 'gray',
  };
  const color = colors[status] || 'blue';

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="w-8 h-8 bg-${color}-500 rounded-lg flex items-center justify-center shadow-lg border-2 border-white transform rotate-45">
        <svg class="w-4 h-4 text-white transform -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Map controller component
const MapController = ({ center, zoom }) => {
  const map = useMap();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!map) return;
    
    let mounted = true;
    
    const checkMapReady = () => {
      try {
        const container = map.getContainer();
        if (container && container._leaflet_pos !== undefined) {
          map.whenReady(() => {
            if (mounted) {
              setTimeout(() => setIsReady(true), 50);
            }
          });
        } else {
          setTimeout(checkMapReady, 50);
        }
      } catch (error) {
        console.warn('Map readiness check error:', error);
        if (mounted) {
          setTimeout(checkMapReady, 100);
        }
      }
    };
    
    const timer = setTimeout(checkMapReady, 100);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [map]);

  useEffect(() => {
    if (!isReady || !map || !center) return;
    
    try {
      const container = map.getContainer();
      if (!container || container._leaflet_pos === undefined) return;
      
      map.flyTo(center, zoom || map.getZoom(), { duration: 1 });
    } catch (error) {
      console.warn('MapController flyTo error:', error);
    }
  }, [center, zoom, map, isReady]);

  return null;
};

// Main component
const AdvancedMap = ({
  agents = [],
  events = [],
  selectedAgent = null,
  onAgentClick = () => {},
  onEventClick = () => {},
  height = '500px',
  showControls = true,
  showLegend = true,
  realTimeUpdates = true,
}) => {
  const mapRef = useRef(null);
  const [mapCenter, setMapCenter] = useState([33.5731, -7.5898]); // Default: Casablanca
  const [mapZoom, setMapZoom] = useState(12);
  const [mapStyle, setMapStyle] = useState('streets');
  const [showAgents, setShowAgents] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showTrails, setShowTrails] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState('all');

  // Map tile layers
  const tileLayers = {
    streets: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: 'Â© OpenStreetMap contributors',
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Â© Esri',
    },
    terrain: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: 'Â© OpenTopoMap',
    },
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: 'Â© CartoDB',
    },
  };

  // Filter agents
  const filteredAgents = agents.filter(agent => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'online') return agent.isOnline;
    if (filterStatus === 'offline') return !agent.isOnline;
    if (filterStatus === 'alert') return agent.hasAlert;
    return true;
  });

  // Calculate statistics
  const stats = {
    total: agents.length,
    online: agents.filter(a => a.isOnline).length,
    offline: agents.filter(a => !a.isOnline).length,
    alerts: agents.filter(a => a.hasAlert).length,
  };

  // Auto-center on agents
  useEffect(() => {
    if (agents.length > 0 && !selectedAgent) {
      const validAgents = agents.filter(a => a.latitude && a.longitude);
      if (validAgents.length > 0) {
        const avgLat = validAgents.reduce((sum, a) => sum + a.latitude, 0) / validAgents.length;
        const avgLng = validAgents.reduce((sum, a) => sum + a.longitude, 0) / validAgents.length;
        setMapCenter([avgLat, avgLng]);
      }
    }
  }, [agents, selectedAgent]);

  // Center on selected agent
  useEffect(() => {
    if (selectedAgent?.latitude && selectedAgent?.longitude) {
      setMapCenter([selectedAgent.latitude, selectedAgent.longitude]);
      setMapZoom(16);
    }
  }, [selectedAgent]);

  // Simulate real-time updates
  useEffect(() => {
    if (realTimeUpdates) {
      const interval = setInterval(() => {
        setLastUpdate(new Date());
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [realTimeUpdates]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Center map on user location
  const centerOnUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
          setMapZoom(15);
        },
        (error) => console.error('Geolocation error:', error)
      );
    }
  };

  // Fit bounds to show all markers
  const fitAllMarkers = useCallback(() => {
    if (mapRef.current) {
      const allPoints = [
        ...filteredAgents.filter(a => a.latitude && a.longitude).map(a => [a.latitude, a.longitude]),
        ...events.filter(e => e.latitude && e.longitude).map(e => [e.latitude, e.longitude]),
      ];
      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [filteredAgents, events]);

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      {/* Top Controls Bar */}
      {showControls && (
        <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between">
          {/* Left controls */}
          <div className="flex items-center gap-2">
            {/* Stats badges */}
            <div className="flex items-center gap-1 bg-white rounded-lg shadow-lg p-1">
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md">
                <FiUsers className="text-gray-600" size={14} />
                <span className="text-sm font-medium text-gray-700">{stats.total}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-md">
                <FiWifi className="text-green-600" size={14} />
                <span className="text-sm font-medium text-green-700">{stats.online}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md">
                <FiWifiOff className="text-gray-500" size={14} />
                <span className="text-sm font-medium text-gray-600">{stats.offline}</span>
              </div>
              {stats.alerts > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-red-100 rounded-md animate-pulse">
                  <FiAlertTriangle className="text-red-600" size={14} />
                  <span className="text-sm font-medium text-red-700">{stats.alerts}</span>
                </div>
              )}
            </div>

            {/* Filter dropdown */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white rounded-lg shadow-lg px-3 py-2 text-sm border-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Tous les agents</option>
              <option value="online">En ligne ({stats.online})</option>
              <option value="offline">Hors ligne ({stats.offline})</option>
              {stats.alerts > 0 && <option value="alert">Alertes ({stats.alerts})</option>}
            </select>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Map style selector */}
            <div className="bg-white rounded-lg shadow-lg p-1 flex">
              {Object.keys(tileLayers).map((style) => (
                <button
                  key={style}
                  onClick={() => setMapStyle(style)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    mapStyle === style
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </button>
              ))}
            </div>

            {/* Layer toggles */}
            <div className="bg-white rounded-lg shadow-lg p-1 flex items-center gap-1">
              <button
                onClick={() => setShowAgents(!showAgents)}
                className={`p-2 rounded-md transition-colors ${showAgents ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
                title="Agents"
              >
                <FiUsers size={16} />
              </button>
              <button
                onClick={() => setShowEvents(!showEvents)}
                className={`p-2 rounded-md transition-colors ${showEvents ? 'bg-green-100 text-green-600' : 'text-gray-400'}`}
                title="Ã‰vÃ©nements"
              >
                <FiCalendar size={16} />
              </button>
              <button
                onClick={() => setShowGeofences(!showGeofences)}
                className={`p-2 rounded-md transition-colors ${showGeofences ? 'bg-purple-100 text-purple-600' : 'text-gray-400'}`}
                title="Zones"
              >
                <FiTarget size={16} />
              </button>
              <button
                onClick={() => setShowTrails(!showTrails)}
                className={`p-2 rounded-md transition-colors ${showTrails ? 'bg-orange-100 text-orange-600' : 'text-gray-400'}`}
                title="Trajets"
              >
                <FiNavigation size={16} />
              </button>
            </div>

            {/* Action buttons */}
            <div className="bg-white rounded-lg shadow-lg p-1 flex items-center gap-1">
              <button
                onClick={fitAllMarkers}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                title="Voir tout"
              >
                <FiMaximize2 size={16} />
              </button>
              <button
                onClick={centerOnUserLocation}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                title="Ma position"
              >
                <FiNavigation size={16} />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                title="Plein Ã©cran"
              >
                <FiMaximize2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Container */}
      <MapContainer
        ref={mapRef}
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: isFullscreen ? '100vh' : height, width: '100%' }}
        className="rounded-xl overflow-hidden"
      >
        <MapController center={mapCenter} zoom={mapZoom} />

        {/* Tile Layer */}
        <TileLayer
          url={tileLayers[mapStyle].url}
          attribution={tileLayers[mapStyle].attribution}
        />

        {/* Agent Markers with Clustering */}
        {showAgents && (
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={50}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
          >
            {filteredAgents.map((agent) => {
              if (!agent.latitude || !agent.longitude) return null;

              const iconColor = agent.hasAlert ? 'red' : agent.isOnline ? 'green' : 'gray';

              return (
                <Marker
                  key={agent.id}
                  position={[agent.latitude, agent.longitude]}
                  icon={createCustomIcon(iconColor, agent.hasAlert)}
                  eventHandlers={{
                    click: () => onAgentClick(agent),
                  }}
                >
                  <Popup className="custom-popup">
                    <div className="p-2 min-w-[200px]">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-full bg-${iconColor}-100 flex items-center justify-center`}>
                          <span className="text-sm font-bold text-gray-700">
                            {agent.firstName?.[0]}{agent.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">
                            {agent.firstName} {agent.lastName}
                          </h4>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${agent.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className="text-xs text-gray-500">
                              {agent.isOnline ? 'En ligne' : 'Hors ligne'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {agent.currentEvent && (
                        <div className="bg-blue-50 rounded-lg p-2 mb-2">
                          <p className="text-xs text-blue-600 font-medium">Ã‰vÃ©nement actuel</p>
                          <p className="text-sm text-blue-800">{agent.currentEvent}</p>
                        </div>
                      )}

                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <FiMapPin size={12} />
                          <span>{agent.latitude?.toFixed(6)}, {agent.longitude?.toFixed(6)}</span>
                        </div>
                        {agent.lastUpdate && (
                          <div className="flex items-center gap-2">
                            <FiClock size={12} />
                            <span>Mis Ã  jour: {new Date(agent.lastUpdate).toLocaleTimeString('fr-FR')}</span>
                          </div>
                        )}
                        {agent.accuracy && (
                          <div className="flex items-center gap-2">
                            <FiTarget size={12} />
                            <span>PrÃ©cision: Â±{agent.accuracy}m</span>
                          </div>
                        )}
                      </div>

                      {agent.hasAlert && (
                        <div className="mt-2 p-2 bg-red-50 rounded-lg flex items-center gap-2">
                          <FiAlertTriangle className="text-red-500" />
                          <span className="text-sm text-red-700">{agent.alertMessage || 'Alerte active'}</span>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        )}

        {/* Event Markers */}
        {showEvents && events.map((event) => {
          if (!event.latitude || !event.longitude) return null;

          return (
            <React.Fragment key={event.id}>
              <Marker
                position={[event.latitude, event.longitude]}
                icon={createEventIcon(event.status)}
                eventHandlers={{
                  click: () => onEventClick(event),
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <h4 className="font-semibold text-gray-800 mb-2">{event.name}</h4>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <FiMapPin size={12} />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiClock size={12} />
                        <span>{event.checkInTime} - {event.checkOutTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiUsers size={12} />
                        <span>{event.assignedAgents || 0} / {event.requiredAgents} agents</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Geofence circle */}
              {showGeofences && event.geoRadius && (
                <Circle
                  center={[event.latitude, event.longitude]}
                  radius={event.geoRadius}
                  pathOptions={{
                    color: event.status === 'active' ? '#10b981' : '#3b82f6',
                    fillColor: event.status === 'active' ? '#10b981' : '#3b82f6',
                    fillOpacity: 0.1,
                    weight: 2,
                    dashArray: '5, 5',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Agent accuracy circles */}
        {showAgents && filteredAgents.map((agent) => {
          if (!agent.latitude || !agent.longitude || !agent.accuracy) return null;

          return (
            <Circle
              key={`accuracy-${agent.id}`}
              center={[agent.latitude, agent.longitude]}
              radius={agent.accuracy}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.05,
                weight: 1,
              }}
            />
          );
        })}

        {/* Trail lines */}
        {showTrails && filteredAgents.map((agent) => {
          if (!agent.trail || agent.trail.length < 2) return null;

          return (
            <Polyline
              key={`trail-${agent.id}`}
              positions={agent.trail.map(p => [p.lat, p.lng])}
              pathOptions={{
                color: agent.isOnline ? '#10b981' : '#6b7280',
                weight: 3,
                opacity: 0.7,
                dashArray: '10, 5',
              }}
            />
          );
        })}
      </MapContainer>

      {/* Legend */}
      {showLegend && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">LÃ©gende</h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-gray-600">Agent en ligne</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="text-xs text-gray-600">Agent hors ligne</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-gray-600">Alerte active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500 transform rotate-45" />
              <span className="text-xs text-gray-600">Ã‰vÃ©nement</span>
            </div>
          </div>
        </div>
      )}

      {/* Last update indicator */}
      {realTimeUpdates && (
        <div className="absolute bottom-4 right-4 z-[1000] bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-600">
            DerniÃ¨re mise Ã  jour: {lastUpdate.toLocaleTimeString('fr-FR')}
          </span>
        </div>
      )}
    </div>
  );
};

export default AdvancedMap;

