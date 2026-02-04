/**
 * Hooks Custom pour CheckIn V2
 * Utilitaires réutilisables
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import * as faceapi from 'face-api.js';

/**
 * Hook pour la géolocalisation en temps-réel
 */
export const useRealTimeLocation = (onUpdate) => {
  const [location, setLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [error, setError] = useState(null);
  const watchIdRef = useRef(null);

  const startWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Géolocalisation non disponible');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setLocation(newLocation);
        setAccuracy(position.coords.accuracy);
        setError(null);
        onUpdate?.(newLocation);
      },
      (err) => {
        setError(err.message);
        console.error('Location error:', err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      }
    );
  }, [onUpdate]);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
  }, []);

  useEffect(() => {
    return () => stopWatch();
  }, [stopWatch]);

  return { location, accuracy, error, startWatch, stopWatch };
};

/**
 * Hook pour la détection faciale continue
 */
export const useFaceDetection = (videoRef, modelsLoaded, onDetect) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const animationRef = useRef(null);

  const startDetection = useCallback(async () => {
    if (!videoRef.current || !modelsLoaded) return;
    setIsDetecting(true);

    const detect = async () => {
      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.2
          }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        onDetect?.(detection);

        if (isDetecting) {
          animationRef.current = requestAnimationFrame(detect);
        }
      } catch (error) {
        console.error('Detection error:', error);
      }
    };

    detect();
  }, [videoRef, modelsLoaded, onDetect, isDetecting]);

  const stopDetection = useCallback(() => {
    setIsDetecting(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  return { isDetecting, startDetection, stopDetection };
};

/**
 * Hook pour le calcul de distance
 */
export const useDistance = (lat1, lon1, lat2, lon2) => {
  return useMemo(() => {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, [lat1, lon1, lat2, lon2]);
};

/**
 * Hook pour le debounce
 */
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook pour le throttle
 */
export const useThrottle = (value, delay) => {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRanRef = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRanRef.current >= delay) {
        setThrottledValue(value);
        lastRanRef.current = Date.now();
      }
    }, delay - (Date.now() - lastRanRef.current));

    return () => clearTimeout(handler);
  }, [value, delay]);

  return throttledValue;
};

/**
 * Hook pour le timeout
 */
export const useTimeout = (callback, delay) => {
  const savedCallbackRef = useRef();

  useEffect(() => {
    savedCallbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      savedCallbackRef.current();
    }
    if (delay !== null) {
      let id = setTimeout(tick, delay);
      return () => clearTimeout(id);
    }
  }, [delay]);
};

/**
 * Hook pour les retries API
 */
export const useRetry = (fn, options = {}) => {
  const { maxRetries = 3, delay = 1000 } = options;
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const retry = useCallback(async () => {
    setLoading(true);
    setError(null);

    for (let i = 0; i < maxRetries; i++) {
      try {
        setAttempt(i + 1);
        const result = await fn();
        setLoading(false);
        return result;
      } catch (err) {
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          setError(err);
          setLoading(false);
          throw err;
        }
      }
    }
  }, [fn, maxRetries, delay]);

  return { retry, attempt, error, loading };
};

/**
 * Hook pour le validation state machine
 */
export const useValidationState = () => {
  const [validations, setValidations] = useState({
    facial: { status: 'pending', message: 'En attente' },
    location: { status: 'pending', message: 'En attente' },
    device: { status: 'success', message: 'OK' }
  });

  const setValidation = useCallback((key, status, message) => {
    setValidations(prev => ({
      ...prev,
      [key]: { status, message }
    }));
  }, []);

  const isAllValid = useCallback(() => {
    return Object.values(validations).every(v => v.status === 'success');
  }, [validations]);

  const reset = useCallback(() => {
    setValidations({
      facial: { status: 'pending', message: 'En attente' },
      location: { status: 'pending', message: 'En attente' },
      device: { status: 'success', message: 'OK' }
    });
  }, []);

  return { validations, setValidation, isAllValid, reset };
};

export default {
  useRealTimeLocation,
  useFaceDetection,
  useDistance,
  useDebounce,
  useThrottle,
  useTimeout,
  useRetry,
  useValidationState
};
