import React, { useState, useEffect } from 'react';
import {
  FiBell, FiCheck, FiCheckCircle, FiTrash2, FiFilter,
  FiCalendar, FiClock, FiAlertTriangle, FiUser, FiMapPin,
  FiAward, FiShield, FiRefreshCw, FiMail
} from 'react-icons/fi';
import { notificationsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const notificationTypes = {
  assignment_new: { icon: FiCalendar, color: 'bg-blue-100 text-blue-600', label: 'Nouvelle affectation' },
  assignment_update: { icon: FiCalendar, color: 'bg-blue-100 text-blue-600', label: 'Affectation modifiée' },
  assignment_reminder: { icon: FiClock, color: 'bg-orange-100 text-orange-600', label: 'Rappel' },
  incident_new: { icon: FiAlertTriangle, color: 'bg-red-100 text-red-600', label: 'Nouvel incident' },
  incident_update: { icon: FiAlertTriangle, color: 'bg-red-100 text-red-600', label: 'Incident mis à jour' },
  badge_awarded: { icon: FiAward, color: 'bg-yellow-100 text-yellow-600', label: 'Badge obtenu' },
  checkin_reminder: { icon: FiMapPin, color: 'bg-green-100 text-green-600', label: 'Rappel pointage' },
  system: { icon: FiShield, color: 'bg-gray-100 text-gray-600', label: 'Système' },
  default: { icon: FiBell, color: 'bg-primary-100 text-primary-600', label: 'Notification' }
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, [filter, typeFilter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const [notifRes, countRes] = await Promise.all([
        notificationsAPI.getMy({
          isRead: filter === 'read' ? true : filter === 'unread' ? false : undefined,
          type: typeFilter || undefined,
          limit: 100
        }),
        notificationsAPI.getUnreadCount()
      ]);

      setNotifications(notifRes.data.data.notifications || []);
      setUnreadCount(countRes.data.data.count || 0);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('Toutes les notifications marquées comme lues');
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification supprimée');
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const getNotificationType = (type) => {
    return notificationTypes[type] || notificationTypes.default;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FiBell className="mr-3 text-primary-600" />
            Notifications
          </h1>
          <p className="text-gray-500">
            {unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
              : 'Aucune nouvelle notification'
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchNotifications}
            className="btn-secondary"
          >
            <FiRefreshCw className="mr-2" /> Actualiser
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="btn-primary"
            >
              <FiCheckCircle className="mr-2" /> Tout marquer comme lu
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-400" />
            <span className="text-sm text-gray-600">Filtrer:</span>
          </div>
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'Toutes' },
              { value: 'unread', label: 'Non lues' },
              { value: 'read', label: 'Lues' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-4 py-2 rounded-lg text-sm ${
                  filter === option.value
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input w-48"
          >
            <option value="">Tous les types</option>
            <option value="assignment_new">Affectations</option>
            <option value="incident_new">Incidents</option>
            <option value="badge_awarded">Badges</option>
            <option value="checkin_reminder">Rappels</option>
            <option value="system">Système</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="card text-center py-12">
          <FiBell size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notification => {
            const typeInfo = getNotificationType(notification.type);
            const Icon = typeInfo.icon;

            return (
              <div
                key={notification.id}
                className={`card hover:shadow-md transition-shadow ${
                  !notification.isRead ? 'bg-primary-50/30 border-l-4 border-l-primary-500' : ''
                }`}
              >
                <div className="flex items-start">
                  <div className={`p-3 rounded-full ${typeInfo.color} mr-4`}>
                    <Icon size={20} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={`font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 ml-2 mt-2" />
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: fr
                        })}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-4">
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                        title="Marquer comme lu"
                      >
                        <FiCheck size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Supprimer"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Action button if applicable */}
                {notification.actionUrl && (
                  <div className="mt-3 pt-3 border-t">
                    <a
                      href={notification.actionUrl}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {notification.actionText || 'Voir les détails'} →
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Today's summary */}
      <div className="card bg-gradient-to-r from-primary-50 to-blue-50">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
          <FiMail className="mr-2" /> Résumé des notifications
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-primary-600">{notifications.length}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{unreadCount}</div>
            <div className="text-xs text-gray-500">Non lues</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {notifications.filter(n => n.type?.includes('assignment')).length}
            </div>
            <div className="text-xs text-gray-500">Affectations</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600">
              {notifications.filter(n => n.type?.includes('incident')).length}
            </div>
            <div className="text-xs text-gray-500">Incidents</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
