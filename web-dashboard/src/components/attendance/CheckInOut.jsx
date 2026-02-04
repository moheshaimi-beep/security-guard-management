/**
 * Composant CheckInOut amélioré avec détection de doublons
 * Interface administrative pour pointer les agents avec prévention des doubles pointages
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Avatar, Alert, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, Autocomplete, FormControl, InputLabel,
  Select, MenuItem
} from '@mui/material';
import {
  Search, CheckCircle, Warning, AccessTime, LocationOn,
  Person, Phone, AdminPanelSettings, Supervisor, Camera,
  MyLocation, Verified
} from '@mui/icons-material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import DuplicateCheckDialog, { useAttendanceCheck, AttendanceSourceDisplay } from './DuplicateCheckDialog';

const CheckInOut = () => {
  // États principaux
  const [agents, setAgents] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState({});

  // États pour la détection de doublons
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [pendingCheckIn, setPendingCheckIn] = useState(null);
  const { isChecking, duplicateData, checkAttendanceStatus, performSecureCheckIn, clearDuplicateData } = useAttendanceCheck();

  // Récupérer les données
  useEffect(() => {
    fetchAgents();
    fetchEvents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/users?role=agent', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      if (result.success) {
        setAgents(result.data.users || []);
      }
    } catch (error) {
      console.error('Erreur chargement agents:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      if (result.success) {
        setEvents(result.data.events || []);
      }
    } catch (error) {
      console.error('Erreur chargement événements:', error);
    }
  };

  // Vérifier le statut de pointage pour tous les agents
  const checkAllAgentsStatus = async () => {
    if (!selectedEvent) return;

    setCheckingStatus({});
    const filteredAgents = getFilteredAgents();

    for (const agent of filteredAgents) {
      setCheckingStatus(prev => ({ ...prev, [agent.id]: 'checking' }));
      
      try {
        const result = await checkAttendanceStatus(agent.id, selectedEvent);
        setCheckingStatus(prev => ({ 
          ...prev, 
          [agent.id]: result.hasDuplicate ? 'has_attendance' : 'no_attendance' 
        }));
      } catch (error) {
        setCheckingStatus(prev => ({ ...prev, [agent.id]: 'error' }));
      }
    }
  };

  const getFilteredAgents = () => {
    return agents.filter(agent => 
      `${agent.firstName} ${agent.lastName} ${agent.cin}`.toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  };

  const getStatusChip = (agentId) => {
    const status = checkingStatus[agentId];
    
    switch (status) {
      case 'checking':
        return <CircularProgress size={16} />;
      case 'has_attendance':
        return <Chip label="Déjà pointé" color="success" size="small" icon={<CheckCircle />} />;
      case 'no_attendance':
        return <Chip label="Non pointé" color="default" size="small" />;
      case 'error':
        return <Chip label="Erreur" color="error" size="small" />;
      default:
        return null;
    }
  };

  // Gérer le pointage avec vérification
  const handleCheckIn = async (agent) => {
    if (!selectedEvent) {
      alert('Veuillez sélectionner un événement');
      return;
    }

    setSelectedAgent(agent);
    
    // Préparer les données de pointage
    const checkInData = {
      agentId: agent.id,
      eventId: selectedEvent,
      checkInMethod: 'admin_assisted',
      latitude: 0, // À compléter avec la géolocalisation si nécessaire
      longitude: 0,
      facialVerified: false,
      isWithinGeofence: true,
      distanceFromLocation: 0,
      notes: `Pointage effectué par admin pour ${agent.firstName} ${agent.lastName}`
    };

    setPendingCheckIn(checkInData);

    // Effectuer le pointage sécurisé
    const result = await performSecureCheckIn(checkInData);

    if (result.isDuplicate) {
      // Ouvrir le dialog de doublon
      setDuplicateDialogOpen(true);
    } else if (result.success) {
      // Pointage réussi
      alert(`Pointage effectué avec succès pour ${agent.firstName} ${agent.lastName}`);
      checkAllAgentsStatus(); // Rafraîchir les statuts
    } else {
      // Erreur
      alert('Erreur lors du pointage: ' + (result.message || 'Erreur inconnue'));
    }

    setSelectedAgent(null);
  };

  const handleDuplicateDialogClose = () => {
    setDuplicateDialogOpen(false);
    setPendingCheckIn(null);
    clearDuplicateData();
  };

  const handleForceCheckIn = async () => {
    // Cette fonction pourrait forcer le pointage (non recommandé)
    // Pour l'instant, on ferme simplement le dialog
    handleDuplicateDialogClose();
    alert('Pointage forcé annulé pour éviter les doublons');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestion des Pointages (Admin)
      </Typography>

      {/* Sélection d'événement */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Sélectionner un événement</InputLabel>
                <Select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  label="Sélectionner un événement"
                >
                  {events.map(event => (
                    <MenuItem key={event.id} value={event.id}>
                      {event.name} - {event.location}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Rechercher un agent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search />,
                }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={checkAllAgentsStatus}
                disabled={!selectedEvent || isChecking}
                startIcon={<Verified />}
              >
                Vérifier Statuts
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Message d'information */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Prévention des doublons:</strong> Le système vérifie automatiquement si un agent a déjà effectué son pointage 
          via son téléphone ou par un autre administrateur avant de permettre un nouveau pointage.
        </Typography>
      </Alert>

      {/* Liste des agents */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Agents ({getFilteredAgents().length})
          </Typography>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Agent</TableCell>
                  <TableCell>CIN</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getFilteredAgents().map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {agent.firstName[0]}{agent.lastName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight="bold">
                            {agent.firstName} {agent.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {agent.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {agent.cin}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {getStatusChip(agent.id)}
                    </TableCell>

                    <TableCell align="center">
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleCheckIn(agent)}
                        disabled={
                          !selectedEvent || 
                          loading || 
                          checkingStatus[agent.id] === 'has_attendance'
                        }
                        startIcon={<CheckCircle />}
                      >
                        {checkingStatus[agent.id] === 'has_attendance' ? 'Déjà pointé' : 'Pointer'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {getFilteredAgents().length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                Aucun agent trouvé
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Dialog de détection de doublon */}
      <DuplicateCheckDialog
        open={duplicateDialogOpen}
        onClose={handleDuplicateDialogClose}
        onProceed={handleForceCheckIn}
        onCancel={handleDuplicateDialogClose}
        existingAttendance={duplicateData?.existingAttendance}
        agentInfo={selectedAgent}
        eventInfo={events.find(e => e.id == selectedEvent)}
      />
    </Box>
  );
};

export default CheckInOut;