import React, { useState, useEffect, useRef } from 'react';
import { FiMapPin, FiSearch, FiX, FiLoader, FiCheck, FiNavigation, FiHome, FiShoppingCart, FiCoffee, FiMapPin as FiTrain } from 'react-icons/fi';
import { searchAddressGoogle, getPlaceDetails } from '../services/googleMaps';
import { reverseGeocode } from '../services/geocoding';

/**
 * Composant d'autocomplétion d'adresse utilisant OpenStreetMap Nominatim
 * Restreint au Maroc pour une précision maximale
 * Supporte: rues, avenues, cafés, restaurants, supermarchés, terrains de sport,
 * gares, stations, établissements publics, tous commerces et lieux
 */
const AddressAutocomplete = ({
  value = '',
  onChange,
  onCoordinatesChange,
  placeholder = 'Rechercher une adresse sur Google Maps...',
  label = 'Adresse',
  required = false,
  className = '',
  initialCoordinates = null
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState(initialCoordinates);
  const [isGeocoded, setIsGeocoded] = useState(!!initialCoordinates);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  // Fermer les suggestions au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync avec la valeur externe
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  // Recherche avec debounce pour Google Places
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsGeocoded(false);
    setSelectedCoords(null);
    onChange?.(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (newValue.length >= 3) {
      debounceRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const results = await searchAddressGoogle(newValue);
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        } catch (error) {
          console.error('Google Search error:', error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      }, 400); // 400ms pour plus de réactivité avec Google
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Sélection d'une suggestion Google
  const handleSelectSuggestion = async (suggestion) => {
    setInputValue(suggestion.mainText);
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      // Récupérer les coordonnées GPS précises via le Place ID
      const details = await getPlaceDetails(suggestion.placeId);

      if (details) {
        setInputValue(details.displayName);
        setSelectedCoords({ lat: details.lat, lng: details.lng });
        setIsGeocoded(true);
        setSuggestions([]);

        onChange?.(details.displayName);
        onCoordinatesChange?.({
          latitude: details.lat,
          longitude: details.lng,
          address: details.displayName,
          placeId: suggestion.placeId
        });
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Effacer l'adresse
  const handleClear = () => {
    setInputValue('');
    setSelectedCoords(null);
    setIsGeocoded(false);
    setSuggestions([]);
    setShowSuggestions(false);
    onChange?.('');
    onCoordinatesChange?.(null);
  };

  // Utiliser la position GPS de l'appareil
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setIsLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Reverse geocoding pour obtenir l'adresse
          const result = await reverseGeocode(latitude, longitude);
          const addressText = result?.displayName || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          
          setInputValue(addressText);
          setSelectedCoords({ lat: latitude, lng: longitude });
          setIsGeocoded(true);

          onChange?.(addressText);
          onCoordinatesChange?.({
            latitude,
            longitude,
            address: addressText
          });
        } catch (error) {
          console.error('Erreur reverse geocoding:', error);
          // Utiliser les coordonnées même sans adresse
          const coordsStr = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setInputValue(coordsStr);
          setSelectedCoords({ lat: latitude, lng: longitude });
          setIsGeocoded(true);

          onChange?.(coordsStr);
          onCoordinatesChange?.({
            latitude,
            longitude,
            address: coordsStr
          });
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        console.error('Erreur géolocalisation:', error);
        alert('Impossible d\'obtenir votre position. Veuillez vérifier les permissions.');
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Récupération de l'icône selon le type de lieu
  const getPlaceIcon = (types = []) => {
    // Cafés, restaurants, bars
    if (types.includes('restaurant') || types.includes('food') || types.includes('cafe')) {
      return FiCoffee;
    }
    // Magasins, supermarchés, centres commerciaux
    if (types.includes('store') || types.includes('shopping_mall') || types.includes('supermarket')) {
      return FiShoppingCart;
    }
    // Gares, stations de bus/train/métro
    if (types.includes('transit_station') || types.includes('train_station') || types.includes('bus_station')) {
      return FiTrain;
    }
    // Terrains de sport, stades, gymnases
    if (types.includes('stadium') || types.includes('sports_complex') || types.includes('gym')) {
      return FiHome; // Utilise Home pour sport (pas d'icône dédiée dans feather)
    }
    // Établissements publics (écoles, hôpitaux, gouvernement)
    if (types.includes('school') || types.includes('hospital') || types.includes('government')) {
      return FiHome;
    }
    // Établissements généraux
    if (types.includes('establishment') || types.includes('point_of_interest')) {
      return FiHome;
    }
    // Adresses par défaut
    return FiMapPin;
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          {/* Bouton utiliser ma position */}
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Utiliser ma position GPS"
          >
            <FiNavigation className="w-3.5 h-3.5" />
            Ma position
          </button>
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FiMapPin className={`${isGeocoded ? 'text-blue-500' : 'text-gray-400'}`} />
        </div>

        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          required={required}
          className={`
            block w-full pl-10 pr-12 py-2.5
            border border-gray-300 rounded-xl
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition-all duration-200
            ${isGeocoded ? 'bg-blue-50/50 border-blue-200 shadow-inner' : 'bg-white shadow-sm'}
          `}
        />

        <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1">
          {isLoading && (
            <FiLoader className="w-5 h-5 text-blue-500 animate-spin" />
          )}

          {isGeocoded && !isLoading && (
            <span className="flex items-center text-blue-600 bg-blue-100 p-1 rounded-full">
              <FiCheck className="w-3.5 h-3.5" />
            </span>
          )}

          {inputValue && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title="Effacer"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Suggestions dropdown (Google Style) */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-[1001] w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-200 ease-out origin-top border-t-0 animate-in fade-in slide-in-from-top-2">
          {suggestions.map((suggestion, index) => {
            const PlaceIcon = getPlaceIcon(suggestion.types);
            return (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className="w-full px-4 py-3.5 text-left hover:bg-blue-50 border-b border-gray-50 last:border-b-0 flex items-start group transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-gray-50 group-hover:bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0 transition-all group-hover:scale-110">
                  <PlaceIcon className="w-4.5 h-4.5 text-gray-400 group-hover:text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-800 truncate">
                    {suggestion.mainText}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5 group-hover:text-blue-600/70">
                    {suggestion.secondaryText}
                  </p>
                </div>
              </button>
            );
          })}
          <div className="bg-gray-50 px-4 py-2 flex items-center justify-end">
            <img
              src="https://developers.google.com/static/maps/images/powered_by_google_on_white.png"
              alt="Powered by Google"
              className="h-3"
            />
          </div>
        </div>
      )}

      {/* Coordonnées affichées */}
      {selectedCoords && selectedCoords.lat != null && selectedCoords.lng != null && (
        <div className="mt-2 flex items-center text-[10px] uppercase tracking-wider font-bold text-gray-400 px-1">
          <FiMapPin className="mr-1 text-blue-500" size={10} />
          <span>
            GPS: {Number(selectedCoords.lat).toFixed(6)} , {Number(selectedCoords.lng).toFixed(6)}
          </span>
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
