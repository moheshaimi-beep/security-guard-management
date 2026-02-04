/**
 * React Hook for i18n
 */

import { useState, useEffect, useCallback } from 'react';
import i18n from '../services/i18n';

export const useI18n = () => {
  const [language, setLanguage] = useState(i18n.getLanguage());
  const [direction, setDirection] = useState(i18n.getDirection());

  useEffect(() => {
    const unsubscribe = i18n.subscribe((newLang) => {
      setLanguage(newLang);
      setDirection(i18n.getDirection());
    });

    return unsubscribe;
  }, []);

  const t = useCallback((key, params) => {
    return i18n.t(key, params);
  }, [language]);

  const changeLanguage = useCallback((code) => {
    return i18n.setLanguage(code);
  }, []);

  const getLanguages = useCallback(() => {
    return i18n.getLanguages();
  }, []);

  return {
    t,
    language,
    direction,
    changeLanguage,
    getLanguages,
    isRTL: direction === 'rtl',
  };
};

export default useI18n;
