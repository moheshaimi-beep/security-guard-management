import React, { useState, useEffect } from 'react';
import { FiSun, FiCloud, FiCloudRain, FiCloudSnow, FiWind, FiDroplet, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

/**
 * Widget météo utilisant Open-Meteo API (gratuit, sans clé API)
 * Affiche la météo actuelle et les alertes pour les événements extérieurs
 */
const WeatherWidget = ({ latitude, longitude, eventName, compact = false }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Codes météo WMO
  const weatherCodes = {
    0: { label: 'Ciel dégagé', icon: '☀️', severity: 'good' },
    1: { label: 'Principalement dégagé', icon: '🌤️', severity: 'good' },
    2: { label: 'Partiellement nuageux', icon: '⛅', severity: 'good' },
    3: { label: 'Couvert', icon: '☁️', severity: 'moderate' },
    45: { label: 'Brouillard', icon: '🌫️', severity: 'warning' },
    48: { label: 'Brouillard givrant', icon: '🌫️', severity: 'warning' },
    51: { label: 'Bruine légère', icon: '🌧️', severity: 'moderate' },
    53: { label: 'Bruine modérée', icon: '🌧️', severity: 'moderate' },
    55: { label: 'Bruine dense', icon: '🌧️', severity: 'warning' },
    61: { label: 'Pluie légère', icon: '🌧️', severity: 'moderate' },
    63: { label: 'Pluie modérée', icon: '🌧️', severity: 'warning' },
    65: { label: 'Pluie forte', icon: '🌧️', severity: 'danger' },
    71: { label: 'Neige légère', icon: '🌨️', severity: 'warning' },
    73: { label: 'Neige modérée', icon: '🌨️', severity: 'warning' },
    75: { label: 'Neige forte', icon: '❄️', severity: 'danger' },
    77: { label: 'Grains de neige', icon: '🌨️', severity: 'warning' },
    80: { label: 'Averses légères', icon: '🌦️', severity: 'moderate' },
    81: { label: 'Averses modérées', icon: '🌦️', severity: 'warning' },
    82: { label: 'Averses violentes', icon: '⛈️', severity: 'danger' },
    85: { label: 'Averses de neige', icon: '🌨️', severity: 'warning' },
    86: { label: 'Averses de neige fortes', icon: '❄️', severity: 'danger' },
    95: { label: 'Orage', icon: '⛈️', severity: 'danger' },
    96: { label: 'Orage avec grêle', icon: '⛈️', severity: 'danger' },
    99: { label: 'Orage violent', icon: '⛈️', severity: 'danger' }
  };

  const fetchWeather = async () => {
    if (!latitude || !longitude) {
      setError('Position GPS non disponible');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3`
      );

      if (!response.ok) throw new Error('Erreur API météo');

      const data = await response.json();
      setWeather({
        current: {
          temperature: Math.round(data.current.temperature_2m),
          feelsLike: Math.round(data.current.apparent_temperature),
          humidity: data.current.relative_humidity_2m,
          weatherCode: data.current.weather_code,
          windSpeed: Math.round(data.current.wind_speed_10m),
          windGusts: Math.round(data.current.wind_gusts_10m)
        },
        daily: data.daily ? data.daily.time.map((date, i) => ({
          date,
          weatherCode: data.daily.weather_code[i],
          tempMax: Math.round(data.daily.temperature_2m_max[i]),
          tempMin: Math.round(data.daily.temperature_2m_min[i]),
          precipProb: data.daily.precipitation_probability_max[i]
        })) : []
      });
      setError(null);
    } catch (err) {
      console.error('Erreur météo:', err);
      setError('Impossible de charger la météo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    // Rafraîchir toutes les 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [latitude, longitude]);

  const getWeatherInfo = (code) => {
    return weatherCodes[code] || { label: 'Inconnu', icon: '❓', severity: 'moderate' };
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'good': return 'text-green-600 bg-green-50';
      case 'moderate': return 'text-blue-600 bg-blue-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'danger': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getAlertMessage = () => {
    if (!weather) return null;

    const info = getWeatherInfo(weather.current.weatherCode);
    const alerts = [];

    if (info.severity === 'danger') {
      alerts.push(`⚠️ Conditions météo dangereuses: ${info.label}`);
    }
    if (weather.current.windSpeed > 50) {
      alerts.push(`💨 Vent fort: ${weather.current.windSpeed} km/h`);
    }
    if (weather.current.windGusts > 70) {
      alerts.push(`🌪️ Rafales violentes: ${weather.current.windGusts} km/h`);
    }
    if (weather.current.temperature < 0) {
      alerts.push(`❄️ Température négative: ${weather.current.temperature}°C`);
    }
    if (weather.current.temperature > 35) {
      alerts.push(`🔥 Canicule: ${weather.current.temperature}°C`);
    }

    return alerts.length > 0 ? alerts : null;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-4 ${compact ? '' : 'min-h-[120px]'}`}>
        <div className="flex items-center justify-center h-full">
          <FiRefreshCw className="animate-spin text-gray-400" size={24} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center text-gray-500">
          <FiCloud className="mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  const weatherInfo = getWeatherInfo(weather?.current.weatherCode);
  const alerts = getAlertMessage();

  // Version compacte
  if (compact) {
    return (
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${getSeverityColor(weatherInfo.severity)}`}>
        <span className="text-2xl">{weatherInfo.icon}</span>
        <div>
          <span className="font-bold">{weather.current.temperature}°C</span>
          <span className="text-sm ml-1">{weatherInfo.label}</span>
        </div>
      </div>
    );
  }

  // Version complète
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* Header */}
      <div className={`p-4 ${getSeverityColor(weatherInfo.severity)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-4xl mr-3">{weatherInfo.icon}</span>
            <div>
              <div className="text-2xl md:text-3xl lg:text-4xl font-bold">{weather.current.temperature}°C</div>
              <div className="text-sm opacity-80">Ressenti {weather.current.feelsLike}°C</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-medium">{weatherInfo.label}</div>
            {eventName && <div className="text-sm opacity-80">{eventName}</div>}
          </div>
        </div>
      </div>

      {/* Alertes */}
      {alerts && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100">
          {alerts.map((alert, i) => (
            <div key={i} className="flex items-center text-red-700 text-sm">
              <FiAlertTriangle className="mr-2 flex-shrink-0" />
              <span>{alert}</span>
            </div>
          ))}
        </div>
      )}

      {/* Détails */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
        <div>
          <FiWind className="mx-auto text-gray-400 mb-1" />
          <div className="font-medium">{weather.current.windSpeed} km/h</div>
          <div className="text-xs text-gray-500">Vent</div>
        </div>
        <div>
          <FiDroplet className="mx-auto text-blue-400 mb-1" />
          <div className="font-medium">{weather.current.humidity}%</div>
          <div className="text-xs text-gray-500">Humidité</div>
        </div>
        <div>
          <FiWind className="mx-auto text-orange-400 mb-1" />
          <div className="font-medium">{weather.current.windGusts} km/h</div>
          <div className="text-xs text-gray-500">Rafales</div>
        </div>
      </div>

      {/* Prévisions 3 jours */}
      {weather.daily.length > 0 && (
        <div className="px-4 pb-4">
          <div className="text-xs font-medium text-gray-500 mb-2">PRÉVISIONS</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
            {weather.daily.slice(0, 3).map((day, i) => {
              const dayInfo = getWeatherInfo(day.weatherCode);
              const dayName = i === 0 ? "Auj." : new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short' });
              return (
                <div key={day.date} className="text-center p-2 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500">{dayName}</div>
                  <div className="text-xl my-1">{dayInfo.icon}</div>
                  <div className="text-sm">
                    <span className="font-medium">{day.tempMax}°</span>
                    <span className="text-gray-400 ml-1">{day.tempMin}°</span>
                  </div>
                  {day.precipProb > 30 && (
                    <div className="text-xs text-blue-500">💧 {day.precipProb}%</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bouton rafraîchir */}
      <div className="px-4 pb-3 flex justify-end">
        <button
          onClick={fetchWeather}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center"
        >
          <FiRefreshCw className="mr-1" size={12} />
          Actualiser
        </button>
      </div>
    </div>
  );
};

export default WeatherWidget;
