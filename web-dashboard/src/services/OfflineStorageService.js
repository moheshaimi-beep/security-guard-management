import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

class OfflineStorageService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.prefix = 'securityguard_';
  }

  async set(key, data) {
    const fullKey = this.prefix + key;
    const value = JSON.stringify({
      data,
      timestamp: Date.now(),
      version: '1.0'
    });

    if (this.isNative) {
      await Preferences.set({ key: fullKey, value });
    } else {
      localStorage.setItem(fullKey, value);
    }
  }

  async get(key) {
    const fullKey = this.prefix + key;
    
    try {
      let value;
      if (this.isNative) {
        const result = await Preferences.get({ key: fullKey });
        value = result.value;
      } else {
        value = localStorage.getItem(fullKey);
      }

      if (!value) return null;
      
      const parsed = JSON.parse(value);
      return parsed.data;
    } catch (error) {
      console.error(`Erreur lecture ${key}:`, error);
      return null;
    }
  }

  async remove(key) {
    const fullKey = this.prefix + key;
    
    if (this.isNative) {
      await Preferences.remove({ key: fullKey });
    } else {
      localStorage.removeItem(fullKey);
    }
  }

  async clear() {
    if (this.isNative) {
      await Preferences.clear();
    } else {
      // Effacer seulement nos clés
      Object.keys(localStorage)
        .filter(key => key.startsWith(this.prefix))
        .forEach(key => localStorage.removeItem(key));
    }
  }

  // Stockage positions hors ligne
  async storeOfflinePosition(position) {
    const positions = await this.get('offline_positions') || [];
    positions.push({
      ...position,
      timestamp: Date.now(),
      synced: false,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    
    // Garder seulement les 100 dernières positions
    if (positions.length > 100) {
      positions.splice(0, positions.length - 100);
    }
    
    await this.set('offline_positions', positions);
    console.log('📍 Position stockée hors ligne:', position);
  }

  async getOfflinePositions() {
    return await this.get('offline_positions') || [];
  }

  async syncOfflinePositions(websocket) {
    const positions = await this.getOfflinePositions();
    const unsyncedPositions = positions.filter(p => !p.synced);
    
    if (unsyncedPositions.length === 0) return;
    
    console.log(`🔄 Synchronisation ${unsyncedPositions.length} positions...`);
    
    for (const position of unsyncedPositions) {
      try {
        websocket.send(JSON.stringify({
          type: 'position_update',
          ...position
        }));
        
        // Marquer comme synchronisé
        position.synced = true;
        position.syncedAt = Date.now();
      } catch (error) {
        console.error('Erreur sync position:', error);
        break;
      }
    }
    
    // Sauvegarder positions mises à jour
    await this.set('offline_positions', positions);
    
    // Nettoyer positions synchronisées anciennes (> 24h)
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    const cleanedPositions = positions.filter(p => 
      !p.synced || p.timestamp > cutoff
    );
    
    await this.set('offline_positions', cleanedPositions);
  }

  // Cache événements pour offline
  async cacheEvents(events) {
    await this.set('cached_events', events);
  }

  async getCachedEvents() {
    return await this.get('cached_events') || [];
  }

  // Cache assignments pour offline
  async cacheAssignments(assignments) {
    await this.set('cached_assignments', assignments);
  }

  async getCachedAssignments() {
    return await this.get('cached_assignments') || [];
  }

  // Cache profil utilisateur
  async cacheUserProfile(profile) {
    await this.set('user_profile', profile);
  }

  async getCachedUserProfile() {
    return await this.get('user_profile');
  }

  // Préférences utilisateur
  async saveUserPreferences(preferences) {
    await this.set('user_preferences', preferences);
  }

  async getUserPreferences() {
    return await this.get('user_preferences') || {
      theme: 'light',
      notifications: true,
      gpsFrequency: 5000,
      language: 'fr',
      autoSync: true
    };
  }

  // Statistiques usage
  async trackUsage(event, data = {}) {
    const usage = await this.get('usage_stats') || [];
    usage.push({
      event,
      data,
      timestamp: Date.now()
    });
    
    // Garder seulement les 500 derniers événements
    if (usage.length > 500) {
      usage.splice(0, usage.length - 500);
    }
    
    await this.set('usage_stats', usage);
  }

  async getUsageStats() {
    return await this.get('usage_stats') || [];
  }
}

export const offlineStorage = new OfflineStorageService();
export default offlineStorage;