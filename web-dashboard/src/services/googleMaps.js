import { searchAddress, reverseGeocode } from './geocoding';

/**
 * Chargeur dynamique simplifié pour l'API Google Maps
 * Évite les problèmes de dépendance npm @googlemaps/js-api-loader
 */
const API_KEY = 'AIzaSyAOVYRIgupAurZup5y1PRh8Ismb1A3lLao';
let isLoadingPromise = null;

const loadGoogleMaps = () => {
  if (window.google && window.google.maps) return Promise.resolve(window.google);
  if (isLoadingPromise) return isLoadingPromise;

  isLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('Google Maps API Loaded successfully');
      resolve(window.google);
    };
    script.onerror = (err) => {
      console.error('Google Maps API Load Error:', err);
      reject(err);
    };
    document.head.appendChild(script);
  });

  return isLoadingPromise;
};

let googleMaps = null;
let autocompleteService = null;
let placesService = null;
const sessionToken = { current: null };

/**
 * Initialise les services Google Maps
 */
export const initGoogleServices = async () => {
  if (googleMaps) return { autocompleteService, placesService, google: googleMaps };

  try {
    const google = await loadGoogleMaps();
    googleMaps = google;
    autocompleteService = new google.maps.places.AutocompleteService();
    sessionToken.current = new google.maps.places.AutocompleteSessionToken();

    // On a besoin d'un element div fantôme pour le PlacesService
    const dummyElement = document.createElement('div');
    placesService = new google.maps.places.PlacesService(dummyElement);

    return { autocompleteService, placesService, google };
  } catch (error) {
    console.error('Failed to initialize Google Services:', error);
    throw error;
  }
};

/**
 * Recherche d'adresses avec autocomplétion
 * Utilise OpenStreetMap Nominatim directement
 * Trouve: rues, avenues, cafés, restaurants, supermarchés, terrains, gares, stations, 
 * établissements publics, tous lieux au Maroc
 * @param {string} query - Texte de recherche
 * @returns {Promise<Array>} - Liste de suggestions avec placeId format 'osm|lat|lng'
 */
export const searchAddressGoogle = async (query) => {
  if (!query || query.length < 3) {
    return [];
  }

  try {
    console.log('[GoogleMaps] Using Nominatim for search');
    
    // Utilise directement Nominatim (gratuit, illimité)
    const fallbackResults = await searchAddress(query);
    
    return fallbackResults.map(r => {
      // Mapping des types pour icônes appropriées
      let types = ['address'];
      
      if (r.type === 'restaurant') {
        types = ['restaurant', 'food', 'cafe'];
      } else if (r.type === 'store') {
        types = ['store', 'supermarket', 'shopping_mall'];
      } else if (r.type === 'transit') {
        types = ['transit_station', 'train_station', 'bus_station'];
      } else if (r.type === 'sports') {
        types = ['stadium', 'sports_complex', 'gym'];
      } else if (r.type === 'public') {
        types = ['school', 'hospital', 'government'];
      } else if (r.type === 'establishment') {
        types = ['establishment', 'point_of_interest'];
      }

      return {
        displayName: r.displayName,
        placeId: `osm|${r.lat}|${r.lng}`, // Format OSM
        mainText: r.displayName.split(',')[0],
        secondaryText: r.displayName.split(',').slice(1).join(',').trim(),
        types: types,
        category: r.category,
        latitude: r.lat,
        longitude: r.lng
      };
    });
  } catch (error) {
    console.error('Address search error:', error);
    return [];
  }
};

/**
 * Récupère les coordonnées GPS détaillées d'un lieu
 * Utilise OpenStreetMap (format: osm|lat|lng)
 */
export const getPlaceDetails = async (placeId) => {
  if (!placeId) return null;

  // Format OSM: osm|lat|lng
  if (placeId.startsWith('osm|')) {
    const parts = placeId.split('|');
    const lat = parseFloat(parts[1]);
    const lng = parseFloat(parts[2]);

    if (isNaN(lat) || isNaN(lng)) {
      console.error('Invalid coordinates in PlaceID:', placeId);
      return null;
    }

    const details = await reverseGeocode(lat, lng);
    return {
      lat: lat,
      lng: lng,
      displayName: details?.displayName || 'Adresse inconnue',
      name: details?.displayName?.split(',')[0] || 'Lieu',
      addressComponents: []
    };
  }

  return null;
};

/**
 * Reverse Geocoding via OpenStreetMap/Nominatim
 * Fallback si besoin
 */
export const reverseGeocodeGoogle = async (lat, lng) => {
  try {
    const details = await reverseGeocode(lat, lng);
    return {
      displayName: details?.displayName || 'Adresse inconnue',
      placeId: `osm|${lat}|${lng}`
    };
  } catch (error) {
    console.error('Reverse Geocode error:', error);
    return null;
  }
};

export default {
  searchAddressGoogle,
  getPlaceDetails,
  reverseGeocodeGoogle,
  reverseGeocode: reverseGeocodeGoogle, // Alias pour compatibilité
  initGoogleServices
};
