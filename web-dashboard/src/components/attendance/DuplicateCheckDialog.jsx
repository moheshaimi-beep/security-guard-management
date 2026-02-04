/**
 * Composant React pour gérer les pointages avec détection de doublons
 * Interface améliorée pour /checkinout avec prévention des doubles pointages
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, CardContent, Typography, Box, Alert, Button, 
  Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, Avatar, Grid, Divider
} from '@mui/material';
import {
  Warning, CheckCircle, Person, LocationOn, AccessTime,
  Phone, AdminPanelSettings, Supervisor
} from '@mui/icons-material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const DuplicateCheckDialog = ({ 
  open, 
  onClose, 
  onProceed, 
  onCancel, 
  existingAttendance,
  agentInfo,
  eventInfo 
}) => {
  if (!existingAttendance) return null;

  const getSourceIcon = (source) => {
    switch (source) {
      case 'self':
        return <Phone color="primary" />;
      case 'admin':
        return <AdminPanelSettings color="error" />;
      case 'supervisor':
        return <Supervisor color="warning" />;
      default:
        return <Person />;
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Warning color="warning" />
          Pointage Déjà Effectué
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3}>
          {/* Informations de l'agent */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Informations de l'Agent
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {agentInfo?.firstName?.[0]}{agentInfo?.lastName?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      {agentInfo?.firstName} {agentInfo?.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      CIN: {agentInfo?.cin}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Détails du pointage existant */}
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ bgcolor: 'warning.light', opacity: 0.9 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="warning.dark">
                  Pointage Existant
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <AccessTime color="action" />
                      <Typography variant="body2">
                        <strong>Heure:</strong> {format(new Date(existingAttendance.checkInTime), 'HH:mm:ss', { locale: fr })}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <LocationOn color="action" />
                      <Typography variant="body2">
                        <strong>Événement:</strong> {eventInfo?.name}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      {getSourceIcon(existingAttendance.source)}
                      <Chip 
                        label={existingAttendance.message}
                        color={getSourceColor(existingAttendance.source)}
                        size="small"
                      />
                    </Box>

                    {existingAttendance.checkedInBy && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>Par:</strong> {existingAttendance.checkedInBy.firstName} {existingAttendance.checkedInBy.lastName}
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Message d'avertissement */}
          <Grid item xs={12}>
            <Alert severity="warning">
              <Typography variant="body1" gutterBottom>
                <strong>Attention!</strong> Cet agent a déjà effectué son pointage pour cet événement.
              </Typography>
              <Typography variant="body2">
                {existingAttendance.source === 'self' 
                  ? "L'agent a fait son pointage via son téléphone mobile."
                  : existingAttendance.source === 'admin'
                  ? "Le pointage a été effectué par un administrateur."
                  : "Le pointage a été effectué par un responsable."}
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button 
          onClick={onCancel}
          variant="contained"
          color="primary"
          startIcon={<CheckCircle />}
        >
          Comprendre - Annuler
        </Button>
        
        {/* Option pour forcer (admin seulement) */}
        <Button 
          onClick={onProceed}
          variant="outlined"
          color="warning"
          disabled={true} // Désactivé par défaut pour éviter les erreurs
        >
          Forcer le Pointage (Non recommandé)
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Hook pour vérifier les doublons avant pointage
export const useAttendanceCheck = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [duplicateData, setDuplicateData] = useState(null);

  const checkAttendanceStatus = async (agentId, eventId) => {
    setIsChecking(true);
    try {
      const response = await fetch(`/api/attendance/status?agentId=${agentId}&eventId=${eventId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      
      if (result.success && result.hasAttendance) {
        setDuplicateData(result.data);
        return { hasDuplicate: true, data: result.data };
      }

      return { hasDuplicate: false };

    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      return { hasDuplicate: false, error };
    } finally {
      setIsChecking(false);
    }
  };

  const performSecureCheckIn = async (checkInData) => {
    try {
      const response = await fetch('/api/attendance/check-in-secure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(checkInData)
      });

      const result = await response.json();

      if (!result.success && result.error === 'DUPLICATE_ATTENDANCE') {
        setDuplicateData(result.data);
        return { success: false, isDuplicate: true, data: result.data };
      }

      return result;

    } catch (error) {
      console.error('Erreur lors du pointage sécurisé:', error);
      return { success: false, error };
    }
  };

  const clearDuplicateData = () => {
    setDuplicateData(null);
  };

  return {
    isChecking,
    duplicateData,
    checkAttendanceStatus,
    performSecureCheckIn,
    clearDuplicateData
  };
};

// Composant d'affichage pour les pointages avec source
export const AttendanceSourceDisplay = ({ attendance }) => {
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

  return (
    <Box display="flex" alignItems="center" gap={1}>
      {getSourceIcon(attendance.checkInSource)}
      <Chip 
        label={attendance.sourceInfo?.message || 'Source inconnue'}
        color={getSourceColor(attendance.checkInSource)}
        size="small"
      />
      {attendance.sourceInfo?.checkedInBy && (
        <Typography variant="caption" color="text.secondary">
          par {attendance.sourceInfo.checkedInBy.firstName} {attendance.sourceInfo.checkedInBy.lastName}
        </Typography>
      )}
    </Box>
  );
};

export default DuplicateCheckDialog;