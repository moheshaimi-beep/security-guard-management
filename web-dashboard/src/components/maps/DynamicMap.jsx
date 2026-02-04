/**
 * CARTE DYNAMIQUE AVANCÉE - Système de visualisation temps réel
 * ✨ Mises à jour automatiques, animations fluides, interface moderne
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Box, Paper, Typography, Chip, IconButton, TextField, Select,
  MenuItem, FormControl, InputLabel, Card, CardContent, Grid,
  Fab, Tooltip, Switch, FormControlLabel, Slider, Badge,
  SpeedDial, SpeedDialIcon, SpeedDialAction, Drawer, List,
  ListItem, ListItemText, ListItemIcon, Divider, Button,
  Alert, LinearProgress, Avatar, AvatarGroup
} from '@mui/material';
import {
  MyLocation, Refresh, FilterList, Fullscreen, Settings,
  PlayCircle, Pause, Speed, Timeline, TrendingUp,
  PersonPin, LocationOn, Event, Group, Notifications,
  VisibilityOff, Visibility, ZoomIn, ZoomOut, CenterFocusStrong,
  Navigation, Satellite, Map as MapIcon, Terrain
} from '@mui/icons-material';
import 'leaflet/dist/leaflet.css';

// Configuration des icônes Leaflet personnalisées
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

// Configuration des couches de cartes
const MAP_LAYERS = {
  street: {
    name: 'Carte',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors'
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri'
  },
  terrain: {
    name: 'Relief',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap'
  },
  dark: {
    name: 'Sombre',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CartoDB'
  }
};

// Composant de contrôle dynamique de la carte
const DynamicMapController = ({ 
  events, 
  agents, 
  autoCenter, 
  updateInterval,
  showTrails,
  animateMarkers 
}) => {
  const map = useMap();
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Centrage automatique intelligent
  useEffect(() => {
    if (!autoCenter || (!events?.length && !agents?.length)) return;
    
    const allPoints = [
      ...events.filter(e => e.latitude && e.longitude).map(e => [e.latitude, e.longitude]),
      ...agents.filter(a => a.latitude && a.longitude).map(a => [a.latitude, a.longitude])
    ];
    
    if (allPoints.length === 0) return;
    
    setIsAnimating(true);
    
    if (allPoints.length === 1) {
      map.flyTo(allPoints[0], 15, { duration: 2 });
    } else {
      const bounds = L.latLngBounds(allPoints);
      map.flyToBounds(bounds, { 
        padding: [50, 50], 
        duration: 2,
        maxZoom: 16
      });
    }
    
    setTimeout(() => setIsAnimating(false), 2000);
  }, [map, events, agents, autoCenter]);
  
  return isAnimating ? (
    <div style={{
      position: 'absolute',
      top: 10,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '8px 16px',
      borderRadius: 20,
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }}>
      <Speed sx={{ fontSize: 16 }} />
      Centrage automatique...
    </div>
  ) : null;
};

// Marqueur d'événement animé
const AnimatedEventMarker = ({ event, isSelected, onClick }) => {
  const position = [parseFloat(event.latitude), parseFloat(event.longitude)];
  
  const getEventColor = () => {
    switch (event.status) {
      case 'ongoing': return '#EF4444'; // Rouge vif - urgent
      case 'upcoming': return '#F59E0B'; // Orange - bientôt
      case 'completed': return '#10B981'; // Vert - terminé
      default: return '#6B7280'; // Gris - autres
    }
  };
  
  const getEventIcon = () => {
    const color = getEventColor();
    const size = isSelected ? 50 : 40;
    const pulse = event.status === 'ongoing' ? 'animate-pulse' : '';
    
    return L.divIcon({
      html: `
        <div style="
          background: ${color};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: ${event.status === 'ongoing' ? 'pulse 2s infinite' : 'none'};
          transition: all 0.3s ease;
          cursor: pointer;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
        </div>
      `,
      className: `event-marker ${pulse}`,
      iconSize: [size, size],
      iconAnchor: [size/2, size/2]
    });
  };
  
  return (
    <Marker
      position={position}
      icon={getEventIcon()}
      eventHandlers={{
        click: () => onClick?.(event)
      }}
    >
      <Popup>
        <div style={{ minWidth: 200 }}>
          <Typography variant="h6" color="primary" gutterBottom>
            {event.name}
          </Typography>
          
          <Box sx={{ mb: 1 }}>
            <Chip 
              label={event.status}
              size="small"
              sx={{ 
                backgroundColor: getEventColor(),
                color: 'white',
                textTransform: 'capitalize'
              }}
            />
            <Chip 
              label={`${event.assignedAgents || 0} agents`}
              size="small"
              variant="outlined"
              sx={{ ml: 1 }}
            />
          </Box>
          
          <Typography variant="body2" color="textSecondary" gutterBottom>
            📍 {event.location}
          </Typography>
          
          <Typography variant="body2" gutterBottom>
            🕒 {new Date(event.startDate).toLocaleString()}
          </Typography>
          
          {event.description && (
            <Typography variant="body2" color="textSecondary">
              {event.description.substring(0, 100)}...
            </Typography>
          )}
          
          {event.agents?.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" display="block" gutterBottom>
                Agents assignés:
              </Typography>
              <AvatarGroup max={3} sx={{ justifyContent: 'flex-start' }}>
                {event.agents.map(agent => (
                  <Avatar 
                    key={agent.id}
                    sx={{ width: 24, height: 24, fontSize: 10 }}
                    src={agent.profilePhoto}
                  >
                    {agent.firstName?.[0]}{agent.lastName?.[0]}
                  </Avatar>
                ))}
              </AvatarGroup>
            </Box>
          )}
        </div>
      </Popup>
    </Marker>
  );
};

// Marqueur d'agent animé
const AnimatedAgentMarker = ({ agent, showTrails, onClick }) => {
  const position = [parseFloat(agent.latitude), parseFloat(agent.longitude)];
  
  const getAgentColor = () => {
    switch (agent.status) {
      case 'active': return '#10B981'; // Vert - actif
      case 'busy': return '#F59E0B'; // Orange - occupé  
      case 'offline': return '#6B7280'; // Gris - hors ligne
      default: return '#6B7280';
    }
  };
  
  const getAgentIcon = () => {
    const color = getAgentColor();
    const isActive = agent.status === 'active';
    
    return L.divIcon({
      html: `
        <div style="
          background: ${color};
          width: 35px;
          height: 35px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: ${isActive ? 'bounce 1s ease infinite' : 'none'};
          transition: all 0.3s ease;
          cursor: pointer;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        ${isActive ? `
          <div style="
            position: absolute;
            top: -5px;
            left: -5px;
            width: 45px;
            height: 45px;
            border-radius: 50%;
            border: 2px solid ${color};
            animation: ping 2s ease infinite;
            opacity: 0.7;
          "></div>
        ` : ''}
      `,
      className: 'agent-marker',
      iconSize: [35, 35],
      iconAnchor: [17.5, 17.5]
    });
  };
  
  return (
    <>
      <Marker
        position={position}
        icon={getAgentIcon()}
        eventHandlers={{
          click: () => onClick?.(agent)
        }}
      >
        <Popup>
          <div style={{ minWidth: 180 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Avatar 
                src={agent.profilePhoto}
                sx={{ width: 40, height: 40, mr: 1 }}
              >
                {agent.firstName?.[0]}{agent.lastName?.[0]}
              </Avatar>
              <div>
                <Typography variant="subtitle2">
                  {agent.firstName} {agent.lastName}
                </Typography>
                <Chip 
                  label={agent.status}
                  size="small"
                  sx={{ 
                    backgroundColor: getAgentColor(),
                    color: 'white',
                    textTransform: 'capitalize'
                  }}
                />
              </div>
            </Box>
            
            {agent.currentEvent && (
              <Typography variant="body2" color="primary" gutterBottom>
                📍 Assigné à: {agent.currentEvent}
              </Typography>
            )}
            
            <Typography variant="caption" color="textSecondary">
              Dernière position: {new Date(agent.lastLocationUpdate).toLocaleTimeString()}
            </Typography>
          </div>
        </Popup>
      </Marker>
      
      {showTrails && agent.trail && (
        <Polygon
          positions={agent.trail}
          pathOptions={{
            color: getAgentColor(),
            weight: 3,
            opacity: 0.6,
            dashArray: '5, 10'
          }}
        />
      )}
    </>
  );
};

// Composant principal de carte dynamique
const DynamicMap = () => {
  const [events, setEvents] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  
  // Configuration de la carte
  const [mapConfig, setMapConfig] = useState({
    layer: 'street',
    autoCenter: true,
    showAgents: true,
    showEvents: true,
    showTrails: false,
    animateMarkers: true,
    updateInterval: 30, // secondes
    autoRefresh: true
  });
  
  // État de l'interface
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState({
    eventStatus: 'active_upcoming',
    agentStatus: 'all',
    search: ''
  });
  
  const intervalRef = useRef();
  const mapRef = useRef();
  
  // Fonction de chargement des données
  const loadMapData = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const [eventsRes, agentsRes] = await Promise.all([
        fetch('/api/map/events?' + new URLSearchParams({
          status: filters.eventStatus,
          search: filters.search,
          includeCompleted: filters.eventStatus.includes('completed')
        })),
        fetch('/api/map/agents?' + new URLSearchParams({
          status: filters.agentStatus,
          includeTrails: mapConfig.showTrails
        }))
      ]);
      
      if (eventsRes.ok && agentsRes.ok) {
        const eventsData = await eventsRes.json();
        const agentsData = await agentsRes.json();
        
        setEvents(eventsData.data?.events || []);
        setAgents(agentsData.data?.agents || []);
      }
    } catch (error) {
      console.error('❌ Erreur chargement données carte:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, mapConfig.showTrails, loading]);
  
  // Chargement initial et mise à jour automatique
  useEffect(() => {
    loadMapData();
    
    if (mapConfig.autoRefresh && mapConfig.updateInterval > 0) {
      intervalRef.current = setInterval(loadMapData, mapConfig.updateInterval * 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadMapData, mapConfig.autoRefresh, mapConfig.updateInterval]);
  
  // Statistiques en temps réel
  const stats = useMemo(() => ({
    totalEvents: events.length,
    ongoingEvents: events.filter(e => e.status === 'ongoing').length,
    activeAgents: agents.filter(a => a.status === 'active').length,
    totalAgents: agents.length
  }), [events, agents]);
  
  return (
    <Box sx={{ height: '100vh', width: '100%', position: 'relative' }}>
      {/* En-tête avec statistiques et contrôles */}
      <Paper 
        elevation={3}
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          zIndex: 1000,
          p: 2,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MapIcon color="primary" />
              <Typography variant="h6" color="primary" fontWeight="bold">
                Carte Dynamique
              </Typography>
              {loading && <LinearProgress sx={{ width: 50, ml: 1 }} />}
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Chip 
                icon={<Event />}
                label={`${stats.ongoingEvents}/${stats.totalEvents} événements`}
                color="error"
                variant="outlined"
              />
              <Chip 
                icon={<Group />}
                label={`${stats.activeAgents}/${stats.totalAgents} agents`}
                color="success"
                variant="outlined"
              />
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Recherche rapide */}
            <TextField
              size="small"
              placeholder="Rechercher..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              sx={{ width: 200 }}
            />
            
            {/* Filtre événements */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={filters.eventStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, eventStatus: e.target.value }))}
              >
                <MenuItem value="active_upcoming">Actifs ({stats.ongoingEvents + events.filter(e => e.status === 'upcoming').length})</MenuItem>
                <MenuItem value="all">Tous ({stats.totalEvents})</MenuItem>
                <MenuItem value="ongoing">En cours ({stats.ongoingEvents})</MenuItem>
                <MenuItem value="upcoming">À venir</MenuItem>
                <MenuItem value="completed">Terminés</MenuItem>
              </Select>
            </FormControl>
            
            {/* Contrôles de couche */}
            <Box sx={{ display: 'flex', background: '#f5f5f5', borderRadius: 1, p: 0.5 }}>
              {Object.entries(MAP_LAYERS).map(([key, layer]) => (
                <Button
                  key={key}
                  size="small"
                  variant={mapConfig.layer === key ? 'contained' : 'text'}
                  onClick={() => setMapConfig(prev => ({ ...prev, layer: key }))}
                  sx={{ minWidth: 60, fontSize: '0.75rem' }}
                >
                  {layer.name}
                </Button>
              ))}
            </Box>
            
            {/* Boutons d'action */}
            <Tooltip title="Actualiser">
              <IconButton onClick={loadMapData} disabled={loading}>
                <Refresh />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Configuration">
              <IconButton onClick={() => setDrawerOpen(true)}>
                <Settings />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>
      
      {/* Carte principale */}
      <MapContainer
        ref={mapRef}
        center={[33.5731, -7.5898]} // Casablanca par défaut
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url={MAP_LAYERS[mapConfig.layer].url}
          attribution={MAP_LAYERS[mapConfig.layer].attribution}
        />
        
        <DynamicMapController
          events={events}
          agents={agents}
          autoCenter={mapConfig.autoCenter}
          updateInterval={mapConfig.updateInterval}
          showTrails={mapConfig.showTrails}
          animateMarkers={mapConfig.animateMarkers}
        />
        
        {/* Marqueurs d'événements */}
        {mapConfig.showEvents && events.map(event => (
          <AnimatedEventMarker
            key={event.id}
            event={event}
            isSelected={selectedEvent?.id === event.id}
            onClick={setSelectedEvent}
          />
        ))}
        
        {/* Marqueurs d'agents */}
        {mapConfig.showAgents && agents.map(agent => (
          <AnimatedAgentMarker
            key={agent.id}
            agent={agent}
            showTrails={mapConfig.showTrails}
            onClick={setSelectedAgent}
          />
        ))}
      </MapContainer>
      
      {/* Panneau de configuration */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 350, p: 2 } }}
      >
        <Typography variant="h6" gutterBottom>
          Configuration Carte Dynamique
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <List>
          <ListItem>
            <FormControlLabel
              control={
                <Switch
                  checked={mapConfig.autoCenter}
                  onChange={(e) => setMapConfig(prev => ({ 
                    ...prev, 
                    autoCenter: e.target.checked 
                  }))}
                />
              }
              label="Centrage automatique"
            />
          </ListItem>
          
          <ListItem>
            <FormControlLabel
              control={
                <Switch
                  checked={mapConfig.autoRefresh}
                  onChange={(e) => setMapConfig(prev => ({ 
                    ...prev, 
                    autoRefresh: e.target.checked 
                  }))}
                />
              }
              label="Mise à jour automatique"
            />
          </ListItem>
          
          <ListItem>
            <FormControlLabel
              control={
                <Switch
                  checked={mapConfig.showAgents}
                  onChange={(e) => setMapConfig(prev => ({ 
                    ...prev, 
                    showAgents: e.target.checked 
                  }))}
                />
              }
              label="Afficher les agents"
            />
          </ListItem>
          
          <ListItem>
            <FormControlLabel
              control={
                <Switch
                  checked={mapConfig.showTrails}
                  onChange={(e) => setMapConfig(prev => ({ 
                    ...prev, 
                    showTrails: e.target.checked 
                  }))}
                />
              }
              label="Afficher les trajets"
            />
          </ListItem>
          
          <ListItem>
            <Box sx={{ width: '100%' }}>
              <Typography gutterBottom>
                Intervalle de mise à jour: {mapConfig.updateInterval}s
              </Typography>
              <Slider
                value={mapConfig.updateInterval}
                onChange={(e, value) => setMapConfig(prev => ({ 
                  ...prev, 
                  updateInterval: value 
                }))}
                min={10}
                max={300}
                step={10}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
          </ListItem>
        </List>
      </Drawer>
      
      {/* Bouton d'action flottant pour centrage rapide */}
      <Fab
        color="primary"
        size="small"
        sx={{
          position: 'absolute',
          bottom: 80,
          right: 16,
          zIndex: 1000
        }}
        onClick={() => {
          setMapConfig(prev => ({ ...prev, autoCenter: true }));
          // Forcer le re-centrage
          loadMapData();
        }}
      >
        <CenterFocusStrong />
      </Fab>
      
      {/* Indicateur de mise à jour */}
      {mapConfig.autoRefresh && (
        <Paper
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            p: 1,
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Notifications sx={{ fontSize: 16 }} />
          Mise à jour toutes les {mapConfig.updateInterval}s
        </Paper>
      )}
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); }
          40%, 43% { transform: translate3d(0,-10px,0); }
          70% { transform: translate3d(0,-5px,0); }
          90% { transform: translate3d(0,-2px,0); }
        }
        
        @keyframes ping {
          75%, 100% {
            transform: scale(1.2);
            opacity: 0;
          }
        }
        
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
    </Box>
  );
};

export default DynamicMap;