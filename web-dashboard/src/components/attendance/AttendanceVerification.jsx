/**
 * Composant AttendanceVerification amélioré avec affichage de la source des pointages
 * Interface pour visualiser et vérifier les pointages avec traçabilité complète
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Avatar, Alert, CircularProgress, FormControl, InputLabel,
  Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  Accordion, AccordionSummary, AccordionDetails, Divider, Badge
} from '@mui/material';
import {
  Search, FilterList, Verified, Phone, AdminPanelSettings, Supervisor,
  Person, LocationOn, AccessTime, Camera, MyLocation, ExpandMore,
  CheckCircle, Cancel, PhotoCamera, Fingerprint
} from '@mui/icons-material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AttendanceSourceDisplay } from './DuplicateCheckDialog';

const AttendanceVerification = () => {
  // États principaux
  const [attendances, setAttendances] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // États pour les statistiques
  const [stats, setStats] = useState({
    total: 0,
    bySelf: 0,
    byAdmin: 0,
    bySupervisor: 0,
    facialVerified: 0,
    withinGeofence: 0
  });

  // Dialog pour les détails
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchAttendances();
  }, []);

  useEffect(() => {
    fetchAttendances();
  }, [selectedEvent, sourceFilter, startDate, endDate]);

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

  const fetchAttendances = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedEvent) params.append('eventId', selectedEvent);
      if (sourceFilter) params.append('source', sourceFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('limit', '50');

      const response = await fetch(`/api/attendance/with-source?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      const result = await response.json();
      if (result.success) {
        setAttendances(result.data.attendances || []);
        setStats(result.data.stats || {});
      }
    } catch (error) {
      console.error('Erreur chargement pointages:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAttendances = () => {
    if (!searchTerm) return attendances;

    return attendances.filter(att => 
      `${att.agent.firstName} ${att.agent.lastName} ${att.agent.cin} ${att.event.name}`.toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case 'self':
        return <Phone color="primary" fontSize="small" />;
      case 'admin':
        return <AdminPanelSettings color="error" fontSize="small" />;
      case 'supervisor':
        return <Supervisor color="warning" fontSize="small" />;
      default:
        return <Person fontSize="small" />;
    }
  };

  const getSourceColor = (source) => {
    switch (source) {
      case 'self':
        return 'primary';
      case 'admin':
        return 'error';
      case 'supervisor':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getVerificationBadges = (attendance) => {
    const badges = [];

    if (attendance.facialVerified) {
      badges.push(
        <Chip 
          key="facial" 
          label="Reconnaissance faciale" 
          color="success" 
          size="small" 
          icon={<Camera />}
        />
      );
    }

    if (attendance.isWithinGeofence) {
      badges.push(
        <Chip 
          key="geo" 
          label="Zone géographique" 
          color="success" 
          size="small" 
          icon={<MyLocation />}
        />
      );
    } else {
      badges.push(
        <Chip 
          key="geo" 
          label={`${attendance.distanceFromLocation}m`} 
          color="warning" 
          size="small" 
          icon={<LocationOn />}
        />
      );
    }

    return badges;
  };

  const openDetailsDialog = (attendance) => {
    setSelectedAttendance(attendance);
    setDetailsDialogOpen(true);
  };

  const closeDetailsDialog = () => {
    setSelectedAttendance(null);
    setDetailsDialogOpen(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Vérification des Pointages
      </Typography>

      {/* Filtres */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Événement</InputLabel>
                <Select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  label="Événement"
                >
                  <MenuItem value="">Tous les événements</MenuItem>
                  {events.map(event => (
                    <MenuItem key={event.id} value={event.id}>
                      {event.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Source du pointage</InputLabel>
                <Select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  label="Source du pointage"
                >
                  <MenuItem value="">Toutes les sources</MenuItem>
                  <MenuItem value="self">Par l'agent</MenuItem>
                  <MenuItem value="admin">Par l'admin</MenuItem>
                  <MenuItem value="supervisor">Par le superviseur</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="date"
                label="Date début"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="date"
                label="Date fin"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{ startAdornment: <Search /> }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">{stats.total}</Typography>
              <Typography variant="body2">Total Pointages</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">{stats.bySelf}</Typography>
              <Typography variant="body2">Par l'agent</Typography>
              <Phone color="primary" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">{stats.byAdmin}</Typography>
              <Typography variant="body2">Par l'admin</Typography>
              <AdminPanelSettings color="error" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">{stats.bySupervisor}</Typography>
              <Typography variant="body2">Par superviseur</Typography>
              <Supervisor color="warning" />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tableau des pointages */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Pointages ({getFilteredAttendances().length})
          </Typography>

          {loading ? (
            <Box textAlign="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Agent</TableCell>
                    <TableCell>Événement</TableCell>
                    <TableCell>Heure</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Vérifications</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getFilteredAttendances().map((attendance) => (
                    <TableRow key={attendance.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {attendance.agent.firstName[0]}{attendance.agent.lastName[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {attendance.agent.firstName} {attendance.agent.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {attendance.agent.cin}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {attendance.event.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {attendance.event.location}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {format(new Date(attendance.checkInTime), 'dd/MM/yyyy', { locale: fr })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(attendance.checkInTime), 'HH:mm:ss', { locale: fr })}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          {getSourceIcon(attendance.checkInSource)}
                          <Chip 
                            label={attendance.sourceInfo.message}
                            color={getSourceColor(attendance.checkInSource)}
                            size="small"
                          />
                        </Box>
                        {attendance.sourceInfo.checkedInBy && (
                          <Typography variant="caption" color="text.secondary">
                            {attendance.sourceInfo.checkedInBy.firstName} {attendance.sourceInfo.checkedInBy.lastName}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Box display="flex" flexWrap="wrap" gap={0.5}>
                          {getVerificationBadges(attendance)}
                        </Box>
                      </TableCell>

                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openDetailsDialog(attendance)}
                        >
                          Détails
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {!loading && getFilteredAttendances().length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                Aucun pointage trouvé
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Dialog détails */}
      <Dialog 
        open={detailsDialogOpen} 
        onClose={closeDetailsDialog}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Détails du Pointage
        </DialogTitle>
        <DialogContent>
          {selectedAttendance && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Informations Agent</Typography>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {selectedAttendance.agent.firstName[0]}{selectedAttendance.agent.lastName[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" fontWeight="bold">
                          {selectedAttendance.agent.firstName} {selectedAttendance.agent.lastName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          CIN: {selectedAttendance.agent.cin}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Événement</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {selectedAttendance.event.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedAttendance.event.location}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Source du Pointage</Typography>
                    <AttendanceSourceDisplay attendance={selectedAttendance} />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle1">Détails Techniques</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Méthode:</strong> {selectedAttendance.checkInMethod}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Reconnaissance faciale:</strong> {selectedAttendance.facialVerified ? 'Oui' : 'Non'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Dans la zone:</strong> {selectedAttendance.isWithinGeofence ? 'Oui' : 'Non'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Distance:</strong> {selectedAttendance.distanceFromLocation}m
                        </Typography>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetailsDialog}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendanceVerification;