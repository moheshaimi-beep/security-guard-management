/**
 * CARTE DYNAMIQUE INTÉGRÉE POUR DASHBOARD
 * 🗺️ Version optimisée compatible avec l'écosystème existant
 */

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import {
  FiMapPin, FiUsers, FiNavigation, FiClock, FiUser, 
  FiCalendar, FiActivity, FiZap, FiTarget
} from 'react-icons/fi';
import 'leaflet/dist/leaflet.css';
import './DynamicMapStyles.css';

// Composant de compte à rebours compact pour étiquette
const CompactCountdown = ({ event }) => {
  const [timeData, setTimeData] = useState({ countdown: null, status: '', stats: {} });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      
      // Parser la date de début avec checkInTime
      const startDateStr = event.startDate.split('T')[0];
      const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
      const start = new Date(startYear, startMonth - 1, startDay);
      const [startHours, startMinutes] = (event.checkInTime || '00:00').split(':').map(Number);
      start.setHours(startHours, startMinutes, 0, 0);
      
      // Parser la date de fin avec checkOutTime
      const endDateStr = (event.endDate || event.startDate).split('T')[0];
      const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
      const end = new Date(endYear, endMonth - 1, endDay);
      const [endHours, endMinutes] = (event.checkOutTime || '23:59').split(':').map(Number);
      end.setHours(endHours, endMinutes, 59, 0);
      
      let status = '';
      let countdown = null;
      
      if (now < start) {
        // Événement à venir
        status = 'À venir';
        const diff = start - now;
        countdown = {
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000)
        };
      } else if (now >= start && now <= end) {
        // Événement en cours
        status = 'En cours';
        const diff = end - now;
        countdown = {
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000)
        };
      } else {
        status = 'Terminé';
      }
      
      // Calculer les statistiques d'agents
      const assignedCount = event.assignments?.length || 0;
      const presentCount = event.assignments?.filter(a => a.checkInTime)?.length || 0;
      const requiredCount = event.requiredAgents || 0;
      const missingCount = Math.max(0, requiredCount - assignedCount);
      
      setTimeData({
        countdown,
        status,
        stats: {
          assigned: assignedCount,
          present: presentCount,
          required: requiredCount,
          missing: missingCount
        }
      });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [event]);

  const { countdown, status, stats } = timeData;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '12px',
      padding: '12px',
      minWidth: '260px',
      boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        fontSize: '16px',
        fontWeight: 'bold',
        marginBottom: '8px',
        borderBottom: '1px solid rgba(255,255,255,0.3)',
        paddingBottom: '8px'
      }}>
        {event.name}
      </div>
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '8px'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '8px',
          padding: '6px 10px',
          textAlign: 'center',
          flex: 1
        }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
            {String(stats.missing).padStart(2, '0')}
          </div>
          <div style={{ fontSize: '9px', opacity: 0.9 }}>Manquants</div>
        </div>
        
        <div style={{
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '8px',
          padding: '6px 10px',
          textAlign: 'center',
          flex: 1
        }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
            {String(stats.present).padStart(2, '0')}
          </div>
          <div style={{ fontSize: '9px', opacity: 0.9 }}>Présents</div>
        </div>
      </div>
    </div>
  );
};

// Composant de compte à rebours
const CountdownTimer = ({ targetDate, eventStatus }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
        setIsActive(true);
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsActive(false);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!isActive && eventStatus !== 'En cours') {
    return null;
  }

  const getCountdownLabel = () => {
    if (eventStatus === 'En cours') {
      return 'Temps restant';
    }
    return 'Commence dans';
  };

  const getCountdownColor = () => {
    if (eventStatus === 'En cours') {
      return 'text-red-600';
    }
    if (timeLeft.days === 0 && timeLeft.hours < 1) {
      return 'text-orange-600';
    }
    return 'text-blue-600';
  };

  return (
    <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
      <div className="flex items-center gap-2 mb-2">
        <FiClock className={`${getCountdownColor()} animate-pulse`} size={16} />
        <span className={`text-sm font-semibold ${getCountdownColor()}`}>
          {getCountdownLabel()}
        </span>
      </div>
      
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-white/80 rounded-lg px-2 py-1 shadow-sm">
          <div className={`text-lg font-bold ${getCountdownColor()}`}>
            {String(timeLeft.days).padStart(2, '0')}
          </div>
          <div className="text-xs text-gray-500 font-medium">jours</div>
        </div>
        
        <div className="bg-white/80 rounded-lg px-2 py-1 shadow-sm">
          <div className={`text-lg font-bold ${getCountdownColor()}`}>
            {String(timeLeft.hours).padStart(2, '0')}
          </div>
          <div className="text-xs text-gray-500 font-medium">heures</div>
        </div>
        
        <div className="bg-white/80 rounded-lg px-2 py-1 shadow-sm">
          <div className={`text-lg font-bold ${getCountdownColor()}`}>
            {String(timeLeft.minutes).padStart(2, '0')}
          </div>
          <div className="text-xs text-gray-500 font-medium">min</div>
        </div>
        
        <div className="bg-white/80 rounded-lg px-2 py-1 shadow-sm">
          <div className={`text-lg font-bold ${getCountdownColor()}`}>
            {String(timeLeft.seconds).padStart(2, '0')}
          </div>
          <div className="text-xs text-gray-500 font-medium">sec</div>
        </div>
      </div>
      
      {eventStatus === 'En cours' && (
        <div className="mt-2 flex items-center justify-center">
          <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span>ÉVÉNEMENT EN COURS</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Configuration des icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

// Hook pour centrage automatique
const AutoCenterMap = ({ events = [], agents = [] }) => {
  const map = useMap();
  
  useEffect(() => {
    const validEvents = events.filter(e => e.latitude && e.longitude);
    const validAgents = agents.filter(a => a.latitude && a.longitude);
    
    const allPoints = [
      ...validEvents.map(e => [parseFloat(e.latitude), parseFloat(e.longitude)]),
      ...validAgents.map(a => [parseFloat(a.latitude), parseFloat(a.longitude)])
    ];
    
    if (allPoints.length === 0) return;
    
    if (allPoints.length === 1) {
      map.setView(allPoints[0], 14);
    } else {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { 
        padding: [30, 30], 
        maxZoom: 15 
      });
    }
  }, [map, events, agents]);
  
  return null;
};

// Icône personnalisée pour événements
const createEventIcon = (event) => {
  const now = new Date();
  
  // Parser la date de début avec checkInTime
  const startDateStr = event.startDate.split('T')[0];
  const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
  const start = new Date(startYear, startMonth - 1, startDay);
  const [startHours, startMinutes] = (event.checkInTime || '00:00').split(':').map(Number);
  start.setHours(startHours, startMinutes, 0, 0);
  
  // Parser la date de fin avec checkOutTime
  const endDateStr = (event.endDate || event.startDate).split('T')[0];
  const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
  const end = new Date(endYear, endMonth - 1, endDay);
  const [endHours, endMinutes] = (event.checkOutTime || '23:59').split(':').map(Number);
  end.setHours(endHours, endMinutes, 59, 0);
  
  let color = '#10B981'; // Vert par défaut
  let status = 'À venir';
  
  if (now >= start && now <= end) {
    color = '#EF4444'; // Rouge - en cours
    status = 'En cours';
  } else if (now > end) {
    color = '#6B7280'; // Gris - terminé
    status = 'Terminé';
  } else {
    color = '#F59E0B'; // Orange - à venir
    status = 'À venir';
  }
  
  return L.divIcon({
    html: `
      <div class="relative">
        <div style="
          background: ${color};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          animation: ${status === 'En cours' ? 'pulse 2s infinite' : 'none'};
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
        </div>
        ${status === 'En cours' ? `
          <div style="
            position: absolute;
            top: -3px;
            left: -3px;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            border: 2px solid ${color};
            animation: ping 2s infinite;
            opacity: 0.7;
          "></div>
        ` : ''}
      </div>
    `,
    className: 'custom-event-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

// Icône personnalisée pour agents
const createAgentIcon = (agent) => {
  let color = '#6B7280'; // Gris par défaut
  
  switch (agent.status) {
    case 'active':
      color = '#10B981'; // Vert
      break;
    case 'busy':
      color = '#F59E0B'; // Orange
      break;
    default:
      color = '#6B7280'; // Gris
  }
  
  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 3px 8px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        animation: ${agent.status === 'active' ? 'bounce 1s ease infinite' : 'none'};
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
    `,
    className: 'custom-agent-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

// Composant principal
const DynamicMapIntegrated = ({ events = [], agents = [] }) => {
  const [showEvents, setShowEvents] = useState(true);
  const [showAgents, setShowAgents] = useState(true);
  const [autoCenter, setAutoCenter] = useState(true);
  const [lastUpdate] = useState(new Date());
  
  // Statistiques en temps réel
  const stats = {
    totalEvents: events.length,
    ongoingEvents: events.filter(e => {
      const now = new Date();
      const start = new Date(e.startDate);
      const end = new Date(e.endDate);
      return now >= start && now <= end;
    }).length,
    activeAgents: agents.filter(a => a.status === 'active').length,
    totalAgents: agents.length
  };
  
  const validEvents = events.filter(e => e.latitude && e.longitude);
  const validAgents = agents.filter(a => a.latitude && a.longitude);
  
  return (
    <div className="relative h-full w-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* En-tête moderne */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <FiMapPin size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Carte des Événements</h2>
                <p className="text-xs text-blue-100">
                  {validEvents.length} événements localisés
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex items-center gap-1 text-sm bg-white/20 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                <span>{stats.ongoingEvents} en cours</span>
              </div>
              <div className="flex items-center gap-1 text-sm bg-white/20 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>{stats.activeAgents} agents actifs</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEvents(!showEvents)}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-all ${
                showEvents 
                  ? 'bg-white/30 text-white shadow-md' 
                  : 'bg-white/10 text-blue-100 hover:bg-white/20'
              }`}
            >
              <FiCalendar size={14} />
              Événements
            </button>
            
            <button
              onClick={() => setShowAgents(!showAgents)}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-all ${
                showAgents 
                  ? 'bg-white/30 text-white shadow-md' 
                  : 'bg-white/10 text-blue-100 hover:bg-white/20'
              }`}
            >
              <FiUsers size={14} />
              Agents
            </button>
            
            <button
              onClick={() => setAutoCenter(!autoCenter)}
              className={`p-2 rounded-md transition-all ${
                autoCenter 
                  ? 'bg-white/30 text-white shadow-md' 
                  : 'bg-white/10 text-blue-100 hover:bg-white/20'
              }`}
              title={autoCenter ? 'Centrage automatique ON' : 'Centrage automatique OFF'}
            >
              <FiNavigation size={16} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Carte principale avec marge pour l'en-tête */}
      <div className="pt-20 h-full">
        <MapContainer
          center={[33.5731, -7.5898]}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />
          
          {autoCenter && (
            <AutoCenterMap events={validEvents} agents={validAgents} />
          )}
          
          {/* Marqueurs d'événements */}
          {showEvents && validEvents.map(event => (
            <Marker
              key={`event-${event.id}`}
              position={[parseFloat(event.latitude), parseFloat(event.longitude)]}
              icon={createEventIcon(event)}
            >
              <Popup className="custom-popup">
                <div className="min-w-[280px] p-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-900 pr-2">{event.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      (() => {
                        const now = new Date();
                        const startDateStr = event.startDate.split('T')[0];
                        const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
                        const start = new Date(startYear, startMonth - 1, startDay);
                        const [startHours, startMinutes] = (event.checkInTime || '00:00').split(':').map(Number);
                        start.setHours(startHours, startMinutes, 0, 0);
                        
                        const endDateStr = (event.endDate || event.startDate).split('T')[0];
                        const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
                        const end = new Date(endYear, endMonth - 1, endDay);
                        const [endHours, endMinutes] = (event.checkOutTime || '23:59').split(':').map(Number);
                        end.setHours(endHours, endMinutes, 59, 0);
                        
                        if (now >= start && now <= end) return 'bg-red-100 text-red-800';
                        if (now < start) return 'bg-orange-100 text-orange-800';
                        return 'bg-gray-100 text-gray-800';
                      })()
                    }`}>
                      {(() => {
                        const now = new Date();
                        const startDateStr = event.startDate.split('T')[0];
                        const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
                        const start = new Date(startYear, startMonth - 1, startDay);
                        const [startHours, startMinutes] = (event.checkInTime || '00:00').split(':').map(Number);
                        start.setHours(startHours, startMinutes, 0, 0);
                        
                        const endDateStr = (event.endDate || event.startDate).split('T')[0];
                        const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
                        const end = new Date(endYear, endMonth - 1, endDay);
                        const [endHours, endMinutes] = (event.checkOutTime || '23:59').split(':').map(Number);
                        end.setHours(endHours, endMinutes, 59, 0);
                        
                        if (now >= start && now <= end) return 'En cours';
                        if (now < start) return 'À venir';
                        return 'Terminé';
                      })()}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <FiMapPin size={14} className="text-blue-500" />
                      <span className="font-medium">Lieu:</span>
                      <span className="flex-1 text-xs">{event.location}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-600">
                      <FiClock size={14} className="text-green-500" />
                      <span className="font-medium">Début:</span>
                      <span>{(() => {
                        const startDateStr = event.startDate.split('T')[0];
                        const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
                        const start = new Date(startYear, startMonth - 1, startDay);
                        const [startHours, startMinutes] = (event.checkInTime || '00:00').split(':').map(Number);
                        start.setHours(startHours, startMinutes, 0, 0);
                        return start.toLocaleString('fr-FR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      })()}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-600">
                      <FiTarget size={14} className="text-purple-500" />
                      <span className="font-medium">Fin:</span>
                      <span>{(() => {
                        const endDateStr = (event.endDate || event.startDate).split('T')[0];
                        const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
                        const end = new Date(endYear, endMonth - 1, endDay);
                        const [endHours, endMinutes] = (event.checkOutTime || '23:59').split(':').map(Number);
                        end.setHours(endHours, endMinutes, 59, 0);
                        return end.toLocaleString('fr-FR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      })()}</span>
                    </div>
                    
                    {event.assignments?.length > 0 && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiUsers size={14} className="text-orange-500" />
                        <span className="font-medium">Agents:</span>
                        <span>{event.assignments.length} assigné(s)</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Compte à rebours dans la popup */}
                  <CountdownTimer 
                    targetDate={(() => {
                      const now = new Date();
                      const startDateStr = event.startDate.split('T')[0];
                      const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
                      const start = new Date(startYear, startMonth - 1, startDay);
                      const [startHours, startMinutes] = (event.checkInTime || '00:00').split(':').map(Number);
                      start.setHours(startHours, startMinutes, 0, 0);
                      
                      const endDateStr = (event.endDate || event.startDate).split('T')[0];
                      const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
                      const end = new Date(endYear, endMonth - 1, endDay);
                      const [endHours, endMinutes] = (event.checkOutTime || '23:59').split(':').map(Number);
                      end.setHours(endHours, endMinutes, 59, 0);
                      
                      if (now >= start && now <= end) {
                        return end; // Temps restant jusqu'à la fin
                      } else if (now < start) {
                        return start; // Temps avant le début
                      }
                      return null;
                    })()} 
                    eventStatus={(() => {
                      const now = new Date();
                      const startDateStr = event.startDate.split('T')[0];
                      const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
                      const start = new Date(startYear, startMonth - 1, startDay);
                      const [startHours, startMinutes] = (event.checkInTime || '00:00').split(':').map(Number);
                      start.setHours(startHours, startMinutes, 0, 0);
                      
                      const endDateStr = (event.endDate || event.startDate).split('T')[0];
                      const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
                      const end = new Date(endYear, endMonth - 1, endDay);
                      const [endHours, endMinutes] = (event.checkOutTime || '23:59').split(':').map(Number);
                      end.setHours(endHours, endMinutes, 59, 0);
                      
                      if (now >= start && now <= end) return 'En cours';
                      if (now < start) return 'À venir';
                      return 'Terminé';
                    })()}
                  />
                  
                  {event.description && (
                    <div className="mt-3 p-2 bg-gray-50 rounded-md">
                      <p className="text-xs text-gray-600">
                        {event.description.length > 100 
                          ? `${event.description.substring(0, 100)}...` 
                          : event.description
                        }
                      </p>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
          
          {/* Marqueurs d'agents */}
          {showAgents && validAgents.map(agent => (
            <Marker
              key={`agent-${agent.id}`}
              position={[parseFloat(agent.latitude), parseFloat(agent.longitude)]}
              icon={createAgentIcon(agent)}
            >
              <Popup className="custom-popup">
                <div className="min-w-[200px] p-2">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    {agent.firstName} {agent.lastName}
                  </h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        agent.status === 'active' ? 'bg-green-100 text-green-800' :
                        agent.status === 'busy' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        <FiActivity size={10} className="mr-1" />
                        {agent.status === 'active' ? 'Actif' :
                         agent.status === 'busy' ? 'Occupé' : 'Hors ligne'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-600">
                      <FiUser size={14} className="text-blue-500" />
                      <span>Agent de sécurité</span>
                    </div>
                    
                    {agent.lastLocationUpdate && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiClock size={14} className="text-purple-500" />
                        <span className="text-xs">
                          Position: {new Date(agent.lastLocationUpdate).toLocaleString('fr-FR')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      
      {/* Indicateur de mise à jour en bas */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-gray-900/90 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-2">
        <FiZap size={12} className="text-green-400" />
        <span>Mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}</span>
      </div>
      
      {/* Styles CSS intégrés */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          @keyframes ping {
            75%, 100% {
              transform: scale(1.1);
              opacity: 0;
            }
          }
          
          @keyframes bounce {
            0%, 20%, 53%, 80%, 100% {
              transform: translate3d(0,0,0);
            }
            40%, 43% {
              transform: translate3d(0,-5px,0);
            }
            70% {
              transform: translate3d(0,-3px,0);
            }
            90% {
              transform: translate3d(0,-1px,0);
            }
          }
          
          .custom-event-marker,
          .custom-agent-marker {
            transition: all 0.3s ease;
          }
          
          .custom-event-marker:hover,
          .custom-agent-marker:hover {
            transform: scale(1.1);
          }
          
          .leaflet-popup-content {
            margin: 8px 12px !important;
          }
          
          .event-label-tooltip {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          
          .event-label-tooltip::before {
            display: none !important;
          }
          
          .leaflet-tooltip-top::before {
            display: none !important;
          }
          
          .leaflet-tooltip {
            padding: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
        `
      }} />
    </div>
  );
};

export default DynamicMapIntegrated;