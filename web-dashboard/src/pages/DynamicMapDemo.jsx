/**
 * 🌟 EXEMPLE D'UTILISATION CARTE DYNAMIQUE
 * Démonstration complète d'intégration dans une application React
 */

import React, { useState, useEffect } from 'react';
import { 
  Box, Container, Grid, Paper, Typography, Card, CardContent,
  Switch, FormControlLabel, Slider, Button, Alert, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  Speed, Timeline, MyLocation, Refresh, Settings,
  Event, Group, Notifications, Warning
} from '@mui/icons-material';

import DynamicMap from '../components/maps/DynamicMap';
import useDynamicMap from '../hooks/useDynamicMap';

const DynamicMapDemo = () => {
  const [mapConfig, setMapConfig] = useState({
    autoRefresh: true,
    refreshInterval: 30,
    enableWebSocket: true,
    showTrails: false,
    autoCenter: true
  });

  const [filters, setFilters] = useState({
    eventStatus: 'active_upcoming',
    agentStatus: 'active',
    search: ''
  });

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  // Utiliser notre hook personnalisé
  const {
    events,
    agents,
    mapBounds,
    stats,
    loading,
    error,
    connectionStatus,
    refreshData,
    clearCache,
    centerOnEvents,
    centerOnAgents,
    filteredEvents,
    filteredAgents,
    connectionInfo
  } = useDynamicMap({
    autoRefresh: mapConfig.autoRefresh,
    refreshInterval: mapConfig.refreshInterval * 1000,
    enableWebSocket: mapConfig.enableWebSocket,
    filters,
    onEventUpdate: (event) => {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'event_update',
        message: `Événement mis à jour: ${event.name}`,
        timestamp: new Date()
      }]);
    },
    onAgentUpdate: (agent) => {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'agent_update',
        message: `Agent en mouvement: ${agent.firstName} ${agent.lastName}`,
        timestamp: new Date()
      }]);
    },
    onError: (message, type) => {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: type || 'error',
        message,
        timestamp: new Date()
      }]);
    }
  });

  // Nettoyer les notifications anciennes
  useEffect(() => {
    const cleanup = setInterval(() => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      setNotifications(prev => 
        prev.filter(notification => notification.timestamp > fiveMinutesAgo)
      );
    }, 60000);
    
    return () => clearInterval(cleanup);
  }, []);

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'success';
      case 'error': return 'error';
      default: return 'warning';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connecté';
      case 'error': return 'Erreur';
      default: return 'Déconnecté';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Grid container spacing={3}>
        {/* En-tête avec statistiques */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" color="primary" gutterBottom>
                  🗺️ Carte Dynamique Avancée
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Visualisation temps réel des événements et agents
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Card variant="outlined" sx={{ minWidth: 120 }}>
                  <CardContent sx={{ p: 2, textAlign: 'center' }}>
                    <Event color="error" sx={{ fontSize: 32 }} />
                    <Typography variant="h6">{stats.ongoingEvents}</Typography>
                    <Typography variant="caption">En cours</Typography>
                  </CardContent>
                </Card>
                
                <Card variant="outlined" sx={{ minWidth: 120 }}>
                  <CardContent sx={{ p: 2, textAlign: 'center' }}>
                    <Group color="success" sx={{ fontSize: 32 }} />
                    <Typography variant="h6">{stats.activeAgents}</Typography>
                    <Typography variant="caption">Actifs</Typography>
                  </CardContent>
                </Card>
                
                <Card variant="outlined" sx={{ minWidth: 120 }}>
                  <CardContent sx={{ p: 2, textAlign: 'center' }}>
                    <Speed color="primary" sx={{ fontSize: 32 }} />
                    <Chip 
                      label={getConnectionStatusText()}
                      color={getConnectionStatusColor()}
                      size="small"
                    />
                    <Typography variant="caption" display="block">
                      Connexion
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Configuration et contrôles */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ⚙️ Configuration
              </Typography>
              
              <Box sx={{ mb: 2 }}>
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
                  label="Actualisation auto"
                />
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={mapConfig.enableWebSocket}
                      onChange={(e) => setMapConfig(prev => ({
                        ...prev,
                        enableWebSocket: e.target.checked
                      }))}
                    />
                  }
                  label="Temps réel"
                />
              </Box>
              
              <Box sx={{ mb: 2 }}>
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
                  label="Trajets agents"
                />
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>
                  Intervalle: {mapConfig.refreshInterval}s
                </Typography>
                <Slider
                  value={mapConfig.refreshInterval}
                  onChange={(e, value) => setMapConfig(prev => ({
                    ...prev,
                    refreshInterval: value
                  }))}
                  min={10}
                  max={120}
                  step={10}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={refreshData}
                  disabled={loading}
                  fullWidth
                >
                  Actualiser
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<MyLocation />}
                  onClick={centerOnEvents}
                  fullWidth
                >
                  Centrer événements
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Group />}
                  onClick={centerOnAgents}
                  fullWidth
                >
                  Centrer agents
                </Button>
                
                <Button
                  variant="text"
                  onClick={clearCache}
                  size="small"
                >
                  Vider cache
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Notifications temps réel */}
          {notifications.length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🔔 Notifications
                </Typography>
                
                <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {notifications.slice(-5).map(notification => (
                    <Alert 
                      key={notification.id}
                      severity={notification.type === 'error' ? 'error' : 'info'}
                      sx={{ mb: 1, fontSize: '0.75rem' }}
                    >
                      {notification.message}
                    </Alert>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Carte principale */}
        <Grid item xs={12} md={9}>
          <Paper elevation={3} sx={{ height: '70vh', position: 'relative' }}>
            {error && (
              <Alert 
                severity="error" 
                sx={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 2000 }}
              >
                {error}
              </Alert>
            )}
            
            <DynamicMap />
          </Paper>
        </Grid>

        {/* Listes détaillées */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📍 Événements ({filteredEvents().length})
                  </Typography>
                  
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {filteredEvents().map(event => (
                      <Paper
                        key={event.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          mb: 1,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                        onClick={() => setSelectedEvent(event)}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Chip
                            label={event.status}
                            color={event.status === 'ongoing' ? 'error' : 'default'}
                            size="small"
                          />
                          <Typography variant="subtitle2" sx={{ flex: 1 }}>
                            {event.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {event.assignedAgents} agents
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="textSecondary">
                          📍 {event.location}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    👥 Agents ({filteredAgents().length})
                  </Typography>
                  
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {filteredAgents().map(agent => (
                      <Paper
                        key={agent.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          mb: 1,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                        onClick={() => setSelectedAgent(agent)}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Chip
                            label={agent.status}
                            color={agent.status === 'active' ? 'success' : 'default'}
                            size="small"
                          />
                          <Typography variant="subtitle2" sx={{ flex: 1 }}>
                            {agent.firstName} {agent.lastName}
                          </Typography>
                          {agent.isAnimating && (
                            <Chip
                              label="En mouvement"
                              color="primary"
                              size="small"
                              icon={<Timeline />}
                            />
                          )}
                        </Box>
                        {agent.lastLocationUpdate && (
                          <Typography variant="caption" color="textSecondary">
                            Dernière position: {new Date(agent.lastLocationUpdate).toLocaleTimeString()}
                          </Typography>
                        )}
                      </Paper>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Dialog détails événement */}
      <Dialog
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedEvent && (
          <>
            <DialogTitle>
              📍 {selectedEvent.name}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Statut:</strong> {selectedEvent.status}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Lieu:</strong> {selectedEvent.location}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Début:</strong> {new Date(selectedEvent.startDate).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Fin:</strong> {new Date(selectedEvent.endDate).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Agents assignés:</strong> {selectedEvent.assignedAgents}
                  </Typography>
                  {selectedEvent.description && (
                    <Typography variant="body2" gutterBottom>
                      <strong>Description:</strong> {selectedEvent.description}
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedEvent(null)}>
                Fermer
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Dialog détails agent */}
      <Dialog
        open={!!selectedAgent}
        onClose={() => setSelectedAgent(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedAgent && (
          <>
            <DialogTitle>
              👤 {selectedAgent.firstName} {selectedAgent.lastName}
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" gutterBottom>
                <strong>Statut:</strong> {selectedAgent.status}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Position:</strong> {selectedAgent.latitude?.toFixed(4)}, {selectedAgent.longitude?.toFixed(4)}
              </Typography>
              {selectedAgent.lastLocationUpdate && (
                <Typography variant="body2" gutterBottom>
                  <strong>Dernière position:</strong> {new Date(selectedAgent.lastLocationUpdate).toLocaleString()}
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedAgent(null)}>
                Fermer
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default DynamicMapDemo;