import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { useState, useEffect, useRef } from 'react';

export const useNativeGPS = () => {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [watching, setWatching] = useState(false);
  const watchId = useRef(null);

  const isNative = Capacitor.isNativePlatform();

  const requestPermissions = async () => {
    if (isNative) {
      const permissions = await Geolocation.requestPermissions();
      return permissions.location === 'granted';
    }
    return true;
  };

  const getCurrentPosition = async () => {
    try {
      setError(null);
      
      if (isNative) {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000
        });
        
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp
        };
        
        setPosition(coords);
        return coords;
      } else {
        // Fallback web
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const coords = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                altitude: pos.coords.altitude,
                speed: pos.coords.speed,
                heading: pos.coords.heading,
                timestamp: pos.timestamp
              };
              setPosition(coords);
              resolve(coords);
            },
            reject,
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 5000
            }
          );
        });
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const startWatching = async (callback, options = {}) => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        throw new Error('Permission GPS refusée');
      }

      if (isNative) {
        const id = await Geolocation.watchPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: options.interval || 5000
        }, (position) => {
          if (position) {
            const coords = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              speed: position.coords.speed,
              heading: position.coords.heading,
              timestamp: position.timestamp
            };
            setPosition(coords);
            callback && callback(coords);
          }
        });
        
        watchId.current = id;
        setWatching(true);
        return id;
      } else {
        // Fallback web
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            const coords = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              altitude: pos.coords.altitude,
              speed: pos.coords.speed,
              heading: pos.coords.heading,
              timestamp: pos.timestamp
            };
            setPosition(coords);
            callback && callback(coords);
          },
          (err) => setError(err.message),
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: options.interval || 5000
          }
        );
        
        watchId.current = id;
        setWatching(true);
        return id;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const stopWatching = () => {
    if (watchId.current !== null) {
      if (isNative) {
        Geolocation.clearWatch({ id: watchId.current });
      } else {
        navigator.geolocation.clearWatch(watchId.current);
      }
      watchId.current = null;
      setWatching(false);
    }
  };

  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, []);

  return {
    position,
    error,
    watching,
    isNative,
    getCurrentPosition,
    startWatching,
    stopWatching,
    requestPermissions
  };
};