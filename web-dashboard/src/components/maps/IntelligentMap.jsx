/**
 * Composant de carte intelligente avec centralisation automatique
 * Affichage optimisé des événements en cours et futurs
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import {
  Box, Paper, Typography, Chip, IconButton, TextField, Select,
  MenuItem, FormControl, InputLabel, Switch, FormControlLabel,
  Card, CardContent, Grid, Fab, Tooltip as MuiTooltip,
  Drawer, List, ListItem, ListItemText, ListItemIcon,
  Badge, ButtonGroup, Button
} from '@mui/material';
import {
  MyLocation, FilterList, Visibility, VisibilityOff,
  Schedule, PlayCircleFilled, CheckCircle, Person,
  LocationOn, Refresh, Fullscreen, Settings,
  Traffic, Timeline
} from '@mui/icons-material';
import MapService from '../services/MapService';
import 'leaflet/dist/leaflet.css';

// Configuration des icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

// Composant pour contrôler le centre de la carte
const MapController = ({ center, zoom, bounds }) => {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      // Si on a des limites, les utiliser pour l'ajustement automatique
      const leafletBounds = L.latLngBounds(
        [bounds.minLat, bounds.minLng],
        [bounds.maxLat, bounds.maxLng]
      );
      map.fitBounds(leafletBounds, { padding: [20, 20] });
    } else if (center) {
      map.setView(center, zoom);
    }
  }, [map, center, zoom, bounds]);

  return null;
};

const IntelligentMap = () => {
  // États principaux
  const [events, setEvents] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // États de la carte
  const [mapCenter, setMapCenter] = useState([36.8485, 10.1833]);
  const [mapZoom, setMapZoom] = useState(10);
  const [mapBounds, setMapBounds] = useState(null);

  // États des filtres
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    search: '',
    showAgents: true,
    showCompleted: false,
    autoRefresh: true
  });

  // États de l'interface
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);

  // Chargement des données
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Charger les événements
      const eventsResponse = await fetch('/api/events', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const eventsData = await eventsResponse.json();
      
      // Charger les agents
      const agentsResponse = await fetch('/api/users?role=agent', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const agentsData = await agentsResponse.json();

      if (eventsData.success) {
        setEvents(eventsData.data.events || []);
      }
      
      if (agentsData.success) {
        setAgents(agentsData.data.users || []);
      }

      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Données préparées et filtrées
  const filteredEvents = useMemo(() => {
    let filtered = MapService.filterEvents(events, filters);
    
    // Exclure les événements terminés si l'option est désactivée
    if (!filters.showCompleted) {
      filtered = filtered.filter(event => 
        MapService.getEventStatus(event) !== 'completed'
      );
    }
    
    return MapService.prepareEventData(filtered);
  }, [events, filters]);

  const agentData = useMemo(() => {
    return filters.showAgents ? MapService.prepareAgentData(agents) : [];
  }, [agents, filters.showAgents]);

  // Calcul du centre optimal
  useEffect(() => {
    if (filteredEvents.length > 0) {
      const optimal = MapService.calculateOptimalCenter(filteredEvents);
      setMapCenter(optimal.center);
      setMapZoom(optimal.zoom);
      setMapBounds(optimal.bounds);
    }
  }, [filteredEvents]);

  // Chargement initial et auto-refresh
  useEffect(() => {
    fetchData();
    
    let interval;
    if (filters.autoRefresh) {
      interval = setInterval(fetchData, 30000); // Refresh toutes les 30 secondes
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchData, filters.autoRefresh]);

  // Gestionnaires d'événements
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setMapCenter([event.latitude, event.longitude]);
    setMapZoom(15);
  };

  const handleRecenter = () => {
    if (filteredEvents.length > 0) {
      const optimal = MapService.calculateOptimalCenter(filteredEvents);
      setMapCenter(optimal.center);
      setMapZoom(optimal.zoom);
      setMapBounds(optimal.bounds);
    }
  };

  const createEventIcon = (event) => {
    return L.divIcon({
      html: `
        <div style="
          background-color: ${event.color};
          border: 2px solid white;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 14px;
          font-weight: bold;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        ">
          ${event.status === 'ongoing' ? '●' : event.status === 'upcoming' ? '◐' : '○'}
        </div>
      `,
      className: 'custom-event-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  };

  const createAgentIcon = (agent) => {
    return L.divIcon({
      html: `
        <div style="
          background-color: ${agent.color};
          border: 2px solid white;
          border-radius: 50%;
          width: 25px;
          height: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        ">
          👤
        </div>
      `,
      className: 'custom-agent-marker',
      iconSize: [25, 25],
      iconAnchor: [12, 12]
    });
  };

  // Statistiques
  const stats = useMemo(() => {
    const ongoing = filteredEvents.filter(e => e.status === 'ongoing').length;
    const upcoming = filteredEvents.filter(e => e.status === 'upcoming').length;
    const completed = events.filter(e => MapService.getEventStatus(e) === 'completed').length;
    const activeAgents = agentData.filter(a => a.status === 'active').length;

    return { ongoing, upcoming, completed, activeAgents };
  }, [filteredEvents, events, agentData]);

  if (error) {
    return (
      <Paper sx={{ p: 2, m: 2 }}>
        <Typography color="error">{error}</Typography>
        <Button onClick={fetchData} sx={{ mt: 2 }}>
          Réessayer
        </Button>
      </Paper>
    );
  }

  return (
    <Box sx={{ position: 'relative', height: '100vh', width: '100%' }}>
      {/* Panneau de contrôle */}
      <Paper 
        sx={{ 
          position: 'absolute', 
          top: 10, 
          left: 10, 
          zIndex: 1000, 
          p: 2, 
          minWidth: 300,
          maxWidth: 400
        }}
      >
        <Typography variant="h6" gutterBottom>
          Carte des Événements
        </Typography>

        {/* Statistiques */}
        <Grid container spacing={1} sx={{ mb: 2 }}>
          <Grid item xs={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: '8px !important', textAlign: 'center' }}>
                <Typography variant="h6" color="success.main">{stats.ongoing}</Typography>
                <Typography variant="caption">En cours</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: '8px !important', textAlign: 'center' }}>
                <Typography variant="h6" color="warning.main">{stats.upcoming}</Typography>
                <Typography variant="caption">À venir</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: '8px !important', textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">{stats.completed}</Typography>
                <Typography variant="caption">Terminés</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: '8px !important', textAlign: 'center' }}>
                <Typography variant="h6" color="primary.main">{stats.activeAgents}</Typography>
                <Typography variant="caption">Agents</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filtres */}
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Statut</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                label="Statut"
              >
                <MenuItem value="all">Tous</MenuItem>
                <MenuItem value="ongoing">En cours</MenuItem>
                <MenuItem value="upcoming">À venir</MenuItem>
                <MenuItem value="completed">Terminés</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Priorité</InputLabel>
              <Select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                label="Priorité"
              >
                <MenuItem value="all">Toutes</MenuItem>
                <MenuItem value="high">Haute</MenuItem>
                <MenuItem value="medium">Moyenne</MenuItem>
                <MenuItem value="low">Basse</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              placeholder="Rechercher un événement..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </Grid>
        </Grid>

        {/* Options d'affichage */}
        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={filters.showAgents}
                onChange={(e) => handleFilterChange('showAgents', e.target.checked)}
              />
            }
            label="Afficher agents"
          />
          <FormControlLabel
            control={
              <Switch
                checked={filters.showCompleted}
                onChange={(e) => handleFilterChange('showCompleted', e.target.checked)}
              />
            }
            label="Inclure terminés"
          />
        </Box>
      </Paper>

      {/* Boutons d'action */}
      <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
        <ButtonGroup orientation="vertical" variant="contained">
          <MuiTooltip title="Recentrer">
            <IconButton onClick={handleRecenter} color="primary">
              <MyLocation />
            </IconButton>
          </MuiTooltip>
          <MuiTooltip title="Actualiser">
            <IconButton onClick={fetchData} color="primary">
              <Refresh />
            </IconButton>
          </MuiTooltip>
          <MuiTooltip title="Plein écran">
            <IconButton 
              onClick={() => setFullscreen(!fullscreen)} 
              color="primary"
            >
              <Fullscreen />
            </IconButton>
          </MuiTooltip>
        </ButtonGroup>
      </Box>

      {/* Carte */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController center={mapCenter} zoom={mapZoom} bounds={mapBounds} />

        {/* Marqueurs d'événements */}
        {filteredEvents.map(event => (
          <Marker
            key={event.id}
            position={[event.latitude, event.longitude]}
            icon={createEventIcon(event)}
            eventHandlers={{
              click: () => handleEventClick(event)
            }}
          >
            <Popup maxWidth={300}>
              <div style={{ minWidth: '250px' }}>
                <Typography variant="h6" gutterBottom>
                  {event.name}
                </Typography>
                
                <Box sx={{ mb: 1 }}>
                  <Chip 
                    label={event.status === 'ongoing' ? 'En Cours' : 
                           event.status === 'upcoming' ? 'À Venir' : 'Terminé'}
                    color={event.status === 'ongoing' ? 'success' : 
                           event.status === 'upcoming' ? 'warning' : 'default'}
                    size="small"
                  />
                  <Chip 
                    label={event.priority === 'high' ? 'Priorité Haute' :
                           event.priority === 'medium' ? 'Priorité Moyenne' : 'Priorité Basse'}
                    color={event.priority === 'high' ? 'error' :
                           event.priority === 'medium' ? 'warning' : 'info'}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Box>

                <Typography variant="body2" gutterBottom>
                  <LocationOn sx={{ fontSize: 16, mr: 0.5 }} />
                  {event.location}
                </Typography>
                
                <Typography variant="body2" gutterBottom>
                  <Schedule sx={{ fontSize: 16, mr: 0.5 }} />
                  {new Date(event.startDate).toLocaleString('fr-FR')}
                </Typography>

                <Typography variant="body2" gutterBottom>
                  <Person sx={{ fontSize: 16, mr: 0.5 }} />
                  {event.assignedAgents} agent(s) affecté(s)
                </Typography>

                {event.description && (
                  <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                    {event.description}
                  </Typography>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Marqueurs d'agents */}
        {agentData.map(agent => (
          <Marker
            key={agent.id}
            position={[agent.latitude, agent.longitude]}
            icon={createAgentIcon(agent)}
          >
            <Popup>
              <div>
                <Typography variant="subtitle1">{agent.name}</Typography>
                <Typography variant="body2">
                  Statut: {agent.status === 'active' ? 'Actif' : 
                           agent.status === 'busy' ? 'Occupé' : 'Hors ligne'}
                </Typography>
                {agent.lastUpdate && (
                  <Typography variant="caption">
                    Dernière position: {new Date(agent.lastUpdate).toLocaleString('fr-FR')}
                  </Typography>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {loading && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.8)',
            zIndex: 2000
          }}
        >
          <Typography>Chargement de la carte...</Typography>
        </Box>
      )}
    </Box>
  );
};

export default IntelligentMap;