import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

class NotificationService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.initialized = false;
  }

  async initialize() {
    if (!this.isNative) return;
    
    try {
      const permissions = await LocalNotifications.requestPermissions();
      this.initialized = permissions.display === 'granted';
      
      // Écouter clics sur notifications
      LocalNotifications.addListener('localNotificationReceived', (notification) => {
        console.log('Notification reçue:', notification);
      });
      
      LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        console.log('Action notification:', notification);
        // Rediriger vers page spécifique selon le type
        this.handleNotificationAction(notification);
      });
      
      console.log('🔔 Service notifications initialisé');
    } catch (error) {
      console.error('Erreur init notifications:', error);
    }
  }

  handleNotificationAction(notification) {
    const { id, actionId, inputValue } = notification;
    
    switch (actionId) {
      case 'view_agent':
        // Ouvrir page agent
        window.location.hash = `#/agent/${notification.extra?.agentId}`;
        break;
      case 'view_map':
        // Ouvrir carte
        window.location.hash = '#/tracking';
        break;
      default:
        // Action par défaut
        window.location.hash = '#/dashboard';
    }
  }

  async notifyAgentOffline(agent) {
    if (!this.initialized) return;
    
    await LocalNotifications.schedule({
      notifications: [{
        title: '🔴 Agent déconnecté',
        body: `${agent.firstName} ${agent.lastName} ne répond plus depuis 5 minutes`,
        id: `offline_${agent.id}_${Date.now()}`,
        iconColor: '#EF4444',
        sound: 'alert.wav',
        attachments: [{ id: 'agent_icon', url: 'assets/icons/agent-offline.png' }],
        actions: [
          { id: 'view_agent', title: 'Voir Agent' },
          { id: 'call', title: 'Appeler' }
        ],
        extra: { agentId: agent.id, type: 'offline' }
      }]
    });
  }

  async notifyAgentOutOfZone(agent, zone) {
    if (!this.initialized) return;
    
    await LocalNotifications.schedule({
      notifications: [{
        title: '⚠️ Agent hors zone',
        body: `${agent.firstName} ${agent.lastName} a quitté la zone: ${zone.name}`,
        id: `outzone_${agent.id}_${Date.now()}`,
        iconColor: '#F59E0B',
        sound: 'warning.wav',
        actions: [
          { id: 'view_map', title: 'Voir Carte' },
          { id: 'contact', title: 'Contacter' }
        ],
        extra: { agentId: agent.id, zoneId: zone.id, type: 'outzone' }
      }]
    });
  }

  async notifyNewAssignment(agent, event) {
    if (!this.initialized) return;
    
    await LocalNotifications.schedule({
      notifications: [{
        title: '📋 Nouvelle mission',
        body: `${agent.firstName}, vous êtes assigné à: ${event.name}`,
        id: `assignment_${agent.id}_${Date.now()}`,
        iconColor: '#10B981',
        sound: 'notification.wav',
        actions: [
          { id: 'accept', title: 'Accepter' },
          { id: 'view_details', title: 'Détails' }
        ],
        extra: { agentId: agent.id, eventId: event.id, type: 'assignment' }
      }]
    });
  }

  async notifyEmergency(message, location) {
    if (!this.initialized) return;
    
    await LocalNotifications.schedule({
      notifications: [{
        title: '🚨 URGENCE',
        body: message,
        id: `emergency_${Date.now()}`,
        iconColor: '#DC2626',
        sound: 'emergency.wav',
        priority: 5, // Maximum
        actions: [
          { id: 'respond', title: 'Répondre' },
          { id: 'call_backup', title: 'Renfort' }
        ],
        extra: { location, type: 'emergency', urgent: true }
      }]
    });
  }

  async clearAllNotifications() {
    if (!this.initialized) return;
    
    const pending = await LocalNotifications.getPending();
    const delivered = await LocalNotifications.getDelivered();
    
    await LocalNotifications.cancel({ notifications: pending.notifications });
    await LocalNotifications.removeDelivered({ notifications: delivered.notifications });
    
    console.log('🗑️ Toutes les notifications effacées');
  }

  async scheduleShiftReminder(agent, shiftStart) {
    if (!this.initialized) return;
    
    const reminderTime = new Date(shiftStart);
    reminderTime.setMinutes(reminderTime.getMinutes() - 30); // 30 min avant
    
    await LocalNotifications.schedule({
      notifications: [{
        title: '⏰ Rappel service',
        body: `${agent.firstName}, votre service commence dans 30 minutes`,
        id: `shift_${agent.id}_${shiftStart}`,
        schedule: { at: reminderTime },
        iconColor: '#3B82F6',
        actions: [
          { id: 'ready', title: 'Prêt' },
          { id: 'delay', title: 'Retard' }
        ],
        extra: { agentId: agent.id, shiftStart, type: 'shift_reminder' }
      }]
    });
  }
}

export const notificationService = new NotificationService();
export default notificationService;