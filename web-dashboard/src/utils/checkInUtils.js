/**
 * Utilitaires pour CheckIn V2
 * Validations, calculs, conversions
 */

/**
 * Validation du score facial
 */
export const validateFacialScore = (score, minScore = 50) => {
  if (score >= minScore) return { valid: true, status: 'success' };
  if (score >= minScore - 10) return { valid: false, status: 'warning' };
  return { valid: false, status: 'error' };
};

/**
 * Validation de la position GPS
 */
export const validateGPSPosition = (distance, radius, tolerance = 1.5) => {
  const allowedDistance = radius * tolerance;
  
  if (distance <= radius) {
    return { valid: true, status: 'success', distance };
  }
  if (distance <= allowedDistance) {
    return { valid: true, status: 'warning', distance };
  }
  return { valid: false, status: 'error', distance };
};

/**
 * Calcul de distance Haversine (Lat/Lon → Mètres)
 */
export const calculateDistanceHaversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Rayon Earth en mètres
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Format distance pour affichage
 */
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
};

/**
 * Format accuracy pour affichage
 */
export const formatAccuracy = (meters) => {
  return `±${Math.round(meters)}m`;
};

/**
 * Format coordonnées GPS
 */
export const formatCoordinates = (lat, lon, precision = 6) => {
  return {
    latitude: lat.toFixed(precision),
    longitude: lon.toFixed(precision),
    display: `${lat.toFixed(precision)}, ${lon.toFixed(precision)}`
  };
};

/**
 * Format time pour affichage
 */
export const formatTime = (date) => {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * Format date pour affichage
 */
export const formatDate = (date) => {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Validation du device fingerprint
 */
export const validateDeviceFingerprint = (fingerprint) => {
  if (!fingerprint || fingerprint.length < 10) {
    return { valid: false, error: 'Device fingerprint invalide' };
  }
  return { valid: true };
};

/**
 * Conversion base64 → Blob
 */
export const base64ToBlob = (base64Data, contentType = 'image/jpeg') => {
  const byteCharacters = atob(base64Data.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
};

/**
 * Validation check-in payload
 */
export const validateCheckInPayload = (payload) => {
  const errors = [];

  if (!payload.latitude || !payload.longitude) {
    errors.push('Position manquante');
  }

  if (payload.facialVerified === undefined) {
    errors.push('Vérification faciale manquante');
  }

  if (!payload.deviceFingerprint) {
    errors.push('Fingerprint appareil manquant');
  }

  if (!payload.eventId) {
    errors.push('Événement manquant');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Génère un ID de session unique
 */
export const generateSessionId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Retry avec exponential backoff
 */
export const retryWithBackoff = async (fn, maxRetries = 3, initialDelay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

/**
 * Debounce function
 */
export const debounce = (func, delay) => {
  let timeoutId;
  
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Throttle function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  
  return (...args) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Check si position est en zone
 */
export const isPositionInZone = (userLat, userLon, eventLat, eventLon, radius) => {
  const distance = calculateDistanceHaversine(userLat, userLon, eventLat, eventLon);
  return distance <= radius;
};

/**
 * Format message d'erreur API
 */
export const formatErrorMessage = (error) => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return 'Une erreur est survenue';
};

/**
 * Validation du score de match facial
 */
export const getFacialScoreStatus = (score) => {
  if (score >= 80) return { status: 'excellent', label: 'Excellent' };
  if (score >= 60) return { status: 'good', label: 'Bon' };
  if (score >= 50) return { status: 'acceptable', label: 'Acceptable' };
  if (score >= 30) return { status: 'low', label: 'Faible' };
  return { status: 'poor', label: 'Très faible' };
};

export default {
  validateFacialScore,
  validateGPSPosition,
  calculateDistanceHaversine,
  formatDistance,
  formatAccuracy,
  formatCoordinates,
  formatTime,
  formatDate,
  validateDeviceFingerprint,
  base64ToBlob,
  validateCheckInPayload,
  generateSessionId,
  retryWithBackoff,
  debounce,
  throttle,
  isPositionInZone,
  formatErrorMessage,
  getFacialScoreStatus
};
