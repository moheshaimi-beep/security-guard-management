import React, { useState, useEffect } from 'react';
import { FiBell, FiX, FiAlertCircle, FiCheck, FiTrash2, FiCheckCircle, FiAlertTriangle, FiUserPlus, FiShield } from 'react-icons/fi';
import api from '../services/api';
import { toast } from 'react-toastify';

/**
 * Composant de cloche de notification
 * Affiche un compteur de notifications non lues et permet de les consulter
 */
const NotificationBell = ({ className = '' }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  // Charger le compteur de notifications non lues
  useEffect(() => {
    fetchUnreadCount();
    
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      const count = response.data.data?.unreadCount || 0;
      console.log('🔔 Compteur notifications:', count);
      setUnreadCount(count);
    } catch (error) {
      console.error('Erreur chargement compteur notifications:', error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      console.log('📥 Chargement notifications...');
      const response = await api.get('/notifications/my-notifications', {
        params: { limit: 20 }
      });
      const notifs = response.data.data?.notifications || [];
      console.log('📥 Notifications reçues:', notifs.length, notifs);
      setNotifications(notifs);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
      toast.error('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = () => {
    if (!showDropdown) {
      fetchNotifications();
    }
    setShowDropdown(!showDropdown);
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      
      // Mettre à jour localement
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true } 
            : notif
        )
      );
      
      // Recharger le compteur
      fetchUnreadCount();
    } catch (error) {
      console.error('Erreur marquage notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      
      // Mettre à jour localement
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      
      setUnreadCount(0);
      toast.success('Toutes les notifications marquées comme lues');
    } catch (error) {
      console.error('Erreur marquage toutes notifications:', error);
      toast.error('Erreur lors du marquage des notifications');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      
      // Retirer localement
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      
      // Recharger le compteur
      fetchUnreadCount();
      toast.success('Notification supprimée');
    } catch (error) {
      console.error('Erreur suppression notification:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getNotificationIcon = (notification) => {
    // Vérifier si c'est une action terrain (incident ou création agent)
    const metadata = notification.metadata 
      ? (typeof notification.metadata === 'string' ? JSON.parse(notification.metadata) : notification.metadata)
      : {};
    const actionType = metadata.actionType;

    // Actions terrain spécifiques
    if (actionType === 'incident_report') {
      return <FiAlertTriangle className="text-orange-500" />;
    }
    if (actionType === 'agent_creation') {
      return <FiUserPlus className="text-green-500" />;
    }

    // Types de notifications génériques
    switch (notification.type) {
      case 'system':
        return <FiCheckCircle className="text-blue-500" />;
      case 'late_alert':
      case 'absence_alert':
        return <FiAlertCircle className="text-red-500" />;
      case 'reminder':
      case 'schedule_change':
        return <FiAlertCircle className="text-yellow-500" />;
      case 'assignment':
        return <FiCheckCircle className="text-green-500" />;
      default:
        return <FiBell className="text-blue-500" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className={`relative ${className}`}>
      {/* Bouton cloche */}
      <button
        onClick={handleBellClick}
        className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <FiBell className="text-xl" />
        
        {/* Badge compteur */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-xs font-bold items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown des notifications */}
      {showDropdown && (
        <>
          {/* Overlay pour fermer en cliquant à l'extérieur */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          
          <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-2">
                <FiBell className="text-blue-500" />
                <h3 className="font-semibold text-gray-800">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    title="Tout marquer comme lu"
                  >
                    <FiCheck className="inline mr-1" />
                    Tout lire
                  </button>
                )}
                <button
                  onClick={() => setShowDropdown(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX />
                </button>
              </div>
            </div>

            {/* Liste des notifications */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  Chargement...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FiBell className="mx-auto text-4xl mb-2 text-gray-300" />
                  <p className="text-sm">Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => {
                    const metadata = notification.metadata 
                      ? (typeof notification.metadata === 'string' ? JSON.parse(notification.metadata) : notification.metadata)
                      : {};
                    const isFieldAction = metadata.actionType === 'incident_report' || metadata.actionType === 'agent_creation';
                    
                    return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      } ${isFieldAction ? 'bg-gradient-to-r from-green-50/50 to-transparent' : ''}`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icône */}
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification)}
                        </div>

                        {/* Contenu */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </p>
                            {isFieldAction && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
                                <FiShield size={10} />
                                Action terrain
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          {/* Détails de l'action terrain */}
                          {metadata.actionType === 'incident_report' && metadata.severity && (
                            <p className="text-xs mt-1">
                              <span className={`px-2 py-0.5 rounded ${
                                metadata.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                metadata.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                Gravité: {metadata.severity}
                              </span>
                            </p>
                          )}
                          {metadata.actionType === 'agent_creation' && metadata.zonesCount && (
                            <p className="text-xs mt-1 text-gray-500">
                              ✓ Assigné à {metadata.zonesCount} zone{metadata.zonesCount > 1 ? 's' : ''}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 flex items-center gap-2">
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="text-blue-500 hover:text-blue-600"
                              title="Marquer comme lu"
                            >
                              <FiCheck className="text-sm" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="text-red-500 hover:text-red-600"
                            title="Supprimer"
                          >
                            <FiTrash2 className="text-sm" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-center text-gray-500">
                  {notifications.length} notification{notifications.length > 1 ? 's' : ''} 
                  {unreadCount > 0 && ` • ${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
