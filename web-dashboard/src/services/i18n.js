/**
 * Internationalization Service
 * Multi-language support: French, English, Arabic
 */

// Translations
const translations = {
  fr: {
    // Login page
    login: {
      title: 'Security Guard Management',
      subtitle: 'Connectez-vous à votre compte',
      email: 'Email',
      emailPlaceholder: 'votre@email.com',
      password: 'Mot de passe',
      passwordPlaceholder: '••••••••',
      rememberMe: 'Se souvenir de moi',
      forgotPassword: 'Mot de passe oublié ?',
      submit: 'Se connecter',
      loading: 'Connexion...',
      demoAccount: 'Compte de démonstration',
      error: {
        invalidCredentials: 'Email ou mot de passe incorrect',
        serverError: 'Erreur serveur, veuillez réessayer',
        networkError: 'Erreur de connexion au serveur',
      },
    },
    // Dashboard
    dashboard: {
      title: 'Tableau de bord',
      welcome: 'Bienvenue',
      overview: 'Vue d\'ensemble',
      activeAgents: 'Agents actifs',
      todayAttendance: 'Présences aujourd\'hui',
      activeEvents: 'Événements actifs',
      incidents: 'Incidents',
      recentActivity: 'Activité récente',
      map: 'Carte en temps réel',
      liveTracking: 'Suivi en direct',
    },
    // Events
    events: {
      title: 'Événements',
      upcoming: 'À venir',
      ongoing: 'En cours',
      completed: 'Terminés',
      startsIn: 'Commence dans',
      endsIn: 'Se termine dans',
      started: 'Commencé il y a',
      ended: 'Terminé',
      agents: 'Agents',
      location: 'Lieu',
      time: 'Horaire',
      days: 'jours',
      hours: 'heures',
      minutes: 'minutes',
      seconds: 'secondes',
    },
    // Common
    common: {
      search: 'Rechercher',
      filter: 'Filtrer',
      export: 'Exporter',
      add: 'Ajouter',
      edit: 'Modifier',
      delete: 'Supprimer',
      save: 'Enregistrer',
      cancel: 'Annuler',
      confirm: 'Confirmer',
      yes: 'Oui',
      no: 'Non',
      loading: 'Chargement...',
      noData: 'Aucune donnée',
      success: 'Succès',
      error: 'Erreur',
      language: 'Langue',
    },
    // Map
    map: {
      title: 'Carte des agents',
      agents: 'Agents',
      events: 'Événements',
      zones: 'Zones',
      lastUpdate: 'Dernière mise à jour',
      online: 'En ligne',
      offline: 'Hors ligne',
      tracking: 'Suivi GPS',
      satellite: 'Satellite',
      terrain: 'Terrain',
      heatmap: 'Carte de chaleur',
      clusters: 'Regroupement',
      geofence: 'Zone de géofencing',
      distance: 'Distance',
      accuracy: 'Précision',
    },
  },

  en: {
    // Login page
    login: {
      title: 'Security Guard Management',
      subtitle: 'Sign in to your account',
      email: 'Email',
      emailPlaceholder: 'your@email.com',
      password: 'Password',
      passwordPlaceholder: '••••••••',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot password?',
      submit: 'Sign in',
      loading: 'Signing in...',
      demoAccount: 'Demo account',
      error: {
        invalidCredentials: 'Invalid email or password',
        serverError: 'Server error, please try again',
        networkError: 'Connection error to server',
      },
    },
    // Dashboard
    dashboard: {
      title: 'Dashboard',
      welcome: 'Welcome',
      overview: 'Overview',
      activeAgents: 'Active Agents',
      todayAttendance: 'Today\'s Attendance',
      activeEvents: 'Active Events',
      incidents: 'Incidents',
      recentActivity: 'Recent Activity',
      map: 'Real-time Map',
      liveTracking: 'Live Tracking',
    },
    // Events
    events: {
      title: 'Events',
      upcoming: 'Upcoming',
      ongoing: 'Ongoing',
      completed: 'Completed',
      startsIn: 'Starts in',
      endsIn: 'Ends in',
      started: 'Started',
      ended: 'Ended',
      agents: 'Agents',
      location: 'Location',
      time: 'Time',
      days: 'days',
      hours: 'hours',
      minutes: 'minutes',
      seconds: 'seconds',
    },
    // Common
    common: {
      search: 'Search',
      filter: 'Filter',
      export: 'Export',
      add: 'Add',
      edit: 'Edit',
      delete: 'Delete',
      save: 'Save',
      cancel: 'Cancel',
      confirm: 'Confirm',
      yes: 'Yes',
      no: 'No',
      loading: 'Loading...',
      noData: 'No data',
      success: 'Success',
      error: 'Error',
      language: 'Language',
    },
    // Map
    map: {
      title: 'Agents Map',
      agents: 'Agents',
      events: 'Events',
      zones: 'Zones',
      lastUpdate: 'Last update',
      online: 'Online',
      offline: 'Offline',
      tracking: 'GPS Tracking',
      satellite: 'Satellite',
      terrain: 'Terrain',
      heatmap: 'Heatmap',
      clusters: 'Clusters',
      geofence: 'Geofence Zone',
      distance: 'Distance',
      accuracy: 'Accuracy',
    },
  },

  ar: {
    // Login page
    login: {
      title: 'إدارة حراس الأمن',
      subtitle: 'تسجيل الدخول إلى حسابك',
      email: 'البريد الإلكتروني',
      emailPlaceholder: 'بريدك@example.com',
      password: 'كلمة المرور',
      passwordPlaceholder: '••••••••',
      rememberMe: 'تذكرني',
      forgotPassword: 'نسيت كلمة المرور؟',
      submit: 'تسجيل الدخول',
      loading: 'جاري التسجيل...',
      demoAccount: 'حساب تجريبي',
      error: {
        invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        serverError: 'خطأ في الخادم، يرجى المحاولة مرة أخرى',
        networkError: 'خطأ في الاتصال بالخادم',
      },
    },
    // Dashboard
    dashboard: {
      title: 'لوحة التحكم',
      welcome: 'مرحباً',
      overview: 'نظرة عامة',
      activeAgents: 'العملاء النشطون',
      todayAttendance: 'حضور اليوم',
      activeEvents: 'الأحداث النشطة',
      incidents: 'الحوادث',
      recentActivity: 'النشاط الأخير',
      map: 'خريطة مباشرة',
      liveTracking: 'التتبع المباشر',
    },
    // Events
    events: {
      title: 'الأحداث',
      upcoming: 'قادمة',
      ongoing: 'جارية',
      completed: 'مكتملة',
      startsIn: 'يبدأ في',
      endsIn: 'ينتهي في',
      started: 'بدأ منذ',
      ended: 'انتهى',
      agents: 'العملاء',
      location: 'الموقع',
      time: 'الوقت',
      days: 'أيام',
      hours: 'ساعات',
      minutes: 'دقائق',
      seconds: 'ثواني',
    },
    // Common
    common: {
      search: 'بحث',
      filter: 'تصفية',
      export: 'تصدير',
      add: 'إضافة',
      edit: 'تعديل',
      delete: 'حذف',
      save: 'حفظ',
      cancel: 'إلغاء',
      confirm: 'تأكيد',
      yes: 'نعم',
      no: 'لا',
      loading: 'جاري التحميل...',
      noData: 'لا توجد بيانات',
      success: 'نجاح',
      error: 'خطأ',
      language: 'اللغة',
    },
    // Map
    map: {
      title: 'خريطة العملاء',
      agents: 'العملاء',
      events: 'الأحداث',
      zones: 'المناطق',
      lastUpdate: 'آخر تحديث',
      online: 'متصل',
      offline: 'غير متصل',
      tracking: 'تتبع GPS',
      satellite: 'القمر الصناعي',
      terrain: 'التضاريس',
      heatmap: 'خريطة حرارية',
      clusters: 'التجميع',
      geofence: 'منطقة السياج الجغرافي',
      distance: 'المسافة',
      accuracy: 'الدقة',
    },
  },
};

// Language metadata
const languages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
];

// Get stored language or default
const getStoredLanguage = () => {
  const stored = localStorage.getItem('language');
  return stored && translations[stored] ? stored : 'fr';
};

// i18n service
class I18nService {
  constructor() {
    this.currentLanguage = getStoredLanguage();
    this.listeners = [];
  }

  // Get current language
  getLanguage() {
    return this.currentLanguage;
  }

  // Get all available languages
  getLanguages() {
    return languages;
  }

  // Set language
  setLanguage(code) {
    if (translations[code]) {
      this.currentLanguage = code;
      localStorage.setItem('language', code);

      // Update document direction for RTL languages
      document.documentElement.dir = this.getDirection();
      document.documentElement.lang = code;

      // Notify listeners
      this.listeners.forEach(listener => listener(code));

      return true;
    }
    return false;
  }

  // Get text direction
  getDirection() {
    const lang = languages.find(l => l.code === this.currentLanguage);
    return lang?.dir || 'ltr';
  }

  // Translate a key (supports nested keys like 'login.title')
  t(key, params = {}) {
    const keys = key.split('.');
    let value = translations[this.currentLanguage];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to French
        value = translations.fr;
        for (const fk of keys) {
          if (value && typeof value === 'object' && fk in value) {
            value = value[fk];
          } else {
            return key; // Return key if translation not found
          }
        }
        break;
      }
    }

    // Replace parameters
    if (typeof value === 'string') {
      Object.keys(params).forEach(param => {
        value = value.replace(`{${param}}`, params[param]);
      });
    }

    return value || key;
  }

  // Subscribe to language changes
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

// Singleton instance
const i18n = new I18nService();

// Initialize direction
document.documentElement.dir = i18n.getDirection();
document.documentElement.lang = i18n.getLanguage();

export default i18n;
export { translations, languages };
