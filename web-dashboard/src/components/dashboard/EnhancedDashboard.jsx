/**
 * Composant Dashboard avec carte intelligente intégrée
 * Remplace la carte basique par la nouvelle carte centralisée
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Card, CardContent, 
  IconButton, Chip, Alert, CircularProgress
} from '@mui/material';
import {
  Map, Schedule, People, Assignment, Visibility,
  Refresh, Settings, Fullscreen
} from '@mui/icons-material';
import IntelligentMap from '../maps/IntelligentMap';

const EnhancedDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [mapView, setMapView] = useState('integrated'); // 'integrated' | 'fullscreen'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les données du dashboard
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Charger les statistiques de la carte
      const mapResponse = await fetch('/api/map/stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const mapData = await mapResponse.json();

      if (mapData.success) {
        setDashboardData(mapData.data);
      }

      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh toutes les 2 minutes
    const interval = setInterval(fetchDashboardData, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !dashboardData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Chargement du dashboard...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  // Vue plein écran de la carte
  if (mapView === 'fullscreen') {
    return (
      <Box sx={{ height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, zIndex: 9999, backgroundColor: 'white' }}>
        <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1001 }}>
          <IconButton onClick={() => setMapView('integrated')} color="primary" sx={{ backgroundColor: 'white' }}>
            <Fullscreen />
          </IconButton>
        </Box>
        <IntelligentMap />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* En-tête avec statistiques rapides */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Typography variant="h4" gutterBottom>
            Tableau de Bord - Gestion Sécurité
          </Typography>
        </Grid>

        {/* Cartes de statistiques */}
        {dashboardData && (
          <>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h5" color="success.main">
                        {dashboardData.events.ongoing}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Événements en cours
                      </Typography>
                    </Box>
                    <Schedule color="success" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h5" color="warning.main">
                        {dashboardData.events.upcoming}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Événements à venir
                      </Typography>
                    </Box>
                    <Assignment color="warning" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h5" color="primary.main">
                        {dashboardData.agents.total}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Agents totaux
                      </Typography>
                    </Box>
                    <People color="primary" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h5" color="info.main">
                        {dashboardData.attendance.today}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pointages aujourd'hui
                      </Typography>
                    </Box>
                    <Visibility color="info" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>

      {/* Section principale avec la carte */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2, position: 'relative' }}>
            {/* En-tête de la carte */}
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">
                Carte des Événements & Agents
              </Typography>
              <Box>
                <IconButton onClick={fetchDashboardData} size="small">
                  <Refresh />
                </IconButton>
                <IconButton onClick={() => setMapView('fullscreen')} size="small">
                  <Fullscreen />
                </IconButton>
              </Box>
            </Box>

            {/* Carte intégrée */}
            <Box sx={{ height: '500px', borderRadius: 1, overflow: 'hidden' }}>
              <IntelligentMap />
            </Box>
          </Paper>
        </Grid>

        {/* Panneau latéral avec informations */}
        <Grid item xs={12} lg={4}>
          <Grid container spacing={2}>
            {/* Statut du système */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  État du Système
                </Typography>
                
                {dashboardData && (
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="body2">Événements actifs</Typography>
                      <Chip 
                        label={dashboardData.events.ongoing} 
                        color={dashboardData.events.ongoing > 0 ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    
                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="body2">Agents en ligne</Typography>
                      <Chip 
                        label={dashboardData.agents.byStatus?.active || 0}
                        color="primary"
                        size="small"
                      />
                    </Box>
                    
                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="body2">Événements planifiés</Typography>
                      <Chip 
                        label={dashboardData.events.upcoming}
                        color="warning"
                        size="small"
                      />
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                      Dernière mise à jour: {new Date(dashboardData.lastUpdate).toLocaleTimeString('fr-FR')}
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Légende de la carte */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Légende de la Carte
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Événements</Typography>
                  <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                    <Box sx={{ 
                      width: 20, 
                      height: 20, 
                      borderRadius: '50%', 
                      backgroundColor: '#4CAF50',
                      mr: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px'
                    }}>●</Box>
                    <Typography variant="body2">En cours</Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                    <Box sx={{ 
                      width: 20, 
                      height: 20, 
                      borderRadius: '50%', 
                      backgroundColor: '#FF9800',
                      mr: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px'
                    }}>◐</Box>
                    <Typography variant="body2">À venir</Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center">
                    <Box sx={{ 
                      width: 20, 
                      height: 20, 
                      borderRadius: '50%', 
                      backgroundColor: '#9E9E9E',
                      mr: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px'
                    }}>○</Box>
                    <Typography variant="body2">Terminé</Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>Agents</Typography>
                  <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                    <Box sx={{ 
                      width: 18, 
                      height: 18, 
                      borderRadius: '50%', 
                      backgroundColor: '#4CAF50',
                      mr: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px'
                    }}>👤</Box>
                    <Typography variant="body2">Actif</Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                    <Box sx={{ 
                      width: 18, 
                      height: 18, 
                      borderRadius: '50%', 
                      backgroundColor: '#FF9800',
                      mr: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px'
                    }}>👤</Box>
                    <Typography variant="body2">Occupé</Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center">
                    <Box sx={{ 
                      width: 18, 
                      height: 18, 
                      borderRadius: '50%', 
                      backgroundColor: '#F44336',
                      mr: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px'
                    }}>👤</Box>
                    <Typography variant="body2">Hors ligne</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Actions rapides */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Actions Rapides
                </Typography>
                
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Card variant="outlined" sx={{ cursor: 'pointer', textAlign: 'center', p: 1 }}>
                      <Typography variant="caption">Créer Événement</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <Card variant="outlined" sx={{ cursor: 'pointer', textAlign: 'center', p: 1 }}>
                      <Typography variant="caption">Affecter Agents</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <Card variant="outlined" sx={{ cursor: 'pointer', textAlign: 'center', p: 1 }}>
                      <Typography variant="caption">Voir Rapports</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <Card variant="outlined" sx={{ cursor: 'pointer', textAlign: 'center', p: 1 }}>
                      <Typography variant="caption">Notifications</Typography>
                    </Card>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EnhancedDashboard;