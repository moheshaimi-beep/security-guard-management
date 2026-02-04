import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiMapPin, FiAlertTriangle, FiBattery, FiClock, FiUser, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../services/api';
import { combineDateAndTime } from '../utils/eventHelpers';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Composant pour recentrer la carte
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

const AgentTrackingMap = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [agents, setAgents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [nextCheckTime, setNextCheckTime] = useState(null);
  const intervalRef = useRef(null);
  const [mapCenter, setMapCenter] = useState([33.5731, -7.5898]); // Casablanca par défaut
  const previousAgentsRef = useRef({}); // Pour suivre les changements de zone
  const [stats, setStats] = useState({
    total: 0,
    insideZone: 0,
    outsideZone: 0,
    lowBattery: 0,
    connectionLost: 0,
    agents: 0,
    supervisors: 0
  });

  // Charger les événements actifs
  useEffect(() => {
    fetchActiveEvents();
  }, []);

  // Auto-refresh toutes les 15 minutes (900000 ms) pour vérifier les zones
  useEffect(() => {
    if (autoRefresh && selectedEvent) {
      // Vérifier si l'événement est terminé (combiner endDate et checkOutTime)
      const eventEndDateTime = combineDateAndTime(selectedEvent.endDate, selectedEvent.checkOutTime);
      const now = new Date();
      
      if (eventEndDateTime && now > eventEndDateTime) {
        console.log('⏹️ Événement terminé, arrêt du suivi automatique');
        console.log('  Fin prévue:', eventEndDateTime.toLocaleString('fr-FR'));
        console.log('  Maintenant:', now.toLocaleString('fr-FR'));
        setAutoRefresh(false);
        toast.info(`Suivi automatique arrêté : événement "${selectedEvent.name}" terminé`);
        return;
      }
      
      // Première vérification immédiate
      fetchAgentPositions(selectedEvent.id);
      fetchAlerts(selectedEvent.id);
      
      // Calculer l'heure de la prochaine vérification
      const nextCheck = new Date(now.getTime() + 900000);
      setNextCheckTime(nextCheck);
      
      // Puis vérification toutes les 15 minutes
      intervalRef.current = setInterval(() => {
        const currentTime = new Date();
        const eventEndDateTime = combineDateAndTime(selectedEvent.endDate, selectedEvent.checkOutTime);
        
        // Arrêter si l'événement est fini
        if (eventEndDateTime && currentTime > eventEndDateTime) {
          console.log('⏹️ Événement terminé, arrêt du suivi');
          console.log('  Fin prévue:', eventEndDateTime.toLocaleString('fr-FR'));
          console.log('  Maintenant:', currentTime.toLocaleString('fr-FR'));
          setAutoRefresh(false);
          setNextCheckTime(null);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          toast.info(`Suivi automatique arrêté : événement terminé`);
          return;
        }
        
        console.log('🔄 Vérification automatique des zones (toutes les 15min)');
        fetchAgentPositions(selectedEvent.id);
        fetchAlerts(selectedEvent.id);
        
        // Mettre à jour la prochaine vérification
        const next = new Date(currentTime.getTime() + 900000);
        setNextCheckTime(next);
      }, 900000); // 15 minutes = 900000 ms

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setNextCheckTime(null);
      };
    } else {
      setNextCheckTime(null);
    }
  }, [autoRefresh, selectedEvent]);

  // Charger positions initiales quand événement sélectionné
  useEffect(() => {
    if (selectedEvent) {
      fetchAgentPositions(selectedEvent.id);
      fetchAlerts(selectedEvent.id);
      
      // Centrer la carte sur l'événement
      if (selectedEvent.latitude && selectedEvent.longitude) {
        setMapCenter([selectedEvent.latitude, selectedEvent.longitude]);
      }
    }
  }, [selectedEvent]);

  const fetchActiveEvents = async () => {
    try {
      console.log('🔍 Chargement des événements actifs...');
      const response = await api.get('/events');
      
      console.log('✅ Réponse API événements:', response.data);
      // L'API retourne { success: true, data: { events: [...] } }
      const eventsList = response.data.data?.events || response.data.events || [];
      console.log(`📊 ${eventsList.length} événement(s) trouvé(s)`);
      
      // Filtrer les événements terminés (masquer agents/responsables des événements finis)
      const now = new Date();
      const activeEvents = eventsList.filter(e => {
        const eventEndDateTime = combineDateAndTime(e.endDate, e.checkOutTime);
        const isTerminated = eventEndDateTime && now > eventEndDateTime;
        
        if (isTerminated) {
          console.log(`⏹️ Événement terminé exclu: ${e.name} (fin: ${eventEndDateTime.toLocaleString('fr-FR')})`);
          return false;
        }
        return true;
      });
      
      console.log(`✅ ${activeEvents.length} événement(s) actif(s) après filtrage`);
      
      // Filtrer les événements avec des coordonnées GPS
      const eventsWithGPS = activeEvents.filter(e => e.latitude && e.longitude);
      console.log(`📍 ${eventsWithGPS.length} événement(s) avec coordonnées GPS`);
      
      if (eventsWithGPS.length > 0) {
        eventsWithGPS.forEach(e => {
          console.log(`  - ${e.name}: GPS (${e.latitude}, ${e.longitude}), Rayon: ${e.geoRadius || 100}m`);
        });
      }
      
      setEvents(eventsWithGPS.length > 0 ? eventsWithGPS : activeEvents);
      
      if (eventsWithGPS.length > 0) {
        const firstEvent = eventsWithGPS[0];
        console.log('🎯 Premier événement sélectionné:', firstEvent);
        setSelectedEvent(firstEvent);
      } else if (activeEvents.length > 0) {
        console.warn('⚠️ Événements trouvés mais aucun avec GPS');
        setSelectedEvent(activeEvents[0]);
      } else {
        console.warn('⚠️ Aucun événement actif trouvé');
      }
      setLoading(false);
    } catch (error) {
      console.error('❌ Erreur chargement événements:', error);
      console.error('Détails:', error.response?.data || error.message);
      toast.error('Erreur lors du chargement des événements');
      setLoading(false);
    }
  };

  const fetchAgentPositions = async (eventId) => {
    try {
      console.log(`🔍 Chargement des positions pour événement ${eventId}...`);
      const response = await api.get(`/tracking/realtime/${eventId}`);
      
      console.log('✅ Réponse API positions:', response.data);
      const positions = response.data.positions || [];
      console.log(`📊 ${positions.length} position(s) trouvée(s)`);
      
      // DEBUG: Afficher l'état précédent
      console.log('🔍 État précédent des agents:', previousAgentsRef.current);
      
      // Détecter les sorties de zone ET créer des notifications
      positions.forEach(pos => {
        const prevState = previousAgentsRef.current[pos.userId];
        const userName = `${pos.user?.firstName || ''} ${pos.user?.lastName || ''}`.trim();
        const userRole = pos.user?.role === 'supervisor' || pos.user?.role === 'responsable' ? 'Responsable' : 'Agent';
        
        console.log(`👤 ${userName} (${pos.userId}):`, {
          prevState,
          currentInside: pos.isInsideGeofence,
          prevInside: prevState?.isInsideGeofence,
          shouldAlert: prevState && prevState.isInsideGeofence && !pos.isInsideGeofence
        });
        
        if (prevState && prevState.isInsideGeofence && !pos.isInsideGeofence) {
          // L'agent/superviseur vient de sortir du périmètre
          const distance = Math.round(pos.distanceFromEvent || 0);
          const message = `🚨 ${userRole} ${userName} a quitté la zone de l'événement (${distance}m de distance)`;
          
          console.warn('🚨 ALERTE DÉTECTÉE:', message);
          
          // Notification toast persistante
          toast.warning(message, {
            autoClose: false, // Ne se ferme pas automatiquement
            closeButton: true,
            position: 'top-right',
            icon: '🚨'
          });
          
          // Créer une alerte dans le système
          createZoneExitAlert(pos, eventId);
        }
      });
      
      // Sauvegarder l'état actuel
      const currentState = {};
      positions.forEach(pos => {
        currentState[pos.userId] = {
          isInsideGeofence: pos.isInsideGeofence,
          distanceFromEvent: pos.distanceFromEvent
        };
      });
      previousAgentsRef.current = currentState;
      
      setAgents(positions);
      
      // Calculer les statistiques
      const positionStats = {
        total: positions.length,
        insideZone: positions.filter(p => p.isInsideGeofence).length,
        outsideZone: positions.filter(p => !p.isInsideGeofence).length,
        lowBattery: positions.filter(p => p.batteryLevel && p.batteryLevel < 20).length,
        connectionLost: 0, // Sera calculé depuis les alertes
        agents: positions.filter(p => p.user?.role === 'agent').length,
        supervisors: positions.filter(p => p.user?.role === 'supervisor' || p.user?.role === 'responsable').length
      };
      
      console.log('📊 Statistiques calculées:', positionStats);
      setStats(positionStats);
    } catch (error) {
      console.error('❌ Erreur chargement positions:', error);
      console.error('Détails:', error.response?.data || error.message);
      if (error.response?.status !== 404) {
        toast.error('Erreur lors du chargement des positions');
      }
    }
  };

  const fetchAlerts = async (eventId) => {
    try {
      const response = await api.get('/tracking/alerts', {
        params: {
          eventId,
          isResolved: false,
          limit: 100
        }
      });
      
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Erreur chargement alertes:', error);
    }
  };
  
  const createZoneExitAlert = async (position, eventId) => {
    try {
      const userName = `${position.user?.firstName || ''} ${position.user?.lastName || ''}`.trim();
      const userRole = position.user?.role === 'supervisor' || position.user?.role === 'responsable' ? 'Responsable' : 'Agent';
      const distance = Math.round(position.distanceFromEvent || 0);
      
      await api.post('/tracking/alerts', {
        eventId: eventId,
        userId: position.userId,
        alertType: 'exit_zone',
        severity: 'warning',
        message: `${userRole} ${userName} a quitté la zone de l'événement`,
        metadata: {
          distance: distance,
          latitude: position.latitude,
          longitude: position.longitude,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log('✅ Alerte de sortie de zone créée pour', userName);
    } catch (error) {
      console.error('❌ Erreur création alerte:', error);
    }
  };

  const handleRefresh = () => {
    if (selectedEvent) {
      fetchAgentPositions(selectedEvent.id);
      fetchAlerts(selectedEvent.id);
      toast.success('Données actualisées');
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await api.patch(`/tracking/alerts/${alertId}/resolve`, {
        resolution: 'Résolu par l\'administrateur'
      });
      
      toast.success('Alerte résolue');
      fetchAlerts(selectedEvent.id);
    } catch (error) {
      console.error('Erreur résolution alerte:', error);
      toast.error('Erreur lors de la résolution de l\'alerte');
    }
  };

  const getAlertSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-100';
      case 'warning': return 'text-yellow-500 bg-yellow-100';
      case 'info': return 'text-blue-500 bg-blue-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const getAlertIcon = (alertType) => {
    switch (alertType) {
      case 'exit_zone': return <FiMapPin className="text-red-500" />;
      case 'low_battery': return <FiBattery className="text-yellow-500" />;
      case 'connection_lost': return <FiAlertTriangle className="text-orange-500" />;
      case 'late_arrival': return <FiClock className="text-yellow-500" />;
      default: return <FiAlertTriangle />;
    }
  };

  const getMarkerColor = (agent) => {
    if (agent.batteryLevel && agent.batteryLevel < 20) return 'red';
    if (!agent.isInsideGeofence) return 'red';
    if (agent.user?.role === 'supervisor' || agent.user?.role === 'responsable') return 'blue';
    return 'green';
  };

  // Grouper les agents par position GPS (pour gérer les marqueurs au même endroit)
  const groupAgentsByPosition = (agents) => {
    const groups = {};
    
    agents.forEach(agent => {
      // Créer une clé unique basée sur la position (arrondie à 6 décimales)
      const lat = parseFloat(agent.latitude).toFixed(6);
      const lng = parseFloat(agent.longitude).toFixed(6);
      const key = `${lat},${lng}`;
      
      if (!groups[key]) {
        groups[key] = {
          latitude: agent.latitude,
          longitude: agent.longitude,
          agents: []
        };
      }
      
      groups[key].agents.push(agent);
    });
    
    return Object.values(groups);
  };

  const positionGroups = groupAgentsByPosition(agents);
  
  // Filtrer les superviseurs et agents
  const supervisors = agents.filter(a => a.user?.role === 'supervisor' || a.user?.role === 'responsable');
  const agentsOnly = agents.filter(a => a.user?.role === 'agent');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <FiMapPin className="text-blue-400 text-2xl" />
            <h1 className="text-2xl font-bold text-white">Suivi Agents en Temps Réel</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Sélecteur d'événement */}
            <select
              value={selectedEvent?.id || ''}
              onChange={(e) => {
                const event = events.find(ev => ev.id === e.target.value);
                setSelectedEvent(event);
              }}
              className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 min-w-[350px]"
            >
              {events.length === 0 ? (
                <option value="">Aucun événement disponible</option>
              ) : (
                <>
                  <option value="">Sélectionner un événement</option>
                  {events.map(event => {
                    // Note: agents contient déjà uniquement les positions de l'événement sélectionné
                    // Pour le dropdown, on affiche juste le nom de l'événement
                    return (
                      <option key={event.id} value={event.id}>
                        {event.name} - {new Date(event.startDate).toLocaleDateString()}
                      </option>
                    );
                  })}
                </>
              )}
            </select>

            {/* Info événement sélectionné */}
            {selectedEvent && (
              <div className="text-white text-sm bg-slate-700 px-3 py-2 rounded">
                <div>📍 {selectedEvent.name}</div>
                {selectedEvent.latitude && selectedEvent.longitude && (
                  <div className="text-xs text-gray-400">
                    Lat: {parseFloat(selectedEvent.latitude).toFixed(4)}, 
                    Lng: {parseFloat(selectedEvent.longitude).toFixed(4)}
                  </div>
                )}
              </div>
            )}

            {/* Auto-refresh toggle */}
            <div className="flex flex-col items-start space-y-1">
              <label className="flex items-center space-x-2 text-white">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-blue-500 rounded"
                />
                <span>Vérification auto (15 min)</span>
              </label>
              {autoRefresh && nextCheckTime && (
                <span className="text-xs text-gray-400 ml-7">
                  Prochaine vérification : {nextCheckTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {/* Bouton refresh manuel */}
            <button
              onClick={handleRefresh}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <FiRefreshCw />
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-7 gap-4">
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="text-gray-400 text-sm">Total</div>
            <div className="text-white text-2xl font-bold">{stats.total}</div>
          </div>
          
          <div className="bg-blue-900/30 rounded-lg p-3">
            <div className="text-gray-400 text-sm">Responsables</div>
            <div className="text-blue-400 text-2xl font-bold">{stats.supervisors}</div>
          </div>
          
          <div className="bg-purple-900/30 rounded-lg p-3">
            <div className="text-gray-400 text-sm">Agents</div>
            <div className="text-purple-400 text-2xl font-bold">{stats.agents}</div>
          </div>
          
          <div className="bg-green-900/30 rounded-lg p-3">
            <div className="text-gray-400 text-sm">Dans la zone</div>
            <div className="text-green-400 text-2xl font-bold">{stats.insideZone}</div>
          </div>
          
          <div className="bg-orange-900/30 rounded-lg p-3">
            <div className="text-gray-400 text-sm">Hors zone</div>
            <div className="text-orange-400 text-2xl font-bold">{stats.outsideZone}</div>
          </div>
          
          <div className="bg-yellow-900/30 rounded-lg p-3">
            <div className="text-gray-400 text-sm">Batterie faible</div>
            <div className="text-yellow-400 text-2xl font-bold">{stats.lowBattery}</div>
          </div>
          
          <div className="bg-red-900/30 rounded-lg p-3">
            <div className="text-gray-400 text-sm">Alertes</div>
            <div className="text-red-400 text-2xl font-bold">{alerts.length}</div>
          </div>
        </div>
        
        {/* Notification si événement terminé */}
        {selectedEvent && (() => {
          const eventEndDateTime = combineDateAndTime(selectedEvent.endDate, selectedEvent.checkOutTime);
          const now = new Date();
          return eventEndDateTime && now > eventEndDateTime;
        })() && (
          <div className="mt-4 bg-amber-900/50 border border-amber-600 rounded-lg p-4 flex items-center gap-3">
            <FiClock className="text-amber-400 text-2xl" />
            <div className="text-amber-100">
              <div className="font-bold">Événement terminé</div>
              <div className="text-sm">
                La vérification automatique a été arrêtée. L'événement s'est terminé le {
                  combineDateAndTime(selectedEvent.endDate, selectedEvent.checkOutTime)?.toLocaleString('fr-FR') || 'Date inconnue'
                }.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          {/* Message si pas d'événement sélectionné */}
          {!selectedEvent && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000] bg-slate-800 p-8 rounded-lg shadow-xl text-center">
              <FiMapPin className="text-blue-400 text-6xl mx-auto mb-4" />
              <h2 className="text-white text-2xl font-bold mb-2">Aucun événement sélectionné</h2>
              <p className="text-gray-400 mb-4">
                Sélectionnez un événement dans le menu déroulant ci-dessus pour voir les positions des agents
              </p>
              {events.length === 0 && (
                <p className="text-yellow-400 text-sm">
                  ⚠️ Aucun événement actif trouvé. Créez un événement avec status "active" ou "scheduled"
                </p>
              )}
            </div>
          )}

          {/* Message si événement sans coordonnées GPS */}
          {selectedEvent && (!selectedEvent.latitude || !selectedEvent.longitude) && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000] bg-orange-800 p-8 rounded-lg shadow-xl text-center max-w-md">
              <FiAlertTriangle className="text-yellow-400 text-6xl mx-auto mb-4" />
              <h2 className="text-white text-2xl font-bold mb-2">Événement sans localisation GPS</h2>
              <p className="text-gray-200 mb-2">
                L'événement <strong>"{selectedEvent.name}"</strong> n'a pas de coordonnées GPS définies.
              </p>
              <p className="text-gray-300 text-sm">
                Éditez l'événement et ajoutez une latitude/longitude pour activer le suivi GPS.
              </p>
            </div>
          )}

          <MapContainer 
            center={mapCenter} 
            zoom={13} 
            className="h-full w-full"
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <RecenterMap center={mapCenter} />

            {/* Zone de l'événement */}
            {selectedEvent?.latitude && selectedEvent?.longitude && (
              <>
                <Circle
                  center={[selectedEvent.latitude, selectedEvent.longitude]}
                  radius={selectedEvent.geoRadius || 100}
                  pathOptions={{
                    color: 'blue',
                    fillColor: 'blue',
                    fillOpacity: 0.1
                  }}
                />
                <Marker position={[selectedEvent.latitude, selectedEvent.longitude]}>
                  <Popup>
                    <div className="text-center">
                      <strong>{selectedEvent.name}</strong>
                      <div>Zone: {selectedEvent.geoRadius || 100}m</div>
                    </div>
                  </Popup>
                </Marker>
              </>
            )}

            {/* Message si aucune position GPS */}
            {selectedEvent && selectedEvent.latitude && selectedEvent.longitude && agents.length === 0 && (
              <div className="leaflet-bottom leaflet-left" style={{ marginLeft: '10px', marginBottom: '30px' }}>
                <div className="bg-yellow-900 text-white p-4 rounded-lg shadow-lg max-w-sm">
                  <div className="flex items-start gap-3">
                    <FiAlertTriangle className="text-yellow-400 text-2xl flex-shrink-0" />
                    <div>
                      <div className="font-bold mb-1">Aucune position GPS détectée</div>
                      <div className="text-sm text-gray-200">
                        Les agents assignés à cet événement n'ont pas encore envoyé de positions GPS.
                      </div>
                      <div className="text-xs text-gray-300 mt-2">
                        💡 Les agents doivent utiliser l'application mobile ou faire un pointage pour que leurs positions apparaissent ici.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Markers des agents groupés par position */}
            {positionGroups.map((group, groupIndex) => {
              const agentsInGroup = group.agents;
              const isMultiple = agentsInGroup.length > 1;
              
              // Pour un groupe, utiliser la couleur prioritaire (rouge > bleu > vert)
              let groupColor = 'green';
              if (agentsInGroup.some(a => !a.isInsideGeofence || (a.batteryLevel && a.batteryLevel < 20))) {
                groupColor = 'red';
              } else if (agentsInGroup.some(a => a.user?.role === 'supervisor' || a.user?.role === 'responsable')) {
                groupColor = 'blue';
              }

              const customIcon = new L.Icon({
                iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${groupColor}.png`,
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
              });

              return (
                <Marker
                  key={`group-${groupIndex}`}
                  position={[parseFloat(group.latitude), parseFloat(group.longitude)]}
                  icon={customIcon}
                >
                  <Popup maxWidth={300}>
                    {isMultiple ? (
                      // Popup pour groupe multiple
                      <div className="max-h-64 overflow-y-auto">
                        <div className="font-bold text-lg mb-2 text-blue-600 border-b pb-2">
                          👥 {agentsInGroup.length} personnes à cet emplacement
                        </div>
                        <div className="space-y-3">
                          {agentsInGroup.map(agent => {
                            const userName = `${agent.user?.firstName || ''} ${agent.user?.lastName || ''}`.trim();
                            const userRole = agent.user?.role === 'supervisor' || agent.user?.role === 'responsable' ? '👔 Responsable' : '👤 Agent';
                            
                            return (
                              <div key={agent.id} className="bg-gray-50 p-2 rounded border-l-4" style={{
                                borderLeftColor: !agent.isInsideGeofence ? '#ef4444' : 
                                  (agent.user?.role === 'supervisor' || agent.user?.role === 'responsable') ? '#3b82f6' : '#10b981'
                              }}>
                                <div className="font-bold">{userRole} {userName}</div>
                                <div className="text-sm text-gray-600">{agent.user?.employeeId}</div>
                                {agent.batteryLevel && <div className="text-xs">🔋 Batterie: {agent.batteryLevel}%</div>}
                                <div className="text-xs">📍 Distance: {agent.distanceFromEvent ? Math.round(agent.distanceFromEvent) + 'm' : 'N/A'}</div>
                                <div className={`text-xs font-bold ${agent.isInsideGeofence ? 'text-green-600' : 'text-red-600'}`}>
                                  {agent.isInsideGeofence ? '✅ Dans le périmètre' : '❌ HORS PÉRIMÈTRE'}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {new Date(agent.createdAt).toLocaleTimeString()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      // Popup pour agent unique
                      <div className="text-sm">
                        <div className="font-bold mb-2 flex items-center gap-2">
                          {agentsInGroup[0].user?.firstName} {agentsInGroup[0].user?.lastName}
                          {(agentsInGroup[0].user?.role === 'supervisor' || agentsInGroup[0].user?.role === 'responsable') && (
                            <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                              {agentsInGroup[0].user?.role === 'responsable' ? 'Responsable' : 'Superviseur'}
                            </span>
                          )}
                        </div>
                        <div>ID: {agentsInGroup[0].user?.employeeId}</div>
                        <div>Rôle: {agentsInGroup[0].user?.role}</div>
                        {agentsInGroup[0].batteryLevel && <div>Batterie: {agentsInGroup[0].batteryLevel}%</div>}
                        <div>Distance: {agentsInGroup[0].distanceFromEvent ? Math.round(agentsInGroup[0].distanceFromEvent) + 'm' : 'N/A'}</div>
                        <div className={agentsInGroup[0].isInsideGeofence ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                          {agentsInGroup[0].isInsideGeofence ? '✅ Dans le périmètre' : '❌ HORS PÉRIMÈTRE'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(agentsInGroup[0].createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    )}
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Légende des marqueurs */}
          {selectedEvent && agents.length > 0 && (
            <div className="absolute bottom-4 right-4 bg-slate-800 p-4 rounded-lg shadow-xl border border-slate-600 z-[1000]">
              <div className="text-white font-bold mb-2 text-sm">Légende des marqueurs</div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-gray-300">Responsable/Superviseur</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-300">Agent dans le périmètre</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-gray-300">Hors périmètre / Batterie faible</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Alertes et Personnel */}
        <div className="w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto">
          <div className="p-4">
            {/* Liste du personnel */}
            {selectedEvent && agents.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-4">
                  👥 Personnel sur site ({agents.length})
                </h2>
                
                {/* Responsables */}
                {supervisors.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      Responsables ({supervisors.length})
                    </h3>
                    <div className="space-y-2">
                      {supervisors.map(sup => (
                        <div key={sup.userId} className="bg-slate-700 p-3 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-white font-medium">
                                {sup.user?.firstName} {sup.user?.lastName}
                              </div>
                              <div className="text-xs text-gray-400">
                                {sup.user?.employeeId}
                              </div>
                            </div>
                            <div className="text-xs text-right">
                              {sup.isInsideGeofence ? (
                                <span className="text-green-400">✓ Dans zone</span>
                              ) : (
                                <span className="text-orange-400">⚠ Hors zone</span>
                              )}
                              {sup.distanceFromEvent != null && (
                                <div className="text-gray-400">{sup.distanceFromEvent}m</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agents */}
                {agentsOnly.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      Agents ({agentsOnly.length})
                    </h3>
                    <div className="space-y-2">
                      {agentsOnly.map(agent => (
                        <div key={agent.userId} className="bg-slate-700 p-3 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-white font-medium">
                                {agent.user?.firstName} {agent.user?.lastName}
                              </div>
                              <div className="text-xs text-gray-400">
                                {agent.user?.employeeId}
                              </div>
                            </div>
                            <div className="text-xs text-right">
                              {agent.batteryLevel && agent.batteryLevel < 20 ? (
                                <span className="text-red-400">🔋 {agent.batteryLevel}%</span>
                              ) : agent.isInsideGeofence ? (
                                <span className="text-green-400">✓ Dans zone</span>
                              ) : (
                                <span className="text-orange-400">⚠ Hors zone</span>
                              )}
                              {agent.distanceFromEvent != null && (
                                <div className="text-gray-400">{agent.distanceFromEvent}m</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Alertes */}
            <h2 className="text-xl font-bold text-white mb-4">
              Alertes en cours ({alerts.length})
            </h2>

            {alerts.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <FiAlertTriangle className="mx-auto text-4xl mb-2" />
                <p>Aucune alerte active</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`${getAlertSeverityColor(alert.severity)} rounded-lg p-4`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getAlertIcon(alert.alertType)}
                        <span className="font-semibold">{alert.title}</span>
                      </div>
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="text-xs px-2 py-1 bg-white rounded hover:bg-gray-200 transition-colors"
                      >
                        Résoudre
                      </button>
                    </div>
                    
                    <div className="text-sm mb-2">{alert.message}</div>
                    
                    <div className="flex items-center space-x-2 text-xs">
                      <FiUser />
                      <span>{alert.user?.firstName} {alert.user?.lastName}</span>
                    </div>
                    
                    {alert.distanceFromZone && (
                      <div className="text-xs mt-1">
                        Distance: {Math.round(alert.distanceFromZone)}m de la zone
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-600 mt-2">
                      {new Date(alert.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentTrackingMap;
