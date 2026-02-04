import React, { useState, useEffect, useCallback } from 'react';
import {
  FiCheck, FiX, FiAlertTriangle, FiMapPin, FiClock, FiUser,
  FiCamera, FiShield, FiRefreshCw, FiEye, FiFilter, FiSearch,
  FiCalendar, FiNavigation, FiUserCheck, FiUserX, FiLoader,
  FiCheckCircle, FiXCircle, FiAlertCircle, FiTarget, FiChevronDown, 
  FiChevronUp, FiArrowUp, FiArrowDown, FiDownload
} from 'react-icons/fi';
import { attendanceAPI, usersAPI } from '../services/api';
import { toast } from 'react-toastify';
import { useSync, useSyncEvent } from '../hooks/useSync';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  loadModels,
  extractDescriptorFromBase64,
  verifyFace,
  areModelsLoaded
} from '../services/faceRecognition';

// Composant de comparaison faciale
const FaceComparisonCard = ({ checkInPhoto, referencePhoto, referenceDescriptor, onVerificationComplete }) => {
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);

  const verifyFaces = useCallback(async () => {
    if (!checkInPhoto || !referenceDescriptor) {
      setError('Données insuffisantes pour la vérification');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // Charger les modèles si nécessaire
      if (!areModelsLoaded()) {
        await loadModels();
      }

      // Extraire le descripteur de la photo de pointage
      const checkInData = await extractDescriptorFromBase64(checkInPhoto);

      if (!checkInData) {
        setError('Aucun visage détecté dans la photo de pointage');
        setVerificationResult({ isMatch: false, confidence: 0, faceDetected: false });
        return;
      }

      // Comparer avec le descripteur de référence
      const result = verifyFace(checkInData.descriptor, referenceDescriptor);
      setVerificationResult(result);

      if (onVerificationComplete) {
        onVerificationComplete(result);
      }
    } catch (err) {
      console.error('Erreur vérification:', err);
      setError('Erreur lors de la vérification faciale');
    } finally {
      setIsVerifying(false);
    }
  }, [checkInPhoto, referenceDescriptor, onVerificationComplete]);

  // Vérification automatique au chargement
  useEffect(() => {
    if (checkInPhoto && referenceDescriptor) {
      verifyFaces();
    }
  }, [checkInPhoto, referenceDescriptor]);

  return (
    <div className="bg-white rounded-lg border p-4">
      <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
        <FiShield className="mr-2 text-primary-600" />
        Vérification d'identité
      </h4>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Photo de pointage */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Photo de pointage</p>
          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
            {checkInPhoto ? (
              <>
                <img 
                  src={checkInPhoto} 
                  alt="Check-in" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    console.error('Error loading check-in photo:', e);
                    console.log('Photo data:', checkInPhoto?.substring(0, 50));
                  }}
                  onLoad={() => {
                    console.log('Check-in photo loaded successfully');
                  }}
                />
                {/* Debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-500 mt-1">
                    Photo: {checkInPhoto?.length} chars
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <FiCamera size={32} />
              </div>
            )}
          </div>
        </div>

        {/* Photo de référence */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Photo de référence</p>
          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
            {referencePhoto ? (
              <img 
                src={referencePhoto} 
                alt="Reference" 
                className="w-full h-full object-cover"
                onLoad={() => console.log('✅ Photo de référence chargée:', referencePhoto)}
                onError={(e) => console.error('❌ Erreur chargement photo de référence:', e, referencePhoto)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <FiUser size={32} />
                <div className="text-xs mt-1">Aucune photo</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Résultat */}
      {isVerifying ? (
        <div className="flex items-center justify-center py-4 text-gray-500">
          <FiLoader className="animate-spin mr-2" />
          Vérification en cours...
        </div>
      ) : verificationResult ? (
        <div className={`p-3 rounded-lg ${
          verificationResult.isMatch ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              {verificationResult.isMatch ? (
                <FiUserCheck className="text-green-600 mr-2" size={24} />
              ) : (
                <FiUserX className="text-red-600 mr-2" size={24} />
              )}
              <span className={`font-bold ${verificationResult.isMatch ? 'text-green-700' : 'text-red-700'}`}>
                {verificationResult.isMatch ? 'IDENTITÉ CONFIRMÉE' : 'IDENTITÉ NON CONFIRMÉE'}
              </span>
            </div>
            <span className={`text-2xl font-bold ${verificationResult.isMatch ? 'text-green-600' : 'text-red-600'}`}>
              {verificationResult.confidence}%
            </span>
          </div>

          {/* Barre de confiance */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${verificationResult.isMatch ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${verificationResult.confidence}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span className="text-yellow-600">Seuil: 40%</span>
            <span>100%</span>
          </div>
        </div>
      ) : error ? (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 flex items-center">
          <FiAlertTriangle className="mr-2" />
          {error}
        </div>
      ) : (
        <div className="p-3 bg-gray-50 rounded-lg text-gray-500 text-center">
          <p>En attente de données pour la vérification</p>
        </div>
      )}

      {/* Bouton re-vérifier */}
      {checkInPhoto && referenceDescriptor && !isVerifying && (
        <button
          onClick={verifyFaces}
          className="mt-3 w-full btn-secondary text-sm flex items-center justify-center"
        >
          <FiRefreshCw className="mr-2" size={14} />
          Re-vérifier
        </button>
      )}
    </div>
  );
};

// Composant de vérification de localisation
const LocationVerificationCard = ({ attendance, event }) => {
  const isWithinGeofence = attendance.isWithinGeofence;
  const distance = attendance.distanceFromLocation;

  return (
    <div className="bg-white rounded-lg border p-4">
      <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
        <FiMapPin className="mr-2 text-primary-600" />
        Vérification de localisation
      </h4>

      <div className={`p-3 rounded-lg ${
        isWithinGeofence ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            {isWithinGeofence ? (
              <FiCheckCircle className="text-green-600 mr-2" size={24} />
            ) : (
              <FiXCircle className="text-red-600 mr-2" size={24} />
            )}
            <span className={`font-bold ${isWithinGeofence ? 'text-green-700' : 'text-red-700'}`}>
              {isWithinGeofence ? 'DANS LA ZONE' : 'HORS ZONE'}
            </span>
          </div>
          {distance !== null && (
            <span className={`font-bold ${isWithinGeofence ? 'text-green-600' : 'text-red-600'}`}>
              {distance}m
            </span>
          )}
        </div>

        {event && (
          <div className="mt-2 pt-2 border-t border-gray-200 text-sm space-y-1">
            <div className="flex items-center text-gray-600">
              <FiTarget className="mr-2 text-gray-400" size={14} />
              Rayon autorisé: {event.geoRadius || 100}m
            </div>
            <div className="flex items-center text-gray-600">
              <FiMapPin className="mr-2 text-gray-400" size={14} />
              {event.location}
            </div>
          </div>
        )}
      </div>

      {/* Mini carte */}
      {attendance.checkInLatitude && attendance.checkInLongitude && event?.latitude && event?.longitude && (
        <div className="mt-3 p-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 space-y-1">
            <p>
              <strong>Position agent:</strong> {parseFloat(attendance.checkInLatitude).toFixed(5)}, {parseFloat(attendance.checkInLongitude).toFixed(5)}
            </p>
            <p>
              <strong>Position événement:</strong> {parseFloat(event.latitude).toFixed(5)}, {parseFloat(event.longitude).toFixed(5)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Carte de détail du pointage
const AttendanceDetailCard = ({ attendance, agent, event, onClose }) => {
  const [agentDescriptor, setAgentDescriptor] = useState(null);
  const [loadingDescriptor, setLoadingDescriptor] = useState(false);

  // Charger le descripteur facial de l'agent
  useEffect(() => {
    const fetchAgentDescriptor = async () => {
      if (!agent?.id) return;

      setLoadingDescriptor(true);
      try {
        // Appel API pour récupérer le descripteur facial
        const response = await usersAPI.getFacialVector(agent.id);
        if (response.data.data?.facialVector) {
          setAgentDescriptor(response.data.data.facialVector);
        }
      } catch (error) {
        console.log('Descripteur facial non disponible');
      } finally {
        setLoadingDescriptor(false);
      }
    };

    fetchAgentDescriptor();
  }, [agent?.id]);

  const getStatusBadge = (status) => {
    const styles = {
      present: 'bg-green-100 text-green-700',
      late: 'bg-yellow-100 text-yellow-700',
      absent: 'bg-red-100 text-red-700',
      excused: 'bg-blue-100 text-blue-700'
    };
    const labels = {
      present: 'Présent',
      late: 'En retard',
      absent: 'Absent',
      excused: 'Excusé'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-primary-50 to-blue-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Vérification du pointage</h2>
            <p className="text-sm text-gray-500">
              {event?.name} - {format(new Date(attendance.date), 'dd MMMM yyyy', { locale: fr })}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Info agent */}
          <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              {agent?.profilePhoto ? (
                <img 
                  src={agent.profilePhoto.startsWith('/uploads') ? 
                    `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${agent.profilePhoto}` : 
                    agent.profilePhoto
                  } 
                  alt="Agent" 
                  className="w-16 h-16 rounded-full object-cover mr-4" 
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xl font-bold mr-4">
                  {agent?.firstName?.[0]}{agent?.lastName?.[0]}
                </div>
              )}
              <div>
                <h3 className="font-bold text-lg">{agent?.firstName} {agent?.lastName}</h3>
                <p className="text-sm text-gray-500">{agent?.employeeId}</p>
                <p className="text-sm text-gray-500">{agent?.email}</p>
              </div>
            </div>
            <div className="text-right">
              {getStatusBadge(attendance.status)}
              <p className="text-sm text-gray-500 mt-1">
                Check-in: {attendance.checkInTime ? format(new Date(attendance.checkInTime), 'HH:mm', { locale: fr }) : '-'}
              </p>
              {attendance.checkOutTime && (
                <p className="text-sm text-gray-500">
                  Check-out: {format(new Date(attendance.checkOutTime), 'HH:mm', { locale: fr })}
                </p>
              )}
            </div>
          </div>

          {/* Grille de vérification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Debug info */}
            {console.log('🎯 Rendu FaceComparisonCard:', {
              hasCheckInPhoto: !!attendance.checkInPhoto,
              photoLength: attendance.checkInPhoto?.length,
              photoPreview: attendance.checkInPhoto?.substring(0, 50),
              agentProfilePhoto: agent?.profilePhoto,
              constructedReferencePhoto: agent?.profilePhoto ? 
                (agent.profilePhoto.startsWith('/uploads') ? 
                  `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${agent.profilePhoto}` : 
                  agent.profilePhoto
                ) : null
            })}
            
            {/* Vérification faciale */}
            <FaceComparisonCard
              checkInPhoto={attendance.checkInPhoto}
              referencePhoto={agent?.profilePhoto ? 
                (agent.profilePhoto.startsWith('/uploads') ? 
                  `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${agent.profilePhoto}` : 
                  agent.profilePhoto
                ) : null
              }
              referenceDescriptor={agentDescriptor}
              onVerificationComplete={(result) => {
                console.log('Résultat vérification:', result);
              }}
            />

            {/* Vérification localisation */}
            <LocationVerificationCard
              attendance={attendance}
              event={event}
            />
          </div>

          {/* Informations supplémentaires */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-xs text-gray-500 mb-1">Méthode</p>
              <p className="font-medium">
                {attendance.checkInMethod === 'facial' ? '📸 Faciale' :
                 attendance.checkInMethod === 'qrcode' ? '📱 QR Code' : '✋ Manuelle'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-xs text-gray-500 mb-1">Score facial</p>
              <p className="font-medium">
                {attendance.facialMatchScore
                  ? `${Math.round(attendance.facialMatchScore * 100)}%`
                  : '-'
                }
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-xs text-gray-500 mb-1">Distance</p>
              <p className="font-medium">
                {attendance.distanceFromLocation !== null
                  ? `${attendance.distanceFromLocation}m`
                  : '-'
                }
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-xs text-gray-500 mb-1">Heures travaillées</p>
              <p className="font-medium">
                {attendance.totalHours ? `${attendance.totalHours}h` : '-'}
              </p>
            </div>
          </div>

          {/* Score de confiance global */}
          <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg">
            <h4 className="font-semibold text-gray-700 mb-3">Score de confiance global</h4>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex gap-4">
                  <div className="flex items-center">
                    <span className={`w-3 h-3 rounded-full mr-2 ${attendance.isWithinGeofence ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">Localisation</span>
                  </div>
                  <div className="flex items-center">
                    <span className={`w-3 h-3 rounded-full mr-2 ${attendance.checkInPhoto ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <span className="text-sm">Photo</span>
                  </div>
                  <div className="flex items-center">
                    <span className={`w-3 h-3 rounded-full mr-2 ${attendance.checkInMethod === 'facial' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <span className="text-sm">Méthode faciale</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-primary-600">
                  {calculateTrustScore(attendance)}%
                </span>
                <p className="text-xs text-gray-500">Confiance</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Calcul du score de confiance
const calculateTrustScore = (attendance) => {
  let score = 0;

  // Localisation (40 points)
  if (attendance.isWithinGeofence) {
    score += 40;
  } else if (attendance.distanceFromLocation && attendance.distanceFromLocation < 500) {
    score += 20; // Proche mais pas dans la zone
  }

  // Photo présente (20 points)
  if (attendance.checkInPhoto) {
    score += 20;
  }

  // Méthode faciale (20 points)
  if (attendance.checkInMethod === 'facial') {
    score += 20;
  } else if (attendance.checkInMethod === 'qrcode') {
    score += 10;
  }

  // Score facial (20 points)
  if (attendance.facialMatchScore) {
    score += Math.round(attendance.facialMatchScore * 20);
  }

  return Math.min(100, score);
};

// Page principale
const AttendanceVerification = () => {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [modelsReady, setModelsReady] = useState(false);
  
  // État pour le groupement par événements et le tri
  const [expandedEvents, setExpandedEvents] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // 🔄 WEBSOCKET - Synchronisation temps réel
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const { isConnected } = useSync(user?.id, ['attendance:all', 'supervisor']);

  // Notification de connexion
  useEffect(() => {
    if (isConnected) {
      toast.success('🔄 Vérification temps réel activée', { autoClose: 2000 });
    }
  }, [isConnected]);

  // Événement: Nouveau check-in à vérifier
  useSyncEvent('checkin', ({ attendance, agent }) => {
    if (!attendance.facialVerified) {
      toast.warning(`⚠️ Nouvelle présence à vérifier: ${agent.firstName} ${agent.lastName}`);
      fetchAttendances();
    }
  });

  // Événement: Vérification mise à jour
  useSyncEvent('attendance:verified', ({ id, status }) => {
    setAttendances(prev => prev.map(a => a.id === id ? { ...a, facialVerified: status === 'verified' } : a));
    toast.success(`✅ Vérification mise à jour`);
  });

  // Charger les modèles de reconnaissance faciale
  useEffect(() => {
    loadModels().then(setModelsReady);
  }, []);

  // Charger les pointages
  useEffect(() => {
    fetchAttendances();
  }, [dateFilter, statusFilter]);

  const fetchAttendances = async () => {
    setLoading(true);
    try {
      const params = {
        date: dateFilter,
        status: statusFilter || undefined,
        limit: 100
      };

      console.log('🔍 Récupération des pointages...');
      const response = await attendanceAPI.getAll(params);
      const attendances = response.data.data.attendances || [];
      
      console.log(`📊 Pointages récupérés: ${attendances.length}`);
      
      // Debug des photos
      const withPhotos = attendances.filter(att => att.checkInPhoto && att.checkInPhoto.length > 0);
      console.log(`🖼️ Avec photos: ${withPhotos.length}`);
      
      if (withPhotos.length > 0) {
        const first = withPhotos[0];
        console.log('📸 Première photo info:', {
          id: first.id,
          photoLength: first.checkInPhoto.length,
          photoPreview: first.checkInPhoto.substring(0, 100),
          isValidBase64: first.checkInPhoto.startsWith('data:image/')
        });
      }
      
      setAttendances(attendances);
    } catch (error) {
      console.error('❌ Erreur récupération pointages:', error);
      toast.error('Erreur lors du chargement des pointages');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les résultats
  const filteredAttendances = attendances.filter(att => {
    // Recherche
    if (search) {
      const searchLower = search.toLowerCase();
      const agentName = `${att.agent?.firstName} ${att.agent?.lastName}`.toLowerCase();
      const eventName = att.event?.name?.toLowerCase() || '';
      if (!agentName.includes(searchLower) && !eventName.includes(searchLower)) {
        return false;
      }
    }

    // Filtre vérification
    if (verificationFilter === 'verified') {
      return att.isWithinGeofence && att.checkInPhoto;
    } else if (verificationFilter === 'suspicious') {
      return !att.isWithinGeofence || !att.checkInPhoto;
    }

    return true;
  });

  // Fonction de tri
  const sortData = (data) => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'agent':
          aValue = `${a.agent?.firstName || ''} ${a.agent?.lastName || ''}`.toLowerCase();
          bValue = `${b.agent?.firstName || ''} ${b.agent?.lastName || ''}`.toLowerCase();
          break;
        case 'event':
          aValue = (a.event?.name || '').toLowerCase();
          bValue = (b.event?.name || '').toLowerCase();
          break;
        case 'checkIn':
          aValue = a.checkInTime ? new Date(a.checkInTime).getTime() : 0;
          bValue = b.checkInTime ? new Date(b.checkInTime).getTime() : 0;
          break;
        case 'location':
          aValue = a.distanceFromLocation || 999999;
          bValue = b.distanceFromLocation || 999999;
          break;
        case 'trust':
          aValue = calculateTrustScore(a);
          bValue = calculateTrustScore(b);
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Grouper par événements
  const groupedByEvent = filteredAttendances.reduce((acc, record) => {
    const eventKey = record.event?.id || record.eventId || 'no-event';
    const eventName = record.event?.name || 'Sans événement';
    
    if (!acc[eventKey]) {
      acc[eventKey] = {
        eventId: eventKey,
        eventName: eventName,
        event: record.event,
        records: []
      };
    }
    
    acc[eventKey].records.push(record);
    return acc;
  }, {});

  const eventGroups = Object.values(groupedByEvent).map(group => ({
    ...group,
    records: sortData(group.records)
  }));

  // Fonction pour toggler l'expansion d'un événement
  const toggleEvent = (eventId) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  // Fonction pour gérer le tri
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Composant pour l'icône de tri
  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? 
      <FiArrowUp className="inline ml-1" size={14} /> : 
      <FiArrowDown className="inline ml-1" size={14} />;
  };

  const getTrustBadge = (attendance) => {
    const score = calculateTrustScore(attendance);
    if (score >= 80) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ Vérifié</span>;
    } else if (score >= 50) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">⚠ À vérifier</span>;
    } else {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">✗ Suspect</span>;
    }
  };

  // Fonction pour convertir une image en Base64
  const getImageBase64 = async (url) => {
    try {
      if (!url) return null;
      
      // Si c'est déjà en base64, retourner directement
      if (url.startsWith('data:image')) {
        return url;
      }
      
      // Sinon, charger l'image et la convertir
      const response = await fetch(url);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Erreur lors de la conversion de l\'image:', error);
      return null;
    }
  };

  // Export to PDF avec images
  const exportToPDF = async () => {
    try {
      toast.info('Generation du PDF en cours...');
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Configuration UTF-8
      doc.setFont('helvetica');

      // Titre
      doc.setFontSize(18);
      doc.setTextColor(30, 58, 138);
      doc.text('Rapport de Verification des Pointages', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Date
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Genere le ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;
      doc.text(`Periode: ${format(new Date(dateFilter), 'dd/MM/yyyy', { locale: fr })}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Stats
      const verified = filteredAttendances.filter(a => calculateTrustScore(a) >= 80).length;
      const toVerify = filteredAttendances.filter(a => calculateTrustScore(a) >= 50 && calculateTrustScore(a) < 80).length;
      const suspicious = filteredAttendances.filter(a => calculateTrustScore(a) < 50).length;
      
      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85);
      doc.text(`Verifies: ${verified} | A verifier: ${toVerify} | Suspects: ${suspicious} | Total: ${filteredAttendances.length}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Préparer les données pour le tableau
      const tableData = [];
      
      for (let i = 0; i < filteredAttendances.length && i < 20; i++) {
        const att = filteredAttendances[i];
        
        tableData.push([
          `${att.agent?.firstName || ''} ${att.agent?.lastName || ''}`,
          att.event?.name || '-',
          att.checkInTime ? format(new Date(att.checkInTime), 'HH:mm') : '-',
          att.isWithinGeofence ? 'Dans la zone' : 'Hors zone',
          att.distanceFromLocation ? `${att.distanceFromLocation}m` : '-',
          `${calculateTrustScore(att)}%`,
          att.status === 'present' ? 'Présent' : att.status === 'late' ? 'Retard' : att.status || '-'
        ]);
      }

      // Créer le tableau avec autoTable
      autoTable(doc, {
        startY: yPosition,
        head: [['Agent', 'Événement', 'Heure', 'Localisation', 'Distance', 'Confiance', 'Statut']],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
          font: 'helvetica'
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 50 },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 30, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 25, halign: 'center' },
          6: { cellWidth: 25, halign: 'center' }
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        }
      });

      if (filteredAttendances.length > 20) {
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(`... et ${filteredAttendances.length - 20} autres pointages`, pageWidth / 2, finalY, { align: 'center' });
      }

      // Pour chaque pointage avec photos
      for (let i = 0; i < filteredAttendances.length && i < 10; i++) {
        const att = filteredAttendances[i];
        
        if (yPosition > pageHeight - 85) {
          doc.addPage();
          yPosition = 20;
        }

        // Carte du pointage
        doc.setFillColor(248, 250, 252);
        doc.rect(15, yPosition, pageWidth - 30, 75, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(15, yPosition, pageWidth - 30, 75);

        // Photos: Reference a gauche, Pointage a droite
        const photoSize = 30;
        const photoY = yPosition + 5;

        try {
          // Photo de reference
          if (att.agent?.profilePhoto) {
            const refPhoto = await getImageBase64(att.agent.profilePhoto);
            if (refPhoto) {
              doc.setFontSize(7);
              doc.setTextColor(100, 116, 139);
              doc.text('Photo Reference:', 20, photoY);
              doc.addImage(refPhoto, 'JPEG', 20, photoY + 2, photoSize, photoSize);
            }
          } else {
            doc.setFillColor(229, 231, 235);
            doc.rect(20, photoY + 2, photoSize, photoSize, 'F');
            doc.setFontSize(20);
            doc.setTextColor(156, 163, 175);
            doc.text('?', 20 + photoSize/2, photoY + photoSize/2 + 5, { align: 'center' });
          }

          // Photo de pointage
          if (att.checkInPhoto) {
            const checkPhoto = await getImageBase64(att.checkInPhoto);
            if (checkPhoto) {
              doc.setFontSize(7);
              doc.setTextColor(100, 116, 139);
              doc.text('Photo Pointage:', 55, photoY);
              doc.addImage(checkPhoto, 'JPEG', 55, photoY + 2, photoSize, photoSize);
            }
          } else {
            doc.setFillColor(229, 231, 235);
            doc.rect(55, photoY + 2, photoSize, photoSize, 'F');
          }
        } catch (imgError) {
          console.error('Erreur image:', imgError);
        }

        // Informations a droite des photos
        const infoX = 92;
        let infoY = yPosition + 8;

        // Nom de l'agent
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.setFont(undefined, 'bold');
        doc.text(`${att.agent?.firstName || ''} ${att.agent?.lastName || ''}`, infoX, infoY);
        infoY += 5;

        // ID et evenement
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(`ID: ${att.agent?.employeeId || '-'}`, infoX, infoY);
        infoY += 4;
        doc.text(`Evenement: ${att.event?.name || '-'}`, infoX, infoY);
        infoY += 4;
        
        // Zone
        const zone = att.assignment?.zone?.name || 'Non definie';
        doc.text(`Zone: ${zone}`, infoX, infoY);
        infoY += 4;

        // Heure
        doc.text(`Heure: ${att.checkInTime ? format(new Date(att.checkInTime), 'HH:mm') : '-'}`, infoX, infoY);
        infoY += 4;

        // Distance et geolocalisation
        const geoStatus = att.isWithinGeofence ? 'Dans la zone' : 'Hors zone';
        const geoColor = att.isWithinGeofence ? [34, 197, 94] : [239, 68, 68];
        doc.setTextColor(...geoColor);
        doc.text(`${geoStatus} - ${att.distanceFromLocation || '?'}m`, infoX, infoY);
        infoY += 4;

        // Score de confiance
        const trustScore = calculateTrustScore(att);
        const trustColor = trustScore >= 80 ? [34, 197, 94] : trustScore >= 50 ? [234, 179, 8] : [239, 68, 68];
        doc.setTextColor(...trustColor);
        doc.setFont(undefined, 'bold');
        doc.text(`Confiance: ${trustScore}%`, infoX, infoY);
        infoY += 5;

        // Cree par
        doc.setFont(undefined, 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        const creationType = att.agent?.creation?.type || 'inconnu';
        const creatorName = att.agent?.creation?.createdBy?.name || 'Systeme';
        const creatorRole = creationType === 'admin' ? 'Admin' : creationType === 'supervisor' ? 'Responsable' : 'Utilisateur';
        doc.text(`Cree par: ${creatorName} (${creatorRole})`, infoX, infoY);
        infoY += 3;
        
        // Date de creation
        if (att.agent?.createdAt) {
          doc.text(`Date creation: ${format(new Date(att.agent.createdAt), 'dd/MM/yyyy')}`, infoX, infoY);
        }

        yPosition += 80;
      }

      if (filteredAttendances.length > 10) {
        const finalY = yPosition + 5;
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(`... et ${filteredAttendances.length - 10} autres pointages`, pageWidth / 2, finalY, { align: 'center' });
      }

      // Pied de page
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} sur ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text('Security Guard Management System', pageWidth / 2, pageHeight - 6, { align: 'center' });
      }

      doc.save(`verification-pointages_${format(new Date(dateFilter), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF genere avec succes!');
    } catch (error) {
      console.error('Export PDF error:', error);
      toast.error('Erreur lors de l\'export PDF');
    }
  };

  // Export to Excel avec images
  const exportToExcel = async () => {
    try {
      toast.info('Generation du fichier Excel en cours...');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Verification Pointages');

      // Definir les colonnes
      worksheet.columns = [
        { header: 'Photo Ref', key: 'refPhoto', width: 15 },
        { header: 'Photo Pointage', key: 'checkPhoto', width: 15 },
        { header: 'Agent', key: 'agent', width: 25 },
        { header: 'ID Employe', key: 'employeeId', width: 15 },
        { header: 'Evenement', key: 'event', width: 25 },
        { header: 'Zone', key: 'zone', width: 20 },
        { header: 'Lieu', key: 'location', width: 30 },
        { header: 'Heure', key: 'time', width: 12 },
        { header: 'Statut', key: 'status', width: 12 },
        { header: 'Distance (m)', key: 'distance', width: 12 },
        { header: 'Dans zone', key: 'inGeofence', width: 10 },
        { header: 'Score confiance', key: 'trustScore', width: 15 },
        { header: 'Cree par', key: 'createdBy', width: 20 },
        { header: 'Type creation', key: 'creationType', width: 15 }
      ];

      // Style de l'en-tete
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' }
      };
      headerRow.height = 20;

      // Ajouter les donnees avec images
      let rowIndex = 2;
      for (const att of filteredAttendances) {
        const creationType = att.agent?.creation?.type || 'inconnu';
        const creatorName = att.agent?.creation?.createdBy?.name || 'Systeme';
        const creatorRole = creationType === 'admin' ? 'Admin' : creationType === 'supervisor' ? 'Responsable' : 'Utilisateur';
        const zone = att.assignment?.zone?.name || 'Non definie';

        const row = worksheet.addRow({
          refPhoto: '',
          checkPhoto: '',
          agent: `${att.agent?.firstName || ''} ${att.agent?.lastName || ''}`,
          employeeId: att.agent?.employeeId || '-',
          event: att.event?.name || '-',
          zone: zone,
          location: att.event?.location || '-',
          time: att.checkInTime ? format(new Date(att.checkInTime), 'HH:mm') : '-',
          status: att.status || '-',
          distance: att.distanceFromLocation || '-',
          inGeofence: att.isWithinGeofence ? 'Oui' : 'Non',
          trustScore: `${calculateTrustScore(att)}%`,
          createdBy: creatorName,
          creationType: creatorRole
        });

        row.height = 80; // Hauteur pour les images

        try {
          // Ajouter photo de reference
          if (att.agent?.profilePhoto) {
            const refPhotoBase64 = await getImageBase64(att.agent.profilePhoto);
            if (refPhotoBase64) {
              const refImageId = workbook.addImage({
                base64: refPhotoBase64.split(',')[1],
                extension: 'jpeg'
              });
              worksheet.addImage(refImageId, {
                tl: { col: 0, row: rowIndex - 1 },
                ext: { width: 60, height: 60 }
              });
            }
          }

          // Ajouter photo de pointage
          if (att.checkInPhoto) {
            const checkPhotoBase64 = await getImageBase64(att.checkInPhoto);
            if (checkPhotoBase64) {
              const checkImageId = workbook.addImage({
                base64: checkPhotoBase64.split(',')[1],
                extension: 'jpeg'
              });
              worksheet.addImage(checkImageId, {
                tl: { col: 1, row: rowIndex - 1 },
                ext: { width: 60, height: 60 }
              });
            }
          }
        } catch (imgError) {
          console.error('Erreur lors de l\'ajout des images pour la ligne', rowIndex, ':', imgError);
        }

        rowIndex++;
      }

      // Appliquer des bordures et styles
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          // Colorer selon le score de confiance
          const trustScoreCell = row.getCell(12);
          const trustValue = parseInt(trustScoreCell.value) || 0;
          
          if (trustValue >= 80) {
            trustScoreCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF34D399' }
            };
            trustScoreCell.font = { bold: true, color: { argb: 'FF065F46' } };
          } else if (trustValue >= 50) {
            trustScoreCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFBBF24' }
            };
            trustScoreCell.font = { bold: true, color: { argb: 'FF78350F' } };
          } else {
            trustScoreCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFEF4444' }
            };
            trustScoreCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          }
        }

        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
      });

      // Generer et telecharger
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `verification-pointages_${format(new Date(dateFilter), 'yyyy-MM-dd')}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Excel exporte avec succes!');
    } catch (error) {
      console.error('Export Excel error:', error);
      toast.error('Erreur lors de l\'export Excel');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 px-3 py-6 relative overflow-hidden">
      {/* Effets de fond anime */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>
      
      <div className="max-w-full mx-auto px-2 space-y-4 relative z-10">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl hover:shadow-blue-500/20 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FiShield size={32} className="text-blue-400" />
            Verification des Pointages
          </h1>
          <p className="text-white/70 mt-2">Controlez l'identite et la localisation des agents</p>
        </div>
        <div className="flex items-center gap-3">
          {modelsReady ? (
            <span className="flex items-center text-sm text-green-400 bg-green-500/20 px-4 py-2 rounded-xl border border-green-400/30 backdrop-blur-sm">
              <FiCheck className="mr-2" size={16} /> IA Prete
            </span>
          ) : (
            <span className="flex items-center text-sm text-blue-400 bg-blue-500/20 px-4 py-2 rounded-xl border border-blue-400/30 backdrop-blur-sm">
              <FiLoader className="mr-2 animate-spin" size={16} /> Chargement IA...
            </span>
          )}
          <button onClick={fetchAttendances} className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all">
            <FiRefreshCw size={18} /> Actualiser
          </button>
        </div>
      </div>
      </div>

      {/* Filtres */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <FiFilter className="text-blue-400" size={20} />
          <h3 className="text-white font-semibold">Filtres</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
              <input
                type="text"
                placeholder="Rechercher agent ou evenement..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white/10 text-white border border-white/20 rounded-xl px-4 py-2.5 pl-10 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-white/50"
              />
            </div>
          </div>
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-white/10 text-white border border-white/20 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/10 text-white border border-white/20 rounded-xl px-4 py-2.5 w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" className="bg-slate-800">Tous statuts</option>
            <option value="present" className="bg-slate-800">Present</option>
            <option value="late" className="bg-slate-800">En retard</option>
            <option value="absent" className="bg-slate-800">Absent</option>
          </select>
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="bg-white/10 text-white border border-white/20 rounded-xl px-4 py-2.5 w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" className="bg-slate-800">Toutes verifications</option>
            <option value="verified" className="bg-slate-800">Verifies</option>
            <option value="suspicious" className="bg-slate-800">Suspects</option>
          </select>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500/30 to-emerald-600/20 border-2 border-green-400/40 rounded-2xl p-5 hover:scale-105 transition-transform backdrop-blur-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-green-500/30 rounded-xl">
              <FiCheckCircle className="text-green-300" size={24} />
            </div>
            <span className="text-white font-semibold">Verifies</span>
          </div>
          <p className="text-4xl font-bold text-white">
            {filteredAttendances.filter(a => calculateTrustScore(a) >= 80).length}
          </p>
          <p className="text-green-200 text-xs mt-2">Score &gt;= 80%</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/30 to-amber-600/20 border-2 border-yellow-400/40 rounded-2xl p-5 hover:scale-105 transition-transform backdrop-blur-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-yellow-500/30 rounded-xl">
              <FiAlertCircle className="text-yellow-300" size={24} />
            </div>
            <span className="text-white font-semibold">A verifier</span>
          </div>
          <p className="text-4xl font-bold text-white">
            {filteredAttendances.filter(a => calculateTrustScore(a) >= 50 && calculateTrustScore(a) < 80).length}
          </p>
          <p className="text-yellow-200 text-xs mt-2">Score 50-79%</p>
        </div>
        <div className="bg-gradient-to-br from-red-500/30 to-rose-600/20 border-2 border-red-400/40 rounded-2xl p-5 hover:scale-105 transition-transform backdrop-blur-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-red-500/30 rounded-xl">
              <FiXCircle className="text-red-300" size={24} />
            </div>
            <span className="text-white font-semibold">Suspects</span>
          </div>
          <p className="text-4xl font-bold text-white">
            {filteredAttendances.filter(a => calculateTrustScore(a) < 50).length}
          </p>
          <p className="text-red-200 text-xs mt-2">Score &lt; 50%</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500/30 to-indigo-600/20 border-2 border-blue-400/40 rounded-2xl p-5 hover:scale-105 transition-transform backdrop-blur-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-blue-500/30 rounded-xl">
              <FiUser className="text-blue-300" size={24} />
            </div>
            <span className="text-white font-semibold">Total</span>
          </div>
          <p className="text-4xl font-bold text-white">{filteredAttendances.length}</p>
          <p className="text-blue-200 text-xs mt-2">Pointages</p>
        </div>
      </div>

      {/* Liste des pointages */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          {/* En-tête du tableau avec boutons d'export */}
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              <FiEye size={20} />
              Pointages a verifier
            </h2>
            <div className="flex gap-3">
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-all"
              >
                <FiDownload size={18} />
                Excel
              </button>
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all"
              >
                <FiDownload size={18} />
                PDF
              </button>
            </div>
          </div>

          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th 
                  className="table-header cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('agent')}
                >
                  Agent <SortIcon columnKey="agent" />
                </th>
                <th 
                  className="table-header cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('event')}
                >
                  Événement <SortIcon columnKey="event" />
                </th>
                <th className="table-header">
                  Zone
                </th>
                <th 
                  className="table-header cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('checkIn')}
                >
                  Heure <SortIcon columnKey="checkIn" />
                </th>
                <th 
                  className="table-header cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('location')}
                >
                  Localisation <SortIcon columnKey="location" />
                </th>
                <th className="table-header">Photo</th>
                <th 
                  className="table-header cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('trust')}
                >
                  Confiance <SortIcon columnKey="trust" />
                </th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
          </table>

          {/* Corps du tableau groupé par événements */}
          {loading ? (
            <div className="p-8 text-center">
              <FiLoader className="animate-spin mx-auto mb-2" size={24} />
              <p className="text-gray-500">Chargement...</p>
            </div>
          ) : filteredAttendances.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Aucun pointage trouvé
            </div>
          ) : (
            eventGroups.map(group => (
              <div key={group.eventId} className="border-b border-gray-300">
                {/* En-tête du groupe d'événements */}
                <div 
                  className="bg-blue-50 border-y border-blue-200 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-blue-100"
                  onClick={() => toggleEvent(group.eventId)}
                >
                  <div className="flex items-center gap-3">
                    {expandedEvents.has(group.eventId) ? (
                      <FiChevronDown className="text-blue-600" size={20} />
                    ) : (
                      <FiChevronUp className="text-blue-600" size={20} />
                    )}
                    <h3 className="font-bold text-gray-900 text-base">
                      {group.eventName}
                    </h3>
                    <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
                      {group.records.length} pointage{group.records.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  {group.event && (
                    <div className="text-sm text-gray-600">
                      📍 {group.event.location || 'Emplacement non défini'}
                    </div>
                  )}
                </div>

                {/* Lignes de l'événement (affichées si expanded) */}
                {expandedEvents.has(group.eventId) && (
                  <table className="w-full">
                    <tbody className="divide-y">
                      {group.records.map(attendance => (
                        <tr key={attendance.id} className="hover:bg-gray-50">
                          <td className="table-cell">
                            <div className="flex items-center">
                              {attendance.agent?.profilePhoto ? (
                                <img
                                  src={attendance.agent.profilePhoto}
                                  alt=""
                                  className="w-10 h-10 rounded-full object-cover mr-3"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium mr-3">
                                  {attendance.agent?.firstName?.[0]}{attendance.agent?.lastName?.[0]}
                                </div>
                              )}
                              <div>
                                <p className="font-medium">
                                  {attendance.agent?.firstName} {attendance.agent?.lastName}
                                </p>
                                <p className="text-xs text-gray-500">{attendance.agent?.employeeId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="table-cell">
                            <p className="font-medium">{attendance.event?.name}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[150px]">
                              {attendance.event?.location}
                            </p>
                          </td>
                          <td className="table-cell">
                            <p className="text-sm">{attendance.assignment?.zone?.name || '-'}</p>
                            {attendance.assignment?.zone?.color && (
                              <div className="flex items-center gap-1 mt-1">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: attendance.assignment.zone.color }}
                                />
                                <span className="text-xs text-gray-500">
                                  {attendance.assignment.zone.description || ''}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="table-cell">
                            {attendance.checkInTime && (
                              <p className="font-medium">
                                {format(new Date(attendance.checkInTime), 'HH:mm')}
                              </p>
                            )}
                            <p className={`text-xs ${
                              attendance.status === 'present' ? 'text-green-600' :
                              attendance.status === 'late' ? 'text-yellow-600' : 'text-gray-500'
                            }`}>
                              {attendance.status === 'present' ? 'À l\'heure' :
                               attendance.status === 'late' ? 'En retard' : attendance.status}
                            </p>
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center">
                              {attendance.isWithinGeofence ? (
                                <FiCheckCircle className="text-green-500 mr-1" />
                              ) : (
                                <FiXCircle className="text-red-500 mr-1" />
                              )}
                              <span className={attendance.isWithinGeofence ? 'text-green-600' : 'text-red-600'}>
                                {attendance.distanceFromLocation !== null ? `${attendance.distanceFromLocation}m` : '-'}
                              </span>
                            </div>
                          </td>
                          <td className="table-cell">
                            {attendance.checkInPhoto ? (
                              <div className="w-10 h-10 rounded overflow-hidden">
                                <img
                                  src={attendance.checkInPhoto}
                                  alt="Check-in"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="table-cell">
                            {getTrustBadge(attendance)}
                          </td>
                          <td className="table-cell text-right">
                            <button
                              onClick={() => setSelectedAttendance(attendance)}
                              className="btn-secondary text-sm flex items-center"
                            >
                              <FiEye className="mr-1" /> Vérifier
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de detail */}
      {selectedAttendance && (
        <AttendanceDetailCard
          attendance={selectedAttendance}
          agent={selectedAttendance.agent}
          event={selectedAttendance.event}
          onClose={() => setSelectedAttendance(null)}
        />
      )}
      </div>
    </div>
  );
};

export default AttendanceVerification;


// ...avant les routes
