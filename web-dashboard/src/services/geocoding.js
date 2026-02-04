/**
 * Service de géocodage utilisant Nominatim (OpenStreetMap)
 * API gratuite - Respectez les conditions d'utilisation:
 * - Max 1 requête/seconde
 * - User-Agent requis
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Configuration pour limiter la recherche au Maroc
const MOROCCO_BOUNDING_BOX = '-17.1,21.3,0.0,36.0'; // [west, south, east, north]
const COUNTRY_CODE = 'ma';

// Cache local pour éviter les requêtes répétées
const geocodeCache = new Map();

/**
 * Géocode une adresse en coordonnées GPS
 * @param {string} address - L'adresse à géocoder
 * @returns {Promise<{lat: number, lng: number, displayName: string} | null>}
 */
export const geocodeAddress = async (address) => {
  if (!address || address.trim().length < 3) {
    return null;
  }

  // Vérifier le cache
  const cacheKey = address.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  try {
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      limit: '1',
      addressdetails: '1',
      countrycodes: COUNTRY_CODE,
      viewbox: MOROCCO_BOUNDING_BOX,
      bounded: '1'
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        'User-Agent': 'SecurityGuardManagement/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const result = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name,
        address: data[0].address
      };

      // Mettre en cache
      geocodeCache.set(cacheKey, result);
      return result;
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

/**
 * Géocode plusieurs adresses avec délai entre chaque requête
 * @param {Array<{id: string, address: string}>} items - Liste d'items avec adresse
 * @returns {Promise<Map<string, {lat: number, lng: number}>>}
 */
export const geocodeMultiple = async (items) => {
  const results = new Map();

  for (const item of items) {
    if (item.address) {
      const coords = await geocodeAddress(item.address);
      if (coords) {
        results.set(item.id, coords);
      }
      // Respecter la limite de 1 req/sec de Nominatim
      await new Promise(resolve => setTimeout(resolve, 1100));
    }
  }

  return results;
};

/**
 * Reverse geocoding - Coordonnées vers adresse
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{displayName: string, address: object} | null>}
 */
export const reverseGeocode = async (lat, lng) => {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: 'json',
      addressdetails: '1'
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params}`, {
      headers: {
        'User-Agent': 'SecurityGuardManagement/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.display_name) {
      return {
        displayName: data.display_name,
        address: data.address
      };
    }

    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
};

/**
 * Recherche d'adresses avec autocomplétion
 * Trouve: rues, avenues, cafés, restaurants, supermarchés, tous commerces, 
 * terrains de sport, gares, stations, établissements publics au Maroc
 * @param {string} query - Texte de recherche
 * @returns {Promise<Array<{displayName: string, lat: number, lng: number, type: string}>>}
 */
export const searchAddress = async (query) => {
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '10', // Plus de résultats pour plus de choix
      addressdetails: '1',
      countrycodes: COUNTRY_CODE,
      viewbox: MOROCCO_BOUNDING_BOX,
      bounded: '1', // Force la recherche dans le rectangle du Maroc
      dedupe: '1',
      // Recherche étendue: amenity, leisure, building pour tous types de lieux
      extratags: '1'
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        'User-Agent': 'SecurityGuardManagement/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Address search failed: ${response.status}`);
    }

    const data = await response.json();

    return data.map(item => {
      // Détection avancée du type de lieu pour icône appropriée
      let placeType = 'address';
      const osmType = item.type;
      const osmClass = item.class;
      
      // Cafés, restaurants, bars
      if (['cafe', 'restaurant', 'fast_food', 'bar', 'pub', 'food_court'].includes(osmType)) {
        placeType = 'restaurant';
      } 
      // Magasins, supermarchés, centres commerciaux
      else if (['supermarket', 'convenience', 'mall', 'shop', 'marketplace'].includes(osmType)) {
        placeType = 'store';
      }
      // Gares, stations (bus, train, métro, tramway)
      else if (['station', 'halt', 'subway_entrance', 'bus_station', 'tram_stop'].includes(osmType) || 
                osmClass === 'railway' || osmClass === 'highway') {
        placeType = 'transit';
      }
      // Terrains de sport, stades, piscines
      else if (['pitch', 'sports_centre', 'stadium', 'swimming_pool', 'track'].includes(osmType) ||
                osmClass === 'leisure') {
        placeType = 'sports';
      }
      // Établissements publics, écoles, hôpitaux, mosquées
      else if (['school', 'university', 'hospital', 'clinic', 'place_of_worship', 
                'police', 'fire_station', 'townhall', 'library', 'post_office'].includes(osmType)) {
        placeType = 'public';
      }
      // Établissements généraux
      else if (osmClass === 'amenity' || osmClass === 'shop' || osmClass === 'tourism' || osmClass === 'building') {
        placeType = 'establishment';
      }

      return {
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        address: item.address,
        type: placeType,
        category: osmType,
        class: osmClass
      };
    });
  } catch (error) {
    console.error('Address search error:', error);
    return [];
  }
};

export default {
  geocodeAddress,
  geocodeMultiple,
  reverseGeocode,
  searchAddress
};
