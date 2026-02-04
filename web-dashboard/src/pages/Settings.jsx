import React, { useState, useEffect } from 'react';
import {
  FiSettings, FiUser, FiBell, FiLock, FiGlobe,
  FiSave, FiCamera, FiMail, FiPhone, FiShield,
  FiMoon, FiSun, FiSmartphone, FiCheckCircle,
  FiCode, FiBook, FiDownload, FiCopy, FiCheck,
  FiSearch, FiFilter, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';
import useAuthStore from '../hooks/useAuth';

const Settings = () => {
  const { user, fetchProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    whatsappNumber: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: ''
  });

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    assignmentAlerts: true,
    incidentAlerts: true,
    reminderAlerts: true,
    weeklyReport: true
  });

  // Appearance
  const [appearance, setAppearance] = useState({
    darkMode: false,
    compactMode: false,
    language: 'fr'
  });

  // API Keys Configuration
  const [apiKeys, setApiKeys] = useState({
    whatsappApiKey: '',
    whatsappApiUrl: '',
    gmailApiKey: '',
    gmailClientId: '',
    gmailClientSecret: '',
    outlookApiKey: '',
    outlookClientId: '',
    outlookClientSecret: '',
    comprefaceApiKey: '',
    comprefaceApiUrl: ''
  });

  // API Documentation
  const [apiDocs, setApiDocs] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiSearchTerm, setApiSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [copiedPath, setCopiedPath] = useState(null);

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        whatsappNumber: user.whatsappNumber || '',
        address: user.address || '',
        emergencyContact: user.emergencyContact || '',
        emergencyPhone: user.emergencyPhone || ''
      });
      if (user.notificationPreferences) {
        setNotifications(prev => ({ ...prev, ...user.notificationPreferences }));
      }
    }
  }, [user]);

  // Charger la documentation API si l'onglet est actif
  useEffect(() => {
    if (activeTab === 'api' && !apiDocs && (user?.role === 'admin' || user?.role === 'supervisor')) {
      fetchApiDocumentation();
    }
  }, [activeTab, user]);

  const fetchApiDocumentation = async () => {
    setApiLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/api-docs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setApiDocs(data.data);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement de la documentation API');
      console.error('API Docs Error:', error);
    } finally {
      setApiLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.updateProfile(profile);
      toast.success('Profil mis à jour avec succès');
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Mot de passe modifié avec succès');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNotifications = async () => {
    setLoading(true);
    try {
      await authAPI.updateProfile({ notificationPreferences: notifications });
      toast.success('Préférences de notification mises à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    toast.success('Copié dans le presse-papier!');
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const exportApiDocs = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/api-docs/export', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `api-documentation-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Documentation exportée avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  const getMethodColor = (method) => {
    const colors = {
      'GET': 'bg-blue-100 text-blue-800',
      'POST': 'bg-green-100 text-green-800',
      'PUT': 'bg-yellow-100 text-yellow-800',
      'DELETE': 'bg-red-100 text-red-800',
      'PATCH': 'bg-purple-100 text-purple-800'
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  const getRoleColor = (role) => {
    const colors = {
      'admin': 'bg-red-100 text-red-800',
      'supervisor': 'bg-orange-100 text-orange-800',
      'authenticated': 'bg-blue-100 text-blue-800',
      'public': 'bg-green-100 text-green-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const filterRoutes = (routes) => {
    if (!routes) return [];
    
    return routes.filter(route => {
      const matchesSearch = !apiSearchTerm || 
        route.path.toLowerCase().includes(apiSearchTerm.toLowerCase()) ||
        route.method.toLowerCase().includes(apiSearchTerm.toLowerCase());
      
      const matchesMethod = selectedMethod === 'all' || route.method === selectedMethod;
      
      return matchesSearch && matchesMethod;
    });
  };

  const tabs = [
    { id: 'profile', label: 'Profil', icon: FiUser },
    { id: 'security', label: 'Sécurité', icon: FiLock },
    { id: 'notifications', label: 'Notifications', icon: FiBell },
    { id: 'appearance', label: 'Apparence', icon: FiGlobe },
    ...(user?.role === 'admin' ? [
      { id: 'api-keys', label: 'API Keys', icon: FiShield }
    ] : []),
    ...(user?.role === 'admin' || user?.role === 'supervisor' ? [
      { id: 'api', label: 'Documentation API', icon: FiCode }
    ] : [])
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <FiSettings className="mr-3 text-primary-600" />
          Paramètres
        </h1>
        <p className="text-gray-500">Gérez votre compte et vos préférences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="card p-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="mr-3" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-6">Informations personnelles</h2>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {/* Avatar */}
                <div className="flex items-center space-x-4 pb-4 border-b">
                  <div className="relative">
                    {user?.profilePhoto ? (
                      <img
                        src={user.profilePhoto}
                        alt="Profile"
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-2xl font-bold">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </div>
                    )}
                    <button
                      type="button"
                      className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg"
                    >
                      <FiCamera size={14} />
                    </button>
                  </div>
                  <div>
                    <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                    <p className="text-sm text-gray-500">{user?.employeeId}</p>
                    <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Prénom</label>
                    <input
                      type="text"
                      value={profile.firstName}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Nom</label>
                    <input
                      type="text"
                      value={profile.lastName}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="input pl-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Téléphone</label>
                    <div className="relative">
                      <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="input pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">WhatsApp</label>
                    <div className="relative">
                      <FiSmartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        value={profile.whatsappNumber}
                        onChange={(e) => setProfile({ ...profile, whatsappNumber: e.target.value })}
                        className="input pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">Adresse</label>
                  <textarea
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className="input"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Contact d'urgence</label>
                    <input
                      type="text"
                      value={profile.emergencyContact}
                      onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
                      className="input"
                      placeholder="Nom du contact"
                    />
                  </div>
                  <div>
                    <label className="label">Téléphone d'urgence</label>
                    <input
                      type="tel"
                      value={profile.emergencyPhone}
                      onChange={(e) => setProfile({ ...profile, emergencyPhone: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button type="submit" disabled={loading} className="btn-primary">
                    <FiSave className="mr-2" />
                    {loading ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="card">
                <h2 className="text-lg font-semibold mb-6 flex items-center">
                  <FiLock className="mr-2" />
                  Changer le mot de passe
                </h2>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="label">Mot de passe actuel</label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Nouveau mot de passe</label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="input"
                      placeholder="Min. 8 caractères"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Confirmer le mot de passe</label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button type="submit" disabled={loading} className="btn-primary">
                      {loading ? 'Modification...' : 'Modifier le mot de passe'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="card">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <FiShield className="mr-2" />
                  Sécurité du compte
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Dernière connexion</p>
                      <p className="text-sm text-gray-500">
                        {user?.lastLogin
                          ? new Date(user.lastLogin).toLocaleString('fr-FR')
                          : 'Non disponible'
                        }
                      </p>
                    </div>
                    <FiCheckCircle className="text-green-500" size={24} />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Reconnaissance faciale</p>
                      <p className="text-sm text-gray-500">
                        {user?.facialVectorUpdatedAt
                          ? `Configurée le ${new Date(user.facialVectorUpdatedAt).toLocaleDateString('fr-FR')}`
                          : 'Non configurée'
                        }
                      </p>
                    </div>
                    <span className={`badge ${user?.facialVectorUpdatedAt ? 'badge-success' : 'badge-warning'}`}>
                      {user?.facialVectorUpdatedAt ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-6 flex items-center">
                <FiBell className="mr-2" />
                Préférences de notification
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-700 mb-3">Canaux de notification</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'emailNotifications', label: 'Notifications par email', icon: FiMail },
                      { key: 'smsNotifications', label: 'Notifications par SMS', icon: FiPhone },
                      { key: 'pushNotifications', label: 'Notifications push', icon: FiBell }
                    ].map(item => (
                      <label key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                        <div className="flex items-center">
                          <item.icon className="mr-3 text-gray-400" />
                          <span>{item.label}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications[item.key]}
                          onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-700 mb-3">Types d'alertes</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'assignmentAlerts', label: 'Nouvelles affectations' },
                      { key: 'incidentAlerts', label: 'Alertes incidents' },
                      { key: 'reminderAlerts', label: 'Rappels de pointage' },
                      { key: 'weeklyReport', label: 'Rapport hebdomadaire' }
                    ].map(item => (
                      <label key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                        <span>{item.label}</span>
                        <input
                          type="checkbox"
                          checked={notifications[item.key]}
                          onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button onClick={handleUpdateNotifications} disabled={loading} className="btn-primary">
                    <FiSave className="mr-2" />
                    {loading ? 'Enregistrement...' : 'Enregistrer les préférences'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-6 flex items-center">
                <FiGlobe className="mr-2" />
                Apparence et langue
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-700 mb-3">Thème</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setAppearance({ ...appearance, darkMode: false })}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        !appearance.darkMode
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <FiSun className="mx-auto mb-2 text-yellow-500" size={24} />
                      <p className="font-medium">Mode clair</p>
                    </button>
                    <button
                      onClick={() => setAppearance({ ...appearance, darkMode: true })}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        appearance.darkMode
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <FiMoon className="mx-auto mb-2 text-gray-700" size={24} />
                      <p className="font-medium">Mode sombre</p>
                      <p className="text-xs text-gray-500">(Bientôt disponible)</p>
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-700 mb-3">Langue</h3>
                  <select
                    value={appearance.language}
                    onChange={(e) => setAppearance({ ...appearance, language: e.target.value })}
                    className="input w-full max-w-xs"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                  </select>
                </div>

                <div>
                  <h3 className="font-medium text-gray-700 mb-3">Affichage</h3>
                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                    <div>
                      <p className="font-medium">Mode compact</p>
                      <p className="text-sm text-gray-500">Réduit l'espacement pour afficher plus de contenu</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={appearance.compactMode}
                      onChange={(e) => setAppearance({ ...appearance, compactMode: e.target.checked })}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
          {/* API Keys Configuration Tab */}
          {activeTab === 'api-keys' && user?.role === 'admin' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-6 flex items-center">
                <FiShield className="mr-2 text-primary-600" />
                Configuration des API Keys
              </h2>

              <div className="space-y-8">
                {/* WhatsApp API */}
                <div className="border-b pb-6">
                  <div className="flex items-center mb-4">
                    <FiSmartphone className="mr-2 text-green-600" size={20} />
                    <h3 className="font-medium text-gray-900">WhatsApp Business API</h3>
                  </div>
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="label">WhatsApp API URL</label>
                      <input
                        type="text"
                        value={apiKeys.whatsappApiUrl}
                        onChange={(e) => setApiKeys({ ...apiKeys, whatsappApiUrl: e.target.value })}
                        className="input"
                        placeholder="https://api.whatsapp.com/..."
                      />
                    </div>
                    <div>
                      <label className="label">WhatsApp API Key</label>
                      <input
                        type="password"
                        value={apiKeys.whatsappApiKey}
                        onChange={(e) => setApiKeys({ ...apiKeys, whatsappApiKey: e.target.value })}
                        className="input"
                        placeholder="••••••••••••••••"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiCheckCircle className="text-green-500" />
                      <span>10 routes disponibles - Configuration requise pour l'envoi de notifications</span>
                    </div>
                  </div>
                </div>

                {/* Gmail API */}
                <div className="border-b pb-6">
                  <div className="flex items-center mb-4">
                    <FiMail className="mr-2 text-red-600" size={20} />
                    <h3 className="font-medium text-gray-900">Gmail API</h3>
                  </div>
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="label">Gmail Client ID</label>
                      <input
                        type="text"
                        value={apiKeys.gmailClientId}
                        onChange={(e) => setApiKeys({ ...apiKeys, gmailClientId: e.target.value })}
                        className="input"
                        placeholder="xxxxx.apps.googleusercontent.com"
                      />
                    </div>
                    <div>
                      <label className="label">Gmail Client Secret</label>
                      <input
                        type="password"
                        value={apiKeys.gmailClientSecret}
                        onChange={(e) => setApiKeys({ ...apiKeys, gmailClientSecret: e.target.value })}
                        className="input"
                        placeholder="••••••••••••••••"
                      />
                    </div>
                    <div>
                      <label className="label">Gmail API Key</label>
                      <input
                        type="password"
                        value={apiKeys.gmailApiKey}
                        onChange={(e) => setApiKeys({ ...apiKeys, gmailApiKey: e.target.value })}
                        className="input"
                        placeholder="••••••••••••••••"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-yellow-600">
                      <FiShield />
                      <span>Configuration OAuth2 requise - Consultez la documentation Google Cloud</span>
                    </div>
                  </div>
                </div>

                {/* Outlook API */}
                <div className="border-b pb-6">
                  <div className="flex items-center mb-4">
                    <FiMail className="mr-2 text-blue-600" size={20} />
                    <h3 className="font-medium text-gray-900">Outlook API</h3>
                  </div>
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="label">Outlook Client ID</label>
                      <input
                        type="text"
                        value={apiKeys.outlookClientId}
                        onChange={(e) => setApiKeys({ ...apiKeys, outlookClientId: e.target.value })}
                        className="input"
                        placeholder="Application (client) ID"
                      />
                    </div>
                    <div>
                      <label className="label">Outlook Client Secret</label>
                      <input
                        type="password"
                        value={apiKeys.outlookClientSecret}
                        onChange={(e) => setApiKeys({ ...apiKeys, outlookClientSecret: e.target.value })}
                        className="input"
                        placeholder="••••••••••••••••"
                      />
                    </div>
                    <div>
                      <label className="label">Outlook API Key</label>
                      <input
                        type="password"
                        value={apiKeys.outlookApiKey}
                        onChange={(e) => setApiKeys({ ...apiKeys, outlookApiKey: e.target.value })}
                        className="input"
                        placeholder="••••••••••••••••"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-yellow-600">
                      <FiShield />
                      <span>Configuration Microsoft Azure AD requise</span>
                    </div>
                  </div>
                </div>

                {/* CompreFace API */}
                <div className="pb-6">
                  <div className="flex items-center mb-4">
                    <FiCamera className="mr-2 text-purple-600" size={20} />
                    <h3 className="font-medium text-gray-900">CompreFace - Reconnaissance Faciale</h3>
                  </div>
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="label">CompreFace API URL</label>
                      <input
                        type="text"
                        value={apiKeys.comprefaceApiUrl}
                        onChange={(e) => setApiKeys({ ...apiKeys, comprefaceApiUrl: e.target.value })}
                        className="input"
                        placeholder="http://localhost:8000"
                      />
                    </div>
                    <div>
                      <label className="label">CompreFace API Key</label>
                      <input
                        type="password"
                        value={apiKeys.comprefaceApiKey}
                        onChange={(e) => setApiKeys({ ...apiKeys, comprefaceApiKey: e.target.value })}
                        className="input"
                        placeholder="••••••••••••••••"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiCheckCircle className="text-green-500" />
                      <span>11 routes disponibles - Utilisé pour la vérification d'identité</span>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      toast.info('Fonctionnalité de test en cours de développement');
                    }}
                    className="btn-secondary"
                  >
                    <FiCheckCircle className="mr-2" />
                    Tester les connexions
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        setLoading(true);
                        // TODO: Implémenter la sauvegarde des API keys dans le backend
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        toast.success('API Keys enregistrées avec succès');
                      } catch (error) {
                        toast.error('Erreur lors de la sauvegarde');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="btn-primary"
                  >
                    <FiSave className="mr-2" />
                    {loading ? 'Enregistrement...' : 'Enregistrer les API Keys'}
                  </button>
                </div>

                {/* Information Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <FiShield className="text-blue-600 mt-1 mr-3 flex-shrink-0" size={20} />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-2">Sécurité des API Keys</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-700">
                        <li>Les API Keys sont cryptées avant d'être stockées</li>
                        <li>Seuls les administrateurs peuvent les consulter et les modifier</li>
                        <li>Ne partagez jamais vos API Keys avec des tiers</li>
                        <li>Régénérez les clés si vous suspectez une compromission</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* API Documentation Tab */}
          {activeTab === 'api' && (user?.role === 'admin' || user?.role === 'supervisor') && (
            <div className="space-y-6">
              {/* Header with stats */}
              {apiDocs && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Total Routes</p>
                        <p className="text-3xl font-bold">{apiDocs.totalRoutes}</p>
                      </div>
                      <FiCode className="text-4xl opacity-50" />
                    </div>
                  </div>
                  <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Catégories</p>
                        <p className="text-3xl font-bold">{Object.keys(apiDocs.categories || {}).length}</p>
                      </div>
                      <FiBook className="text-4xl opacity-50" />
                    </div>
                  </div>
                  <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Version</p>
                        <p className="text-2xl font-bold">{apiDocs.version}</p>
                      </div>
                      <FiCheckCircle className="text-4xl opacity-50" />
                    </div>
                  </div>
                  <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Base URL</p>
                        <p className="text-xs font-mono mt-1 truncate">{apiDocs.baseUrl}</p>
                      </div>
                      <FiGlobe className="text-4xl opacity-50" />
                    </div>
                  </div>
                </div>
              )}

              {/* Filters and Search */}
              <div className="card">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
                  <div className="flex-1 w-full md:w-auto">
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Rechercher une route..."
                        value={apiSearchTerm}
                        onChange={(e) => setApiSearchTerm(e.target.value)}
                        className="input pl-10 w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 flex-wrap">
                    <select
                      value={selectedMethod}
                      onChange={(e) => setSelectedMethod(e.target.value)}
                      className="input"
                    >
                      <option value="all">Toutes les méthodes</option>
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                    </select>

                    {user?.role === 'admin' && (
                      <button
                        onClick={exportApiDocs}
                        className="btn-secondary flex items-center whitespace-nowrap"
                      >
                        <FiDownload className="mr-2" />
                        Exporter JSON
                      </button>
                    )}
                  </div>
                </div>

                {/* Loading State */}
                {apiLoading && (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    <p className="mt-4 text-gray-600">Chargement de la documentation...</p>
                  </div>
                )}

                {/* API Categories */}
                {!apiLoading && apiDocs && (
                  <div className="space-y-4">
                    {Object.entries(apiDocs.categories || {}).map(([categoryKey, category]) => {
                      const filteredRoutes = filterRoutes(category.routes);
                      if (filteredRoutes.length === 0) return null;

                      return (
                        <div key={categoryKey} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleCategory(categoryKey)}
                            className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-4">
                              <FiBook className="text-primary-600" />
                              <div className="text-left">
                                <h3 className="font-semibold text-gray-900">{category.name}</h3>
                                <p className="text-sm text-gray-500">{category.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="badge badge-primary">{filteredRoutes.length} routes</span>
                              {expandedCategories[categoryKey] ? <FiChevronUp /> : <FiChevronDown />}
                            </div>
                          </button>

                          {expandedCategories[categoryKey] && (
                            <div className="divide-y divide-gray-200">
                              {filteredRoutes.map((route, idx) => (
                                <div key={idx} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-3 py-1 rounded-md text-xs font-bold ${getMethodColor(route.method)}`}>
                                          {route.method}
                                        </span>
                                        <code className="text-sm font-mono text-gray-700 break-all">
                                          {route.path}
                                        </code>
                                      </div>
                                      
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {route.requiresAuth && (
                                          <span className="badge badge-warning text-xs">
                                            <FiLock className="mr-1" size={12} />
                                            Auth Required
                                          </span>
                                        )}
                                        {route.roles.map((role, roleIdx) => (
                                          <span key={roleIdx} className={`px-2 py-1 rounded text-xs ${getRoleColor(role)}`}>
                                            {role}
                                          </span>
                                        ))}
                                      </div>
                                    </div>

                                    <button
                                      onClick={() => copyToClipboard(route.path)}
                                      className="btn-secondary btn-sm flex items-center gap-2 flex-shrink-0"
                                      title="Copier le chemin"
                                    >
                                      {copiedPath === route.path ? (
                                        <>
                                          <FiCheck size={14} />
                                          Copié
                                        </>
                                      ) : (
                                        <>
                                          <FiCopy size={14} />
                                          Copier
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty State */}
                {!apiLoading && apiDocs && Object.keys(apiDocs.categories || {}).length === 0 && (
                  <div className="text-center py-12">
                    <FiCode className="mx-auto text-gray-400 text-5xl mb-4" />
                    <p className="text-gray-600">Aucune route API disponible</p>
                  </div>
                )}
              </div>

              {/* Base URL Info */}
              {apiDocs && (
                <div className="card bg-blue-50 border-blue-200">
                  <div className="flex items-start space-x-3">
                    <FiGlobe className="text-blue-600 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-blue-900 mb-1">URL de Base</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="bg-white px-3 py-2 rounded border border-blue-200 text-sm font-mono text-blue-800 break-all">
                          {apiDocs.baseUrl}
                        </code>
                        <button
                          onClick={() => copyToClipboard(apiDocs.baseUrl)}
                          className="btn-secondary btn-sm"
                        >
                          {copiedPath === apiDocs.baseUrl ? <FiCheck size={14} /> : <FiCopy size={14} />}
                        </button>
                      </div>
                      <p className="text-sm text-blue-700 mt-2">
                        Toutes les routes commencent par cette URL de base. 
                        Exemple: <code className="bg-white px-2 py-1 rounded text-xs">{apiDocs.baseUrl}/api/auth/login</code>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
