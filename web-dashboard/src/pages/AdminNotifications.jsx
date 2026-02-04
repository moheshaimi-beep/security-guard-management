import React, { useState, useEffect } from 'react';
import {
  FiBell, FiSend, FiUsers, FiBarChart2, FiRefreshCw,
  FiTrash2, FiAlertCircle, FiCheckCircle, FiClock,
  FiMail, FiMessageSquare, FiSmartphone, FiFilter
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../services/api';

const AdminNotifications = () => {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, send, history, settings, bulk
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [notificationTypes, setNotificationTypes] = useState([]);
  const [cinValidation, setCinValidation] = useState({
    isValidating: false,
    found: [],
    notFound: [],
    inactiveUsers: []
  });

  // État pour notifications en masse
  const [bulkNotification, setBulkNotification] = useState({
    selectedEvent: null,
    eventStatus: 'all', // all, ongoing, planned, future
    channels: [],
    messageType: 'custom', // custom, assignment, reminder, update
    customMessage: '',
    title: '',
    includeSupervisors: true,
    includeAgents: true,
    onlyConfirmed: false
  });
  const [events, setEvents] = useState([]);
  const [eventStats, setEventStats] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  // État pour les préférences utilisateurs
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPreferences, setUserPreferences] = useState(null);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  
  // Filtres
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    type: '',
    status: '',
    channel: '',
    priority: '',
    search: ''
  });

  // Formulaire d'envoi
  const [sendForm, setSendForm] = useState({
    recipientType: 'specific', // specific, role, all
    userIds: [],
    cins: '', // CINs séparés par des virgules
    role: '',
    type: 'general',
    title: '',
    message: '',
    channels: ['in_app'],
    priority: 'normal'
  });

  useEffect(() => {
    loadDashboard();
    loadNotificationTypes();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadNotifications();
    } else if (activeTab === 'bulk') {
      loadEventsForBulk(bulkNotification.eventStatus);
    } else if (activeTab === 'settings') {
      loadUsers();
    }
  }, [activeTab, filters]);

  // Recharger les événements quand le filtre de statut change
  useEffect(() => {
    if (activeTab === 'bulk') {
      loadEventsForBulk(bulkNotification.eventStatus);
    }
  }, [bulkNotification.eventStatus, activeTab]);

  // Vérification en temps réel des CINs
  useEffect(() => {
    const validateCins = async () => {
      if (sendForm.recipientType !== 'specific' || !sendForm.cins.trim()) {
        setCinValidation({ isValidating: false, found: [], notFound: [], inactiveUsers: [] });
        return;
      }

      const cinsArray = sendForm.cins.split(',').map(cin => cin.trim()).filter(Boolean);
      
      if (cinsArray.length === 0) {
        setCinValidation({ isValidating: false, found: [], notFound: [], inactiveUsers: [] });
        return;
      }

      setCinValidation(prev => ({ ...prev, isValidating: true }));

      try {
        const response = await api.post('/admin/notifications/verify-cins', { cins: cinsArray });
        const { found, notFound, inactiveUsers } = response.data.data;
        
        setCinValidation({
          isValidating: false,
          found: found.filter(u => u.isActive),
          notFound,
          inactiveUsers
        });
      } catch (error) {
        setCinValidation({ isValidating: false, found: [], notFound: [], inactiveUsers: [] });
      }
    };

    const debounceTimer = setTimeout(validateCins, 800);
    return () => clearTimeout(debounceTimer);
  }, [sendForm.cins, sendForm.recipientType]);

  const loadDashboard = async () => {
    try {
      const response = await api.get('/admin/notifications/dashboard');
      setDashboard(response.data.data);
    } catch (error) {
      toast.error('Erreur de chargement du tableau de bord');
    }
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await api.get(`/admin/notifications?${params}`);
      setNotifications(response.data.data.notifications);
      setPagination(response.data.data.pagination);
    } catch (error) {
      toast.error('Erreur de chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationTypes = async () => {
    try {
      const response = await api.get('/admin/notifications/types');
      setNotificationTypes(response.data.data);
    } catch (error) {
      console.error('Error loading types:', error);
    }
  };

  const loadEventsForBulk = async (status = 'all') => {
    setLoadingEvents(true);
    try {
      const statusFilter = status !== 'all' ? `&status=${status}` : '';
      const response = await api.get(`/events?limit=100${statusFilter}`);
      setEvents(response.data.data.events || response.data.data || []);
    } catch (error) {
      toast.error('Erreur de chargement des événements');
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users?limit=100');
      setUsers(response.data.data.users || response.data.data || []);
    } catch (error) {
      toast.error('Erreur de chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPreferences = async (userId) => {
    setLoadingPreferences(true);
    try {
      const response = await api.get(`/users/${userId}`);
      const user = response.data.data;
      
      // Parser les préférences de notification
      let preferences = {
        channels: {
          in_app: true,
          email: true,
          sms: true,
          whatsapp: true
        },
        types: {
          assignment: true,
          checkin: true,
          incident: true,
          system: true,
          reminder: true
        },
        priority: {
          high: true,
          normal: true,
          low: true
        },
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00'
        }
      };

      if (user.notificationPreferences) {
        try {
          const parsed = typeof user.notificationPreferences === 'string' 
            ? JSON.parse(user.notificationPreferences)
            : user.notificationPreferences;
          preferences = { ...preferences, ...parsed };
        } catch (e) {
          console.error('Error parsing preferences:', e);
        }
      }

      setUserPreferences(preferences);
      setSelectedUser(user);
    } catch (error) {
      toast.error('Erreur de chargement des préférences');
    } finally {
      setLoadingPreferences(false);
    }
  };

  const saveUserPreferences = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      await api.put(`/users/${selectedUser.id}`, {
        notificationPreferences: JSON.stringify(userPreferences)
      });
      
      toast.success('✅ Préférences enregistrées avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement des préférences');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (category, key, value) => {
    setUserPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const loadEventStats = async (eventId) => {
    if (!eventId) {
      setEventStats(null);
      return;
    }
    
    try {
      const response = await api.get(`/events/${eventId}/notification-stats`);
      setEventStats(response.data.data);
    } catch (error) {
      console.error('Error loading event stats:', error);
      // Fallback: calculer les stats à partir des affectations
      try {
        const assignmentsResponse = await api.get(`/assignments?eventId=${eventId}`);
        const assignments = assignmentsResponse.data.data.assignments || [];
        
        const supervisors = new Set();
        const agents = new Set();
        const confirmed = assignments.filter(a => a.status === 'confirmed');
        
        assignments.forEach(assignment => {
          // Utiliser assignment.role qui définit le rôle dans cette affectation
          if (assignment.role === 'supervisor') {
            supervisors.add(assignment.userId);
          } else if (assignment.role === 'primary' || assignment.role === 'backup') {
            agents.add(assignment.userId);
          }
        });
        
        setEventStats({
          totalSupervisors: supervisors.size,
          totalAgents: agents.size,
          confirmedAssignments: confirmed.length,
          totalAssignments: assignments.length
        });
      } catch (err) {
        toast.error('Impossible de charger les statistiques de l\'événement');
      }
    }
  };

  const sendBulkNotification = async (e) => {
    e.preventDefault();
    
    if (!bulkNotification.selectedEvent) {
      toast.error('Veuillez sélectionner un événement');
      return;
    }

    if (bulkNotification.channels.length === 0) {
      toast.error('Veuillez sélectionner au moins un canal de communication');
      return;
    }

    if (bulkNotification.messageType === 'custom' && !bulkNotification.customMessage.trim()) {
      toast.error('Veuillez entrer un message personnalisé');
      return;
    }

    if (!bulkNotification.title.trim()) {
      toast.error('Veuillez entrer un titre');
      return;
    }

    const confirmMessage = `
Vous allez envoyer une notification à tous les ${bulkNotification.includeSupervisors && bulkNotification.includeAgents ? 'responsables et agents' : bulkNotification.includeSupervisors ? 'responsables' : 'agents'} 
${bulkNotification.onlyConfirmed ? 'confirmés' : 'affectés'} à cet événement.

Canaux: ${bulkNotification.channels.join(', ')}
Destinataires estimés: ${eventStats ? (bulkNotification.includeSupervisors ? eventStats.totalSupervisors : 0) + (bulkNotification.includeAgents ? eventStats.totalAgents : 0) : '...'}

Confirmer l'envoi ?
    `.trim();

    if (!window.confirm(confirmMessage)) return;

    setLoading(true);
    try {
      const payload = {
        eventId: bulkNotification.selectedEvent,
        channels: bulkNotification.channels,
        messageType: bulkNotification.messageType,
        customMessage: bulkNotification.customMessage,
        title: bulkNotification.title,
        includeSupervisors: bulkNotification.includeSupervisors,
        includeAgents: bulkNotification.includeAgents,
        onlyConfirmed: bulkNotification.onlyConfirmed
      };

      const response = await api.post('/admin/notifications/bulk-event', payload);
      
      toast.success(response.data.message || `✅ ${response.data.data.sent} notification(s) envoyée(s) avec succès`);
      
      // Réinitialiser le formulaire
      setBulkNotification({
        selectedEvent: null,
        eventStatus: 'all',
        channels: [],
        messageType: 'custom',
        customMessage: '',
        title: '',
        includeSupervisors: true,
        includeAgents: true,
        onlyConfirmed: false
      });
      setEventStats(null);
      
      loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur d\'envoi de la notification en masse');
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async (e) => {
    e.preventDefault();
    
    if (!sendForm.title || !sendForm.message) {
      toast.error('Le titre et le message sont requis');
      return;
    }

    if (sendForm.recipientType === 'specific') {
      if (!sendForm.cins.trim()) {
        toast.error('Veuillez entrer au moins un CIN');
        return;
      }
      
      // Vérifier la validation en temps réel
      if (cinValidation.notFound.length > 0) {
        toast.error(`CIN(s) introuvable(s): ${cinValidation.notFound.join(', ')}`);
        return;
      }
      
      if (cinValidation.found.length === 0) {
        toast.error('Aucun utilisateur actif trouvé');
        return;
      }
      
      // Confirmer l'envoi
      const foundList = cinValidation.found.map(u => u.name).join(', ');
      const confirm = window.confirm(
        `Envoyer à ${cinValidation.found.length} utilisateur(s) actif(s):\n${foundList}\n\nConfirmer?`
      );
      
      if (!confirm) {
        return;
      }
      
      if (cinValidation.inactiveUsers.length > 0) {
        const inactiveList = cinValidation.inactiveUsers.map(u => `${u.name} (${u.cin})`).join(', ');
        toast.warning(`Utilisateur(s) inactif(s) ignoré(s): ${inactiveList}`);
      }
    }

    setLoading(true);
    try {

      const payload = {
        ...sendForm,
        ...(sendForm.recipientType === 'specific' && { 
          cins: sendForm.cins.split(',').map(cin => cin.trim()).filter(Boolean)
        }),
        ...(sendForm.recipientType === 'role' && { role: sendForm.role })
      };

      const response = await api.post('/admin/notifications/send', payload);
      toast.success(response.data.message);
      
      // Reset form
      setSendForm({
        recipientType: 'specific',
        userIds: [],
        cins: '',
        role: '',
        type: 'general',
        title: '',
        message: '',
        channels: ['in_app'],
        priority: 'normal'
      });
      
      loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur d\'envoi');
    } finally {
      setLoading(false);
    }
  };

  const retryNotification = async (id) => {
    try {
      await api.post(`/admin/notifications/${id}/retry`);
      toast.success('Notification renvoyée');
      loadNotifications();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const deleteNotifications = async (ids) => {
    if (!window.confirm('Supprimer ces notifications ?')) return;

    try {
      await api.delete('/admin/notifications/bulk', {
        data: { notificationIds: ids }
      });
      toast.success('Notifications supprimées');
      loadNotifications();
      loadDashboard();
    } catch (error) {
      toast.error('Erreur de suppression');
    }
  };

  const testNotification = async () => {
    try {
      const cin = prompt('CIN de l\'utilisateur pour le test:');
      if (!cin) return;

      const channel = prompt('Canal (in_app, email, sms, whatsapp):', 'in_app');
      
      await api.post('/admin/notifications/test', { cin, channel });
      toast.success('Notification de test envoyée');
      loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      read: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-700',
      normal: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700'
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  const getChannelIcon = (channel) => {
    const icons = {
      email: <FiMail className="w-4 h-4" />,
      sms: <FiMessageSquare className="w-4 h-4" />,
      whatsapp: <FiMessageSquare className="w-4 h-4" />,
      push: <FiSmartphone className="w-4 h-4" />,
      in_app: <FiBell className="w-4 h-4" />
    };
    return icons[channel] || <FiBell className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FiBell className="w-8 h-8 text-primary-600" />
            Gestion des Notifications
          </h1>
          <p className="text-gray-600 mt-2">
            Système de notifications avancé pour tous les événements du système
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-4 font-medium whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'dashboard'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FiBarChart2 /> Tableau de bord
            </button>
            <button
              onClick={() => setActiveTab('send')}
              className={`px-6 py-4 font-medium whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'send'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FiSend /> Envoyer
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-4 font-medium whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FiClock /> Historique
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-4 font-medium whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'settings'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FiUsers /> Préférences utilisateurs
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`px-6 py-4 font-medium whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'bulk'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FiSend className="animate-pulse" /> Notifications en Masse
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'dashboard' && dashboard && (
          <div className="space-y-6">
            {/* Statistiques principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={<FiBell />}
                title="Total"
                value={dashboard.summary.total}
                color="bg-blue-500"
              />
              <StatCard
                icon={<FiCheckCircle />}
                title="Envoyées"
                value={dashboard.summary.sent}
                subtitle={`${dashboard.summary.successRate}% de succès`}
                color="bg-green-500"
              />
              <StatCard
                icon={<FiAlertCircle />}
                title="Échouées"
                value={dashboard.summary.failed}
                color="bg-red-500"
              />
              <StatCard
                icon={<FiClock />}
                title="En attente"
                value={dashboard.summary.pending}
                color="bg-yellow-500"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Par canal */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Par canal</h3>
                <div className="space-y-3">
                  {dashboard.byChannel.map((item) => (
                    <div key={item.channel} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getChannelIcon(item.channel)}
                        <span className="font-medium">{item.channel}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">{item.count} total</span>
                        <span className="text-sm text-green-600">{item.successful} réussies</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Par type */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Par type</h3>
                <div className="space-y-3">
                  {dashboard.byType.map((item) => {
                    const typeInfo = notificationTypes.find(t => t.value === item.type);
                    return (
                      <div key={item.type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{typeInfo?.icon || '📧'}</span>
                          <span className="font-medium">{typeInfo?.label || item.type}</span>
                        </div>
                        <span className="text-sm text-gray-600">{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Échecs récents */}
            {dashboard.recentFailures.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FiAlertCircle className="text-red-500" />
                  Échecs récents
                </h3>
                <div className="space-y-2">
                  {dashboard.recentFailures.map((notif) => (
                    <div key={notif.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium">{notif.title}</p>
                        <p className="text-sm text-gray-600">{notif.user?.email}</p>
                        <p className="text-xs text-red-600 mt-1">{notif.failureReason}</p>
                      </div>
                      <button
                        onClick={() => retryNotification(notif.id)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                      >
                        <FiRefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions rapides */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Actions rapides</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={testNotification}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <FiSend /> Test notification
                </button>
                <button
                  onClick={loadDashboard}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <FiRefreshCw /> Actualiser
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'send' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Envoyer une notification</h2>
            
            <form onSubmit={sendNotification} className="space-y-6">
              {/* Destinataires */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destinataires
                </label>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={sendForm.recipientType === 'specific'}
                      onChange={() => setSendForm({ ...sendForm, recipientType: 'specific' })}
                    />
                    Utilisateurs spécifiques
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={sendForm.recipientType === 'role'}
                      onChange={() => setSendForm({ ...sendForm, recipientType: 'role' })}
                    />
                    Par rôle
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={sendForm.recipientType === 'all'}
                      onChange={() => setSendForm({ ...sendForm, recipientType: 'all' })}
                    />
                    Tous
                  </label>
                </div>

                {sendForm.recipientType === 'specific' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CIN des utilisateurs (séparés par des virgules)
                    </label>
                    <input
                      type="text"
                      value={sendForm.cins}
                      onChange={(e) => setSendForm({ ...sendForm, cins: e.target.value })}
                      placeholder="Ex: AB123456, CD789012, EF345678"
                      className={`w-full px-4 py-2 border rounded-lg ${
                        cinValidation.notFound.length > 0 
                          ? 'border-red-500 focus:border-red-500' 
                          : cinValidation.found.length > 0 
                            ? 'border-green-500 focus:border-green-500'
                            : 'border-gray-300'
                      }`}
                    />
                    
                    {/* Indicateur de validation */}
                    {cinValidation.isValidating && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                        <FiRefreshCw className="animate-spin" />
                        Vérification en cours...
                      </div>
                    )}
                    
                    {/* CINs trouvés */}
                    {!cinValidation.isValidating && cinValidation.found.length > 0 && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-sm font-medium text-green-800 mb-2">
                          <FiCheckCircle className="text-green-600" />
                          {cinValidation.found.length} utilisateur(s) actif(s) trouvé(s)
                        </div>
                        <div className="text-xs text-green-700 space-y-1">
                          {cinValidation.found.map((user, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="font-medium">{user.cin}</span>
                              <span>→ {user.name}</span>
                              <span className="text-green-600">({user.role})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* CINs introuvables */}
                    {!cinValidation.isValidating && cinValidation.notFound.length > 0 && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-sm font-medium text-red-800 mb-2">
                          <FiAlertCircle className="text-red-600" />
                          CIN(s) introuvable(s)
                        </div>
                        <div className="text-xs text-red-700 space-y-1">
                          {cinValidation.notFound.map((cin, idx) => (
                            <div key={idx} className="font-medium">{cin}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Utilisateurs inactifs */}
                    {!cinValidation.isValidating && cinValidation.inactiveUsers.length > 0 && (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2 text-sm font-medium text-yellow-800 mb-2">
                          <FiAlertCircle className="text-yellow-600" />
                          Utilisateur(s) inactif(s) (seront ignorés)
                        </div>
                        <div className="text-xs text-yellow-700 space-y-1">
                          {cinValidation.inactiveUsers.map((user, idx) => (
                            <div key={idx}>
                              <span className="font-medium">{user.cin}</span> - {user.name} ({user.status})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {!cinValidation.isValidating && !sendForm.cins.trim() && (
                      <p className="text-xs text-gray-500 mt-1">
                        Entrez les CIN des utilisateurs séparés par des virgules
                      </p>
                    )}
                  </div>
                )}

                {sendForm.recipientType === 'role' && (
                  <select
                    value={sendForm.role}
                    onChange={(e) => setSendForm({ ...sendForm, role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Sélectionner un rôle</option>
                    <option value="agent">Agents</option>
                    <option value="supervisor">Superviseurs</option>
                    <option value="responsable">Responsables</option>
                    <option value="admin">Administrateurs</option>
                  </select>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de notification
                </label>
                <select
                  value={sendForm.type}
                  onChange={(e) => setSendForm({ ...sendForm, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  {notificationTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Titre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre
                </label>
                <input
                  type="text"
                  value={sendForm.title}
                  onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Titre de la notification"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={sendForm.message}
                  onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows="4"
                  placeholder="Votre message..."
                  required
                />
              </div>

              {/* Canaux */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Canaux d'envoi
                </label>
                <div className="flex flex-wrap gap-4">
                  {['in_app', 'email', 'sms', 'whatsapp'].map((channel) => (
                    <label key={channel} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={sendForm.channels.includes(channel)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSendForm({ ...sendForm, channels: [...sendForm.channels, channel] });
                          } else {
                            setSendForm({ ...sendForm, channels: sendForm.channels.filter(c => c !== channel) });
                          }
                        }}
                      />
                      {channel}
                    </label>
                  ))}
                </div>
              </div>

              {/* Priorité */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priorité
                </label>
                <select
                  value={sendForm.priority}
                  onChange={(e) => setSendForm({ ...sendForm, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="low">Basse</option>
                  <option value="normal">Normale</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Envoi...' : <><FiSend /> Envoyer la notification</>}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-sm">
            {/* Filtres */}
            <div className="p-6 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Tous les types</option>
                  {notificationTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="sent">Envoyée</option>
                  <option value="delivered">Délivrée</option>
                  <option value="failed">Échouée</option>
                  <option value="read">Lue</option>
                </select>
                <select
                  value={filters.channel}
                  onChange={(e) => setFilters({ ...filters, channel: e.target.value, page: 1 })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Tous les canaux</option>
                  <option value="in_app">In-App</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
            </div>

            {/* Liste */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Canal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priorité</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {notifications.map((notif) => (
                    <tr key={notif.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium">{notif.user?.firstName} {notif.user?.lastName}</div>
                          <div className="text-sm text-gray-500">{notif.user?.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{notif.type}</td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs truncate" title={notif.title}>{notif.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getChannelIcon(notif.channel)}
                          <span className="text-sm">{notif.channel}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(notif.status)}`}>
                          {notif.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(notif.priority)}`}>
                          {notif.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(notif.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          {notif.status === 'failed' && (
                            <button
                              onClick={() => retryNotification(notif.id)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Réessayer"
                            >
                              <FiRefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotifications([notif.id])}
                            className="text-red-600 hover:text-red-800"
                            title="Supprimer"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && (
              <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {pagination.page} sur {pagination.totalPages} ({pagination.total} résultats)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                    disabled={filters.page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                  >
                    Précédent
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                    disabled={filters.page === pagination.totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notifications en Masse Tab */}
        {activeTab === 'bulk' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <FiSend className="text-primary-600" />
                Notifications en Masse par Événement
              </h2>
              <p className="text-gray-600 mt-2">
                Envoyez des notifications à tous les responsables et agents affectés à un événement en une seule étape
              </p>
            </div>

            <form onSubmit={sendBulkNotification} className="space-y-8">
              {/* Étape 1: Sélection de l'événement */}
              <div className="border-2 border-primary-200 rounded-lg p-6 bg-primary-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="bg-primary-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                  Sélectionnez un événement
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filtrer par statut
                    </label>
                    <select
                      value={bulkNotification.eventStatus}
                      onChange={(e) => {
                        setBulkNotification({ ...bulkNotification, eventStatus: e.target.value, selectedEvent: null });
                        setEventStats(null);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="all">Tous les événements</option>
                      <option value="active">Actifs</option>
                      <option value="scheduled">Planifiés</option>
                      <option value="completed">Terminés</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Événement <span className="text-red-500">*</span>
                    </label>
                    {loadingEvents ? (
                      <div className="text-center py-4">
                        <FiRefreshCw className="animate-spin inline-block" />
                      </div>
                    ) : (
                      <select
                        value={bulkNotification.selectedEvent || ''}
                        onChange={(e) => {
                          setBulkNotification({ ...bulkNotification, selectedEvent: e.target.value });
                          loadEventStats(e.target.value);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        required
                      >
                        <option value="">-- Sélectionnez un événement --</option>
                        {events.map(event => (
                          <option key={event.id} value={event.id}>
                            {event.name} - {event.location} ({new Date(event.startDate).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Statistiques de l'événement sélectionné */}
                {eventStats && (
                  <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">📊 Destinataires potentiels</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{eventStats.totalSupervisors || 0}</p>
                        <p className="text-xs text-gray-600">Responsables</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{eventStats.totalAgents || 0}</p>
                        <p className="text-xs text-gray-600">Agents</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{eventStats.confirmedAssignments || 0}</p>
                        <p className="text-xs text-gray-600">Confirmés</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">{eventStats.totalAssignments || 0}</p>
                        <p className="text-xs text-gray-600">Total Affectations</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Options de destinataires */}
                <div className="mt-4 space-y-3">
                  <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={bulkNotification.includeSupervisors}
                      onChange={(e) => setBulkNotification({ ...bulkNotification, includeSupervisors: e.target.checked })}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Inclure les responsables (Superviseurs)</p>
                      <p className="text-sm text-gray-600">Notifier tous les superviseurs affectés à cet événement</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={bulkNotification.includeAgents}
                      onChange={(e) => setBulkNotification({ ...bulkNotification, includeAgents: e.target.checked })}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Inclure les agents</p>
                      <p className="text-sm text-gray-600">Notifier tous les agents affectés à cet événement</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={bulkNotification.onlyConfirmed}
                      onChange={(e) => setBulkNotification({ ...bulkNotification, onlyConfirmed: e.target.checked })}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Uniquement les affectations confirmées</p>
                      <p className="text-sm text-gray-600">Ne notifier que les personnes ayant confirmé leur affectation</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Étape 2: Canaux de communication */}
              <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                  Choisissez les canaux de communication
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    bulkNotification.channels.includes('whatsapp')
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-green-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={bulkNotification.channels.includes('whatsapp')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkNotification({ ...bulkNotification, channels: [...bulkNotification.channels, 'whatsapp'] });
                        } else {
                          setBulkNotification({ ...bulkNotification, channels: bulkNotification.channels.filter(c => c !== 'whatsapp') });
                        }
                      }}
                      className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FiMessageSquare className="text-green-600" size={20} />
                        <p className="font-semibold text-gray-900">WhatsApp</p>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Message instantané</p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    bulkNotification.channels.includes('sms')
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-purple-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={bulkNotification.channels.includes('sms')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkNotification({ ...bulkNotification, channels: [...bulkNotification.channels, 'sms'] });
                        } else {
                          setBulkNotification({ ...bulkNotification, channels: bulkNotification.channels.filter(c => c !== 'sms') });
                        }
                      }}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FiSmartphone className="text-purple-600" size={20} />
                        <p className="font-semibold text-gray-900">SMS</p>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Message texte</p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    bulkNotification.channels.includes('gmail')
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 bg-white hover:border-red-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={bulkNotification.channels.includes('gmail')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkNotification({ ...bulkNotification, channels: [...bulkNotification.channels, 'gmail'] });
                        } else {
                          setBulkNotification({ ...bulkNotification, channels: bulkNotification.channels.filter(c => c !== 'gmail') });
                        }
                      }}
                      className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FiMail className="text-red-600" size={20} />
                        <p className="font-semibold text-gray-900">Gmail</p>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Email Google</p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    bulkNotification.channels.includes('outlook')
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-400'
                  }`}>
                    <input
                      type="checkbox"
                      checked={bulkNotification.channels.includes('outlook')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkNotification({ ...bulkNotification, channels: [...bulkNotification.channels, 'outlook'] });
                        } else {
                          setBulkNotification({ ...bulkNotification, channels: bulkNotification.channels.filter(c => c !== 'outlook') });
                        }
                      }}
                      className="w-5 h-5 text-blue-700 rounded focus:ring-blue-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FiMail className="text-blue-700" size={20} />
                        <p className="font-semibold text-gray-900">Outlook</p>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Email Microsoft</p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    bulkNotification.channels.includes('in_app')
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-200 bg-white hover:border-yellow-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={bulkNotification.channels.includes('in_app')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkNotification({ ...bulkNotification, channels: [...bulkNotification.channels, 'in_app'] });
                        } else {
                          setBulkNotification({ ...bulkNotification, channels: bulkNotification.channels.filter(c => c !== 'in_app') });
                        }
                      }}
                      className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FiBell className="text-yellow-600" size={20} />
                        <p className="font-semibold text-gray-900">In-App</p>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Notification dans l'appli</p>
                    </div>
                  </label>
                </div>

                {bulkNotification.channels.length > 0 && (
                  <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-700">
                      <strong>{bulkNotification.channels.length}</strong> canal{bulkNotification.channels.length > 1 ? 'x' : ''} sélectionné{bulkNotification.channels.length > 1 ? 's' : ''}: {' '}
                      <span className="font-semibold text-blue-700">
                        {bulkNotification.channels.join(', ').toUpperCase()}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Étape 3: Message */}
              <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
                  Composez votre message
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type de message
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <label className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-all ${
                        bulkNotification.messageType === 'custom'
                          ? 'border-green-500 bg-white'
                          : 'border-gray-200 bg-white hover:border-green-300'
                      }`}>
                        <input
                          type="radio"
                          name="messageType"
                          value="custom"
                          checked={bulkNotification.messageType === 'custom'}
                          onChange={(e) => setBulkNotification({ ...bulkNotification, messageType: e.target.value })}
                          className="sr-only"
                        />
                        <p className="font-medium text-sm">📝 Personnalisé</p>
                      </label>

                      <label className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-all ${
                        bulkNotification.messageType === 'assignment'
                          ? 'border-green-500 bg-white'
                          : 'border-gray-200 bg-white hover:border-green-300'
                      }`}>
                        <input
                          type="radio"
                          name="messageType"
                          value="assignment"
                          checked={bulkNotification.messageType === 'assignment'}
                          onChange={(e) => setBulkNotification({ ...bulkNotification, messageType: e.target.value })}
                          className="sr-only"
                        />
                        <p className="font-medium text-sm">📋 Affectation</p>
                      </label>

                      <label className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-all ${
                        bulkNotification.messageType === 'reminder'
                          ? 'border-green-500 bg-white'
                          : 'border-gray-200 bg-white hover:border-green-300'
                      }`}>
                        <input
                          type="radio"
                          name="messageType"
                          value="reminder"
                          checked={bulkNotification.messageType === 'reminder'}
                          onChange={(e) => setBulkNotification({ ...bulkNotification, messageType: e.target.value })}
                          className="sr-only"
                        />
                        <p className="font-medium text-sm">⏰ Rappel</p>
                      </label>

                      <label className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-all ${
                        bulkNotification.messageType === 'update'
                          ? 'border-green-500 bg-white'
                          : 'border-gray-200 bg-white hover:border-green-300'
                      }`}>
                        <input
                          type="radio"
                          name="messageType"
                          value="update"
                          checked={bulkNotification.messageType === 'update'}
                          onChange={(e) => setBulkNotification({ ...bulkNotification, messageType: e.target.value })}
                          className="sr-only"
                        />
                        <p className="font-medium text-sm">🔔 Mise à jour</p>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titre de la notification <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={bulkNotification.title}
                      onChange={(e) => setBulkNotification({ ...bulkNotification, title: e.target.value })}
                      placeholder="Ex: Rappel important pour l'événement"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  {bulkNotification.messageType === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Message personnalisé <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={bulkNotification.customMessage}
                        onChange={(e) => setBulkNotification({ ...bulkNotification, customMessage: e.target.value })}
                        placeholder="Rédigez votre message personnalisé ici..."
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        required={bulkNotification.messageType === 'custom'}
                      />
                      <p className="text-sm text-gray-600 mt-2">
                        💡 Variables disponibles: {'{eventName}'}, {'{eventDate}'}, {'{eventLocation}'}, {'{userName}'}
                      </p>
                    </div>
                  )}

                  {bulkNotification.messageType !== 'custom' && (
                    <div className="p-4 bg-white rounded-lg border border-green-200">
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Aperçu du message automatique:</strong>
                      </p>
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        {bulkNotification.messageType === 'assignment' && (
                          <p>Bonjour {'{userName}'}, vous avez été affecté(e) à l'événement <strong>{'{eventName}'}</strong> prévu le {'{eventDate}'} à {'{eventLocation}'}. Merci de confirmer votre présence.</p>
                        )}
                        {bulkNotification.messageType === 'reminder' && (
                          <p>Rappel: L'événement <strong>{'{eventName}'}</strong> aura lieu le {'{eventDate}'} à {'{eventLocation}'}. Veuillez vous présenter à l'heure. Merci!</p>
                        )}
                        {bulkNotification.messageType === 'update' && (
                          <p>Mise à jour concernant l'événement <strong>{'{eventName}'}</strong> ({'{eventDate}'} - {'{eventLocation}'}). Veuillez consulter les détails dans votre espace personnel.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Résumé et envoi */}
              <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg p-6 border-2 border-primary-300">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiCheckCircle className="text-primary-600" size={24} />
                  Résumé de l'envoi
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Événement sélectionné</p>
                    <p className="font-semibold text-gray-900">
                      {bulkNotification.selectedEvent 
                        ? events.find(e => e.id === bulkNotification.selectedEvent)?.name || 'Sélectionné'
                        : 'Aucun'}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Destinataires estimés</p>
                    <p className="font-semibold text-gray-900 text-2xl">
                      {eventStats ? (
                        (bulkNotification.includeSupervisors ? eventStats.totalSupervisors || 0 : 0) + 
                        (bulkNotification.includeAgents ? eventStats.totalAgents || 0 : 0)
                      ) : '—'}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Canaux activés</p>
                    <p className="font-semibold text-gray-900">
                      {bulkNotification.channels.length || 'Aucun'}
                    </p>
                  </div>
                </div>

                {bulkNotification.channels.length === 0 && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                    <FiAlertCircle className="text-yellow-600 mt-0.5 flex-shrink-0" size={20} />
                    <p className="text-sm text-yellow-800">
                      Veuillez sélectionner au moins un canal de communication pour envoyer la notification.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkNotification({
                        selectedEvent: null,
                        eventStatus: 'all',
                        channels: [],
                        messageType: 'custom',
                        customMessage: '',
                        title: '',
                        includeSupervisors: true,
                        includeAgents: true,
                        onlyConfirmed: false
                      });
                      setEventStats(null);
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Réinitialiser
                  </button>

                  <button
                    type="submit"
                    disabled={loading || !bulkNotification.selectedEvent || bulkNotification.channels.length === 0}
                    className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2 shadow-lg"
                  >
                    {loading ? (
                      <>
                        <FiRefreshCw className="animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <FiSend />
                        Envoyer la notification en masse
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Informations importantes */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FiAlertCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-2">⚠️ Points importants:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>La notification sera envoyée à tous les destinataires en une seule fois</li>
                      <li>Les canaux Gmail et Outlook nécessitent une configuration API active</li>
                      <li>Les messages sont personnalisés avec les informations de l'événement et de l'utilisateur</li>
                      <li>Un historique complet sera disponible dans l'onglet "Historique"</li>
                      <li>Les notifications échouées peuvent être renvoyées individuellement</li>
                    </ul>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Onglet Préférences utilisateurs */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Gestion des Préférences de Notification
              </h2>
              <p className="text-gray-600 mb-6">
                Configurez les préférences de notification pour chaque utilisateur
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Liste des utilisateurs */}
                <div className="lg:col-span-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rechercher un utilisateur
                    </label>
                    <input
                      type="text"
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      placeholder="Nom, CIN, téléphone..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Utilisateurs ({users.length})
                    </h3>
                    {loading ? (
                      <div className="text-center py-8">
                        <FiRefreshCw className="animate-spin mx-auto text-primary-600" size={32} />
                        <p className="text-gray-600 mt-2">Chargement...</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {users
                          .filter(user => {
                            if (!searchUser) return true;
                            const search = searchUser.toLowerCase();
                            return (
                              user.firstName?.toLowerCase().includes(search) ||
                              user.lastName?.toLowerCase().includes(search) ||
                              user.cin?.toLowerCase().includes(search) ||
                              user.phone?.includes(search) ||
                              user.email?.toLowerCase().includes(search)
                            );
                          })
                          .map(user => (
                            <button
                              key={user.id}
                              onClick={() => loadUserPreferences(user.id)}
                              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                                selectedUser?.id === user.id
                                  ? 'border-primary-600 bg-primary-50'
                                  : 'border-gray-200 hover:border-primary-300 bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                                  user.role === 'admin' ? 'bg-purple-500' :
                                  user.role === 'supervisor' ? 'bg-blue-500' :
                                  'bg-green-500'
                                }`}>
                                  {user.firstName?.[0]}{user.lastName?.[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 truncate">
                                    {user.firstName} {user.lastName}
                                  </p>
                                  <p className="text-xs text-gray-600 truncate">
                                    {user.cin} • {user.role}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Préférences de l'utilisateur sélectionné */}
                <div className="lg:col-span-2">
                  {!selectedUser ? (
                    <div className="bg-gray-50 rounded-lg p-12 text-center">
                      <FiUsers className="mx-auto text-gray-400 mb-4" size={64} />
                      <p className="text-gray-600 text-lg">
                        Sélectionnez un utilisateur pour configurer ses préférences
                      </p>
                    </div>
                  ) : loadingPreferences ? (
                    <div className="bg-white rounded-lg p-12 text-center">
                      <FiRefreshCw className="animate-spin mx-auto text-primary-600 mb-4" size={48} />
                      <p className="text-gray-600">Chargement des préférences...</p>
                    </div>
                  ) : userPreferences ? (
                    <div className="space-y-6">
                      {/* En-tête utilisateur */}
                      <div className="bg-gradient-to-r from-primary-500 to-blue-600 rounded-lg p-6 text-white">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                            {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold">
                              {selectedUser.firstName} {selectedUser.lastName}
                            </h3>
                            <p className="text-white/90">
                              {selectedUser.cin} • {selectedUser.role} • {selectedUser.phone}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Préférences par canal */}
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <FiSmartphone className="text-primary-600" />
                          Canaux de notification
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { key: 'in_app', label: 'Application', icon: <FiBell /> },
                            { key: 'email', label: 'Email', icon: <FiMail /> },
                            { key: 'sms', label: 'SMS', icon: <FiMessageSquare /> },
                            { key: 'whatsapp', label: 'WhatsApp', icon: <FiSmartphone /> }
                          ].map(channel => (
                            <label key={channel.key} className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-300 cursor-pointer transition-all">
                              <input
                                type="checkbox"
                                checked={userPreferences.channels[channel.key]}
                                onChange={(e) => updatePreference('channels', channel.key, e.target.checked)}
                                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                              />
                              <div className="text-gray-700">{channel.icon}</div>
                              <span className="font-medium text-gray-900">{channel.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Préférences par type */}
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <FiFilter className="text-primary-600" />
                          Types de notification
                        </h4>
                        <div className="space-y-3">
                          {[
                            { key: 'assignment', label: 'Affectations', description: 'Notifications d\'affectation aux événements' },
                            { key: 'checkin', label: 'Check-in/Check-out', description: 'Alertes de présence et pointage' },
                            { key: 'incident', label: 'Incidents', description: 'Notifications d\'incidents et urgences' },
                            { key: 'system', label: 'Système', description: 'Mises à jour système et maintenance' },
                            { key: 'reminder', label: 'Rappels', description: 'Rappels d\'événements et tâches' }
                          ].map(type => (
                            <label key={type.key} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-all">
                              <input
                                type="checkbox"
                                checked={userPreferences.types[type.key]}
                                onChange={(e) => updatePreference('types', type.key, e.target.checked)}
                                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 mt-1"
                              />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{type.label}</p>
                                <p className="text-sm text-gray-600">{type.description}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Préférences par priorité */}
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <FiAlertCircle className="text-primary-600" />
                          Niveaux de priorité
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            { key: 'high', label: 'Haute', color: 'bg-red-100 border-red-300 text-red-700' },
                            { key: 'normal', label: 'Normale', color: 'bg-blue-100 border-blue-300 text-blue-700' },
                            { key: 'low', label: 'Basse', color: 'bg-gray-100 border-gray-300 text-gray-700' }
                          ].map(priority => (
                            <label key={priority.key} className={`flex items-center gap-3 p-4 border-2 rounded-lg hover:shadow-md cursor-pointer transition-all ${priority.color}`}>
                              <input
                                type="checkbox"
                                checked={userPreferences.priority[priority.key]}
                                onChange={(e) => updatePreference('priority', priority.key, e.target.checked)}
                                className="w-5 h-5 rounded focus:ring-primary-500"
                              />
                              <span className="font-medium">{priority.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Heures de silence */}
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <FiClock className="text-primary-600" />
                          Heures de silence (Ne pas déranger)
                        </h4>
                        <div className="space-y-4">
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={userPreferences.quietHours.enabled}
                              onChange={(e) => updatePreference('quietHours', 'enabled', e.target.checked)}
                              className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                            />
                            <span className="font-medium text-gray-900">Activer les heures de silence</span>
                          </label>

                          {userPreferences.quietHours.enabled && (
                            <div className="grid grid-cols-2 gap-4 mt-4 pl-8">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Début
                                </label>
                                <input
                                  type="time"
                                  value={userPreferences.quietHours.start}
                                  onChange={(e) => updatePreference('quietHours', 'start', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Fin
                                </label>
                                <input
                                  type="time"
                                  value={userPreferences.quietHours.end}
                                  onChange={(e) => updatePreference('quietHours', 'end', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                />
                              </div>
                            </div>
                          )}

                          <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3">
                            <p className="text-sm text-blue-800">
                              <FiAlertCircle className="inline mr-2" />
                              Durant ces heures, seules les notifications de priorité haute seront envoyées
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Boutons d'action */}
                      <div className="flex gap-4 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(null);
                            setUserPreferences(null);
                          }}
                          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={saveUserPreferences}
                          disabled={loading}
                          className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2 shadow-lg"
                        >
                          {loading ? (
                            <>
                              <FiRefreshCw className="animate-spin" />
                              Enregistrement...
                            </>
                          ) : (
                            <>
                              <FiCheckCircle />
                              Enregistrer les préférences
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, subtitle, color }) => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className={`${color} text-white p-4 rounded-lg`}>
        {React.cloneElement(icon, { className: 'w-6 h-6' })}
      </div>
    </div>
  </div>
);

export default AdminNotifications;
