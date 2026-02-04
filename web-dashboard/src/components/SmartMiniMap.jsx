import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, useMap, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { 
  FiMapPin, FiNavigation, FiCrosshair, FiTruck, FiUser as FiWalk, 
  FiZap, FiLayers, FiFilter, FiTrendingUp, FiActivity, FiTarget,
  FiMaximize2, FiMinimize2, FiSun, FiMoon, FiAlertCircle, FiCheckCircle,
  FiClock
} from 'react-icons/fi';
import styles from './SmartMiniMap.module.css';

// ============================================================================
// ADVANCED UTILITIES
// ============================================================================

/**
 * Calculate optimal route using multiple waypoints
 */
const calculateOptimalRoute = (start, waypoints, end) => {
  // Simple TSP (Traveling Salesman Problem) solution using nearest neighbor
  const points = [start, ...waypoints, end];
  const route = [start];
  const remaining = [...waypoints];
  
  let current = start;
  while (remaining.length > 0) {
    let nearest = null;
    let minDist = Infinity;
    
    remaining.forEach((point, idx) => {
      const dist = calculateDistance(current[0], current[1], point[0], point[1]);
      if (dist < minDist) {
        minDist = dist;
        nearest = idx;
      }
    });
    
    if (nearest !== null) {
      route.push(remaining[nearest]);
      current = remaining[nearest];
      remaining.splice(nearest, 1);
    }
  }
  
  route.push(end);
  return route;
};

/**
 * AI-powered ETA prediction based on historical data
 */
const predictETA = (distance, mode, timeOfDay, trafficLevel = 'normal') => {
  const baseSpeeds = {
    walking: 5,    // km/h
    driving: 30,   // km/h
    cycling: 15    // km/h
  };
  
  // Traffic multiplier
  const trafficMultipliers = {
    low: 1.2,
    normal: 1.0,
    high: 0.7,
    heavy: 0.5
  };
  
  // Time of day adjustment (rush hour)
  const hour = timeOfDay?.getHours() || new Date().getHours();
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  const rushHourMultiplier = isRushHour && mode === 'driving' ? 0.8 : 1.0;
  
  const speed = baseSpeeds[mode] || baseSpeeds.driving;
  const adjustedSpeed = speed * (trafficMultipliers[trafficLevel] || 1) * rushHourMultiplier;
  
  const timeInHours = distance / (adjustedSpeed * 1000);
  const hours = Math.floor(timeInHours);
  const minutes = Math.round((timeInHours - hours) * 60);
  
  return {
    hours,
    minutes,
    formatted: hours === 0 ? `${minutes} min` : `${hours}h ${minutes}min`,
    confidence: isRushHour ? 0.7 : 0.9
  };
};

/**
 * Get traffic color based on level
 */
const getTrafficColor = (level) => {
  const colors = {
    low: '#22c55e',      // green
    normal: '#eab308',   // yellow
    high: '#f97316',     // orange
    heavy: '#ef4444',    // red
    light: '#22c55e',    // alias for low
    moderate: '#f97316', // alias for high
    dense: '#ef4444'     // alias for heavy
  };
  return colors[level?.toLowerCase()] || colors.normal;
};

/**
 * Cluster nearby events
 */
const clusterEvents = (events, maxDistance = 500) => {
  const clusters = [];
  const processed = new Set();
  
  events.forEach((event, idx) => {
    if (processed.has(idx)) return;
    
    const cluster = {
      center: event.position,
      events: [event],
      color: event.color
    };
    
    events.forEach((other, otherIdx) => {
      if (idx === otherIdx || processed.has(otherIdx)) return;
      
      const dist = calculateDistance(
        event.position[0], event.position[1],
        other.position[0], other.position[1]
      );
      
      if (dist <= maxDistance) {
        cluster.events.push(other);
        processed.add(otherIdx);
      }
    });
    
    processed.add(idx);
    clusters.push(cluster);
  });
  
  return clusters;
};

/**
 * Generate heatmap data points
 */
const generateHeatmapData = (events) => {
  return events.map(event => ({
    lat: event.position[0],
    lng: event.position[1],
    intensity: event.priority || 1
  }));
};

/**
 * Calculate distance using Haversine formula
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Validate coordinates
 */
const isValidCoordinate = (lat, lng) => {
  return lat != null && lng != null && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));
};

// ============================================================================
// CUSTOM ICONS
// ============================================================================

const createSmartUserIcon = (direction = 0) => L.divIcon({
  className: 'smart-user-marker',
  html: `
    <div class="smart_user_wrapper" style="transform: rotate(${direction}deg)">
      <div class="smart_pulse_ring"></div>
      <div class="smart_pulse_inner"></div>
      <div class="smart_user_marker">
        <div class="smart_direction_arrow">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M12 2L12 22M12 2L8 6M12 2L16 6" stroke="white" stroke-width="2" fill="none"/>
          </svg>
        </div>
      </div>
    </div>
  `,
  iconSize: [50, 50],
  iconAnchor: [25, 25]
});

const createClusterIcon = (count, color) => L.divIcon({
  className: 'smart-cluster-marker',
  html: `
    <div class="smart_cluster" style="background: ${color}">
      <span class="smart_cluster_count">${count}</span>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const createSmartEventIcon = (event) => {
  const urgencyClass = event.urgent ? 'urgent' : '';
  return L.divIcon({
    className: 'smart-event-marker',
    html: `
      <div class="smart_event_wrapper ${urgencyClass}">
        <div class="smart_event_pulse"></div>
        <div class="smart_event_marker" style="background: ${event.color}">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M12 2L2 22h20L12 2z" fill="white"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
};

// ============================================================================
// ADVANCED MAP CONTROLLER
// ============================================================================

const SmartMapController = ({ 
  center, 
  zoom, 
  bounds, 
  autoFit, 
  following,
  onMapReady 
}) => {
  const map = useMap();
  const [isReady, setIsReady] = useState(false);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!map) return;
    
    let mounted = true;
    
    const checkMapReady = () => {
      try {
        const container = map.getContainer();
        if (container && container._leaflet_pos !== undefined) {
          map.whenReady(() => {
            if (mounted) {
              setTimeout(() => {
                setIsReady(true);
                onMapReady?.(map);
              }, 50);
            }
          });
        } else {
          setTimeout(checkMapReady, 50);
        }
      } catch (error) {
        console.warn('Map readiness check error:', error);
        if (mounted) {
          setTimeout(checkMapReady, 100);
        }
      }
    };
    
    const timer = setTimeout(checkMapReady, 100);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [map, onMapReady]);

  useEffect(() => {
    if (!isReady || !map) return;
    
    try {
      const container = map.getContainer();
      if (!container || container._leaflet_pos === undefined) return;
      
      if (following && center && isValidCoordinate(center[0], center[1])) {
        // Smooth following mode
        map.flyTo(center, zoom || 16, {
          animate: true,
          duration: 1.5
        });
      } else if (autoFit && bounds && bounds.length >= 2) {
        // Auto-fit to show all markers
        map.flyToBounds(bounds, {
          padding: [80, 80],
          animate: true,
          duration: 1.5,
          maxZoom: 17
        });
      } else if (center && isValidCoordinate(center[0], center[1])) {
        // Normal pan to center
        map.setView(center, zoom || 14, { animate: true });
      }
    } catch (err) {
      console.warn('Map animation error:', err);
    }
  }, [center, zoom, bounds, autoFit, following, isReady, map]);

  return null;
};

// ============================================================================
// SMART INFO PANELS
// ============================================================================

const SmartStatsPanel = ({ stats, trafficLevel }) => {
  if (!stats) return null;

  return (
    <div className={styles.smart_stats_panel}>
      <div className={styles.stat_card}>
        <FiActivity className={styles.stat_icon} />
        <div>
          <div className={styles.stat_value}>{stats.totalDistance?.toFixed(1) || 0} km</div>
          <div className={styles.stat_label}>Distance totale</div>
        </div>
      </div>
      
      <div className={styles.stat_card}>
        <FiTarget className={styles.stat_icon} />
        <div>
          <div className={styles.stat_value}>{stats.totalEvents || 0}</div>
          <div className={styles.stat_label}>Événements</div>
        </div>
      </div>
      
      <div className={styles.stat_card}>
        <FiTrendingUp className={styles.stat_icon} style={{ color: getTrafficColor(trafficLevel) }} />
        <div>
          <div className={styles.stat_value}>{trafficLevel || 'Normal'}</div>
          <div className={styles.stat_label}>Trafic</div>
        </div>
      </div>
    </div>
  );
};

const SmartRoutePanel = ({ route, eta, confidence }) => {
  if (!route) return null;

  return (
    <div className={styles.smart_route_panel}>
      <div className={styles.route_header}>
        <FiNavigation className={styles.route_icon} />
        <h3>Itinéraire Optimisé</h3>
      </div>
      
      <div className={styles.route_details}>
        <div className={styles.route_metric}>
          <FiMapPin size={14} />
          <span>{(route.distance / 1000).toFixed(2)} km</span>
        </div>
        
        <div className={styles.route_metric}>
          <FiClock size={14} />
          <span>{eta?.formatted || '-'}</span>
        </div>
        
        <div className={styles.route_metric}>
          <FiTrendingUp size={14} />
          <span>Confiance: {Math.round((confidence || 0) * 100)}%</span>
        </div>
      </div>
      
      <div className={styles.route_waypoints}>
        {route.waypoints?.map((point, idx) => (
          <div key={idx} className={styles.waypoint}>
            <div className={styles.waypoint_dot} />
            <span>{point.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN SMART MAP COMPONENT
// ============================================================================

const SmartMiniMap = ({
  latitude,
  longitude,
  targetLat,
  targetLng,
  geoRadius = 100,
  events = [],
  className = '',
  height = '500px',
  enableClustering = true,
  enableHeatmap = false,
  enableSmartRouting = true,
  enablePredictions = true,
  darkMode = false
}) => {
  const mapRef = useRef(null);
  const [userPosition, setUserPosition] = useState(null);
  const [following, setFollowing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [layerMode, setLayerMode] = useState('standard'); // standard, satellite, dark
  const [showClusters, setShowClusters] = useState(enableClustering);
  const [trafficLevel, setTrafficLevel] = useState('normal');
  const [smartRoute, setSmartRoute] = useState(null);
  const [mapStats, setMapStats] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Computed values
  const hasValidPosition = isValidCoordinate(latitude, longitude);
  const hasValidTarget = isValidCoordinate(targetLat, targetLng);

  const center = hasValidPosition 
    ? [parseFloat(latitude), parseFloat(longitude)]
    : [48.8566, 2.3522]; // Paris default

  // Process events
  const processedEvents = useMemo(() => {
    return events
      .filter(e => isValidCoordinate(e.latitude, e.longitude))
      .map((event, index) => {
        const colors = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'];
        return {
          ...event,
          position: [parseFloat(event.latitude), parseFloat(event.longitude)],
          color: event.color || colors[index % colors.length],
          urgent: event.priority >= 8
        };
      });
  }, [events]);

  // Clustering
  const eventClusters = useMemo(() => {
    if (!showClusters || processedEvents.length < 3) return null;
    return clusterEvents(processedEvents, 500);
  }, [processedEvents, showClusters]);

  // Calculate smart route - Memoized to prevent infinite loop
  useEffect(() => {
    if (!enableSmartRouting || !hasValidPosition || processedEvents.length === 0) {
      setSmartRoute(null);
      return;
    }

    const start = [parseFloat(latitude), parseFloat(longitude)];
    const waypoints = processedEvents.slice(0, 5).map(e => e.position);
    const end = hasValidTarget 
      ? [parseFloat(targetLat), parseFloat(targetLng)]
      : waypoints[waypoints.length - 1];

    const route = calculateOptimalRoute(start, waypoints, end);
    const totalDistance = route.reduce((sum, point, idx) => {
      if (idx === 0) return 0;
      return sum + calculateDistance(
        route[idx - 1][0], route[idx - 1][1],
        point[0], point[1]
      );
    }, 0);

    setSmartRoute({
      path: route,
      distance: totalDistance,
      waypoints: processedEvents.slice(0, 5).map(e => ({ name: e.name, position: e.position }))
    });
  }, [latitude, longitude, targetLat, targetLng, events, hasValidPosition, hasValidTarget, enableSmartRouting]);

  // Calculate stats
  useEffect(() => {
    if (!processedEvents.length) {
      setMapStats(null);
      return;
    }

    const totalDistance = smartRoute?.distance || 0;
    const urgentEvents = processedEvents.filter(e => e.urgent).length;

    setMapStats({
      totalEvents: processedEvents.length,
      urgentEvents,
      totalDistance
    });
  }, [processedEvents, smartRoute]);

  // ETA prediction
  const eta = useMemo(() => {
    if (!smartRoute || !enablePredictions) return null;
    return predictETA(smartRoute.distance, 'driving', new Date(), trafficLevel);
  }, [smartRoute, trafficLevel, enablePredictions]);

  // Geolocation tracking
  const handleLocate = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: lat, longitude: lng } = position.coords;
          setUserPosition([lat, lng]);
          if (mapRef.current) {
            mapRef.current.flyTo([lat, lng], 16, { duration: 1.5 });
          }
        },
        (error) => console.warn('Géolocalisation non disponible:', error),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Toggle following mode
  const toggleFollowing = useCallback(() => {
    setFollowing(prev => !prev);
    if (!following) {
      handleLocate();
    }
  }, [following, handleLocate]);

  // Bounds for auto-fit
  const allPoints = useMemo(() => {
    const points = [];
    if (hasValidPosition) points.push([parseFloat(latitude), parseFloat(longitude)]);
    if (hasValidTarget) points.push([parseFloat(targetLat), parseFloat(targetLng)]);
    processedEvents.forEach(e => points.push(e.position));
    return points.length > 1 ? points : null;
  }, [latitude, longitude, targetLat, targetLng, processedEvents, hasValidPosition, hasValidTarget]);

  // Tile layers
  const getTileLayer = () => {
    switch (layerMode) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'dark':
        return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  const getTrafficColor = (level) => {
    switch (level) {
      case 'low': return '#10B981';
      case 'normal': return '#3B82F6';
      case 'high': return '#F59E0B';
      case 'heavy': return '#EF4444';
      default: return '#3B82F6';
    }
  };

  return (
    <div className={`${styles.smart_map_container} ${darkMode ? styles.dark : ''} ${className}`}>
      {/* Stats Panel - Moved outside map */}
      <SmartStatsPanel stats={mapStats} trafficLevel={trafficLevel} />

      {/* Control Panel */}
      <div className={styles.control_panel}>
        <button
          onClick={toggleFollowing}
          className={`${styles.control_btn} ${following ? styles.active : ''}`}
          title="Mode suivi"
        >
          <FiNavigation />
        </button>
        
        <button
          onClick={handleLocate}
          className={styles.control_btn}
          title="Ma position"
        >
          <FiCrosshair />
        </button>
        
        <button
          onClick={() => setLayerMode(prev => {
            const modes = ['standard', 'satellite', 'dark'];
            const idx = modes.indexOf(prev);
            return modes[(idx + 1) % modes.length];
          })}
          className={styles.control_btn}
          title="Changer la carte"
        >
          <FiLayers />
        </button>
        
        <button
          onClick={() => setShowClusters(prev => !prev)}
          className={`${styles.control_btn} ${showClusters ? styles.active : ''}`}
          title="Clustering"
        >
          <FiFilter />
        </button>
        
        <button
          onClick={() => setIsFullscreen(prev => !prev)}
          className={styles.control_btn}
          title="Plein écran"
        >
          {isFullscreen ? <FiMinimize2 /> : <FiMaximize2 />}
        </button>
      </div>

      {/* Map */}
      <div 
        className={styles.map_wrapper}
        style={{ height: isFullscreen ? '100vh' : height }}
      >
        <MapContainer
          ref={mapRef}
          center={center}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          zoomControl={false}
        >
          <TileLayer url={getTileLayer()} maxZoom={19} />
          
          <SmartMapController
            center={following && userPosition ? userPosition : center}
            zoom={13}
            bounds={allPoints}
            autoFit={!following}
            following={following}
            onMapReady={(map) => { mapRef.current = map; }}
          />

          {/* Smart Route */}
          {smartRoute && (
            <Polyline
              positions={smartRoute.path}
              pathOptions={{
                color: '#3B82F6',
                weight: 4,
                opacity: 0.8,
                dashArray: '10, 5',
                lineCap: 'round'
              }}
            />
          )}

          {/* Event Clusters or Individual Markers */}
          {showClusters && eventClusters ? (
            eventClusters.map((cluster, idx) => (
              <Marker
                key={`cluster-${idx}`}
                position={cluster.center}
                icon={createClusterIcon(cluster.events.length, cluster.color)}
              >
                <Popup>
                  <div className={styles.cluster_popup}>
                    <h4>{cluster.events.length} événements</h4>
                    {cluster.events.map((e, i) => (
                      <div key={i}>{e.name}</div>
                    ))}
                  </div>
                </Popup>
              </Marker>
            ))
          ) : (
            processedEvents.map((event, idx) => (
              <Marker
                key={`event-${idx}`}
                position={event.position}
                icon={createSmartEventIcon(event)}
                eventHandlers={{
                  click: () => setSelectedEvent(event)
                }}
              >
                <Tooltip>{event.name}</Tooltip>
              </Marker>
            ))
          )}

          {/* User Position */}
          {(userPosition || hasValidPosition) && (
            <Marker
              position={userPosition || center}
              icon={createSmartUserIcon(0)}
            >
              <Tooltip>Votre position</Tooltip>
            </Marker>
          )}

          {/* Target */}
          {hasValidTarget && (
            <Circle
              center={[parseFloat(targetLat), parseFloat(targetLng)]}
              radius={geoRadius}
              pathOptions={{
                color: '#EF4444',
                fillColor: '#FCA5A5',
                fillOpacity: 0.2,
                weight: 2
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Route Panel */}
      {smartRoute && (
        <SmartRoutePanel 
          route={smartRoute} 
          eta={eta} 
          confidence={eta?.confidence} 
        />
      )}

      {/* Selected Event Details */}
      {selectedEvent && (
        <div className={styles.event_details_panel}>
          <div className={styles.event_details_header}>
            <h3>{selectedEvent.name}</h3>
            <button onClick={() => setSelectedEvent(null)}>×</button>
          </div>
          <div className={styles.event_details_body}>
            <p><FiMapPin /> {selectedEvent.location || 'Emplacement'}</p>
            {selectedEvent.description && <p>{selectedEvent.description}</p>}
            {selectedEvent.urgent && (
              <div className={styles.urgent_badge}>
                <FiAlertCircle /> URGENT
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartMiniMap;
