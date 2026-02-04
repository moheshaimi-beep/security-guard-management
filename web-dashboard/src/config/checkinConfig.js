/**
 * Configuration CheckIn V2
 */

export const CHECKIN_CONFIG = {
  // Model URL for face-api.js
  MODEL_URL: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights',
  
  // Facial recognition thresholds
  MIN_FACIAL_SCORE: 50, // Minimum match percentage required
  FACE_DETECTOR_OPTIONS: {
    inputSize: 320,
    scoreThreshold: 0.2
  },
  
  // Location settings
  MIN_GPS_ACCURACY: 100, // Meters
  LOCATION_TIMEOUT: 10000, // Milliseconds
  LOCATION_MAX_AGE: 0,
  
  // Auto-submit timing
  AUTO_SUBMIT_DELAY: 800, // Milliseconds
  
  // UI Timeouts
  SUCCESS_SCREEN_TIMEOUT: 5000,
  LOADING_TIMEOUT: 30000,
  
  // Camera settings
  CAMERA_WIDTH: { ideal: 1280 },
  CAMERA_HEIGHT: { ideal: 720 },
  
  // Animation timings (ms)
  ANIMATION_FAST: 200,
  ANIMATION_NORMAL: 300,
  ANIMATION_SLOW: 500,
  
  // Colors for validation states
  COLORS: {
    success: 'green',
    warning: 'yellow',
    error: 'red',
    loading: 'blue',
    pending: 'gray'
  },

  // Messages
  MESSAGES: {
    facial: {
      initializing: 'Initialisation de la caméra...',
      searching: 'Détection du visage en cours...',
      notDetected: 'Face non détectée',
      lowScore: 'Rapprochez-vous de la caméra',
      success: 'Visage reconnu!',
      error: 'Erreur de détection'
    },
    location: {
      initializing: 'Localisation en cours...',
      getting: 'Position en cours...',
      inZone: 'En zone de travail',
      outZone: 'Hors de la zone',
      error: 'Position non disponible',
      notAvailable: 'Géolocalisation non disponible'
    },
    device: {
      verified: 'Appareil vérifié'
    },
    checkin: {
      inProgress: 'Pointage en cours...',
      success: 'Pointage enregistré!',
      error: 'Erreur lors du pointage',
      autoSubmit: 'Auto-pointage en cours...'
    }
  }
};

export default CHECKIN_CONFIG;
