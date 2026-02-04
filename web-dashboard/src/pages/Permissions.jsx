import React, { useState, useEffect, useMemo } from 'react';
import {
  FiShield, FiUsers, FiUser, FiUserCheck, FiSettings,
  FiCheck, FiX, FiSearch, FiRefreshCw, FiSave,
  FiChevronDown, FiChevronRight, FiLock, FiUnlock,
  FiAlertCircle, FiInfo, FiGrid, FiList, FiMapPin,
  FiCalendar, FiPlus, FiTrash2, FiEdit2, FiDatabase,
  FiCamera, FiBell, FiClock, FiArchive, FiFileText,
  FiMap, FiRadio, FiTarget, FiMonitor, FiLogIn,
  FiBookOpen, FiTrendingUp, FiEye, FiAward, FiGitBranch
} from 'react-icons/fi';
import { permissionsAPI, usersAPI, zonesAPI, eventsAPI, assignmentsAPI } from '../services/api';
import { toast } from 'react-toastify';

// Mapping des modules pour l'affichage
const MODULE_INFO = {
  dashboard: { name: 'Tableau de bord', icon: FiGrid, color: 'blue' },
  users: { name: 'Utilisateurs', icon: FiUsers, color: 'purple' },
  events: { name: 'Événements', icon: FiCalendar, color: 'green' },
  zones: { name: 'Zones', icon: FiMapPin, color: 'emerald' },
  assignments: { name: 'Affectations', icon: FiUserCheck, color: 'yellow' },
  attendance: { name: 'Pointage', icon: FiCheck, color: 'teal' },
  reports: { name: 'Rapports', icon: FiList, color: 'indigo' },
  incidents: { name: 'Incidents', icon: FiAlertCircle, color: 'red' },
  notifications: { name: 'Notifications', icon: FiBell, color: 'orange' },
  messages: { name: 'Messages', icon: FiUsers, color: 'pink' },
  tracking: { name: 'Géolocalisation', icon: FiMap, color: 'cyan' },
  sos: { name: 'Alertes SOS', icon: FiRadio, color: 'red' },
  badges: { name: 'Badges', icon: FiShield, color: 'yellow' },
  documents: { name: 'Documents', icon: FiFileText, color: 'gray' },
  admin: { name: 'Administration', icon: FiLock, color: 'red' },
  
  // Nouvelles pages ajoutées
  database: { name: 'Sauvegarde Base de Données', icon: FiDatabase, color: 'purple' },
  checkin: { name: 'Check-In/Out', icon: FiLogIn, color: 'green' },
  facial: { name: 'Gestion Faciale', icon: FiCamera, color: 'indigo' },
  logs: { name: 'Journaux Admin', icon: FiArchive, color: 'slate' },
  agent_tracking: { name: 'Carte de Suivi Agents', icon: FiTarget, color: 'emerald' },
  supervisor_agents: { name: 'Gestion Superviseur', icon: FiUserCheck, color: 'orange' },
  attendance_verification: { name: 'Vérification Pointage', icon: FiClock, color: 'blue' },
  creation_history: { name: 'Historique de Création', icon: FiList, color: 'gray' },
  settings: { name: 'Paramètres', icon: FiSettings, color: 'slate' },
  permissions: { name: 'Gestion Permissions', icon: FiLock, color: 'red' },
  profile: { name: 'Profil Utilisateur', icon: FiUser, color: 'blue' },
  monitoring: { name: 'Surveillance Système', icon: FiMonitor, color: 'red' },
  
  // Pages du menu manquantes
  planning: { name: 'Planning', icon: FiBookOpen, color: 'blue' },
  presences: { name: 'Présences', icon: FiEye, color: 'teal' },
  verification: { name: 'Vérification', icon: FiCheck, color: 'green' },
  pointage: { name: 'Pointage', icon: FiClock, color: 'blue' },
  gps_tracking: { name: 'Suivi GPS', icon: FiMap, color: 'cyan' },
  classification: { name: 'Classement', icon: FiTrendingUp, color: 'yellow' },
  advanced_notifications: { name: 'Notifications Avancées', icon: FiBell, color: 'orange' },
  audit_trail: { name: 'Logs & Audit Trail', icon: FiGitBranch, color: 'gray' }
};

// Couleurs pour les zones
const ZONE_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6', '#8B5CF6'
];

// Types de zones
const ZONE_TYPES = {
  general: { label: 'Général', color: 'gray' },
  entry: { label: 'Entrée', color: 'green' },
  exit: { label: 'Sortie', color: 'red' },
  vip: { label: 'VIP', color: 'purple' },
  parking: { label: 'Parking', color: 'blue' },
  backstage: { label: 'Backstage', color: 'orange' },
  security_post: { label: 'Poste sécurité', color: 'yellow' },
  control: { label: 'Contrôle', color: 'indigo' },
  medical: { label: 'Médical', color: 'pink' },
  other: { label: 'Autre', color: 'gray' }
};

// Priorités des zones
const ZONE_PRIORITIES = {
  low: { label: 'Basse', color: 'gray', bg: 'bg-gray-100', text: 'text-gray-700' },
  medium: { label: 'Moyenne', color: 'blue', bg: 'bg-blue-100', text: 'text-blue-700' },
  high: { label: 'Haute', color: 'orange', bg: 'bg-orange-100', text: 'text-orange-700' },
  critical: { label: 'Critique', color: 'red', bg: 'bg-red-100', text: 'text-red-700' }
};

// Composant pour afficher une permission avec checkbox
const PermissionCheckbox = ({ permission, isChecked, onChange, disabled }) => {
  return (
    <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
      disabled
        ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
        : isChecked
          ? 'bg-green-50 border-green-300 hover:bg-green-100'
          : 'bg-white border-gray-200 hover:bg-gray-50'
    }`}>
      <input
        type="checkbox"
        checked={isChecked}
        onChange={(e) => onChange(permission.code, e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
      />
      <div className="ml-3 flex-1">
        <p className={`font-medium text-sm ${isChecked ? 'text-green-700' : 'text-gray-700'}`}>
          {permission.name}
        </p>
        <p className="text-xs text-gray-500">{permission.code}</p>
      </div>
      {isChecked && <FiCheck className="text-green-600" size={18} />}
    </label>
  );
};

// Composant groupe de permissions par module
const ModulePermissionGroup = ({ module, permissions, selectedPermissions, onChange, disabled, defaultExpanded = true }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const moduleInfo = MODULE_INFO[module] || { name: module, icon: FiSettings, color: 'gray' };
  const ModuleIcon = moduleInfo.icon;

  const selectedCount = permissions.filter(p => selectedPermissions.includes(p.code)).length;
  const allSelected = selectedCount === permissions.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const toggleAll = () => {
    if (disabled) return;
    if (allSelected) {
      // Désélectionner tout
      permissions.forEach(p => onChange(p.code, false));
    } else {
      // Sélectionner tout
      permissions.forEach(p => onChange(p.code, true));
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header du module */}
      <div
        className={`p-4 bg-gradient-to-r from-${moduleInfo.color}-50 to-white cursor-pointer hover:from-${moduleInfo.color}-100 transition-colors`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button className="mr-3 p-1 hover:bg-gray-200 rounded transition-colors">
              {expanded ? (
                <FiChevronDown className="text-gray-600" size={18} />
              ) : (
                <FiChevronRight className="text-gray-600" size={18} />
              )}
            </button>
            <div className={`w-10 h-10 rounded-lg bg-${moduleInfo.color}-100 flex items-center justify-center mr-3`}>
              <ModuleIcon className={`text-${moduleInfo.color}-600`} size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">{moduleInfo.name}</h3>
              <p className="text-xs text-gray-500">{permissions.length} permission(s)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              allSelected ? 'bg-green-100 text-green-700' :
              someSelected ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {selectedCount}/{permissions.length}
            </span>
            {!disabled && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleAll(); }}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  allSelected
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                }`}
              >
                {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Liste des permissions */}
      {expanded && (
        <div className="p-4 bg-gray-50 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {permissions.map(permission => (
            <PermissionCheckbox
              key={permission.id}
              permission={permission}
              isChecked={selectedPermissions.includes(permission.code)}
              onChange={onChange}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Permissions = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allPermissions, setAllPermissions] = useState([]);
  const [groupedPermissions, setGroupedPermissions] = useState({});
  const [rolesPermissions, setRolesPermissions] = useState({});
  const [selectedRole, setSelectedRole] = useState('agent');
  const [editedPermissions, setEditedPermissions] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Pour la gestion des permissions utilisateur
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState({ granted: [], denied: [] });
  const [viewMode, setViewMode] = useState('roles'); // 'roles', 'users' ou 'zones'
  const [searchUser, setSearchUser] = useState('');

  // Pour la gestion des zones
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [zoneAssignments, setZoneAssignments] = useState([]);
  const [searchEvent, setSearchEvent] = useState('');
  const [searchAgent, setSearchAgent] = useState('');
  const [availableAgents, setAvailableAgents] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showZoneFormModal, setShowZoneFormModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [zoneForm, setZoneForm] = useState({
    name: '',
    description: '',
    type: 'general',
    color: ZONE_COLORS[0],
    requiredAgents: 1,
    requiredSupervisors: 0,
    priority: 'medium',
    instructions: ''
  });

  const roles = [
    { id: 'admin', name: 'Administrateur', icon: FiShield, color: 'red', description: 'Accès complet à toutes les fonctionnalités' },
    { id: 'supervisor', name: 'Superviseur', icon: FiUserCheck, color: 'yellow', description: 'Gestion des agents et événements' },
    { id: 'agent', name: 'Agent', icon: FiUser, color: 'blue', description: 'Pointage et tâches quotidiennes' },
    { id: 'user', name: 'Utilisateur', icon: FiUsers, color: 'purple', description: 'Accès limité personnalisable' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (rolesPermissions[selectedRole]) {
      setEditedPermissions([...rolesPermissions[selectedRole]]);
      setHasChanges(false);
    }
  }, [selectedRole, rolesPermissions]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger toutes les permissions, utilisateurs et événements
      const [permissionsRes, rolesRes, usersRes, eventsRes] = await Promise.all([
        permissionsAPI.getAllPermissions(),
        permissionsAPI.getAllRolesPermissions(),
        usersAPI.getAll({ limit: 100 }),
        eventsAPI.getAll({ limit: 100 })
      ]);

      if (permissionsRes.data.success) {
        setAllPermissions(permissionsRes.data.data.permissions);
        setGroupedPermissions(permissionsRes.data.data.grouped);
      }

      if (rolesRes.data.success) {
        setRolesPermissions(rolesRes.data.data);
        if (rolesRes.data.data[selectedRole]) {
          setEditedPermissions([...rolesRes.data.data[selectedRole]]);
        }
      }

      if (usersRes.data.success) {
        setUsers(usersRes.data.data.users || []);
        // Filtrer les agents et superviseurs pour les assignations
        const agentsAndSupervisors = (usersRes.data.data.users || []).filter(
          u => u.role === 'agent' || u.role === 'supervisor'
        );
        setAvailableAgents(agentsAndSupervisors);
      }

      if (eventsRes.data.success) {
        const allEvents = eventsRes.data.data.events || eventsRes.data.data || [];
        // Filtrer les événements terminés, annulés et ceux dont la date est passée
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const activeEvents = allEvents.filter(e => {
          if (e.status === 'completed' || e.status === 'cancelled') return false;
          const endDate = new Date(e.endDate);
          if (endDate < now) return false;
          return true;
        });
        setEvents(activeEvents);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
      // Si les permissions n'existent pas, proposer l'initialisation
      if (error.response?.status === 404) {
        toast.info('Permissions non initialisées. Cliquez sur "Initialiser" pour créer les permissions par défaut.');
      } else {
        toast.error('Erreur lors du chargement des permissions');
      }
    } finally {
      setLoading(false);
    }
  };

  const initializePermissions = async () => {
    try {
      setSaving(true);
      const response = await permissionsAPI.initialize();
      if (response.data.success) {
        toast.success('Permissions initialisées avec succès');
        loadData();
      }
    } catch (error) {
      toast.error('Erreur lors de l\'initialisation');
    } finally {
      setSaving(false);
    }
  };

  const handlePermissionChange = (code, checked) => {
    setEditedPermissions(prev => {
      if (checked) {
        return [...prev, code];
      } else {
        return prev.filter(c => c !== code);
      }
    });
    setHasChanges(true);
  };

  const saveRolePermissions = async () => {
    try {
      setSaving(true);
      const response = await permissionsAPI.updateRolePermissions(selectedRole, {
        permissionCodes: editedPermissions
      });

      if (response.data.success) {
        toast.success(`Permissions du rôle ${selectedRole} mises à jour`);
        setRolesPermissions(prev => ({
          ...prev,
          [selectedRole]: editedPermissions
        }));
        setHasChanges(false);
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    if (rolesPermissions[selectedRole]) {
      setEditedPermissions([...rolesPermissions[selectedRole]]);
      setHasChanges(false);
    }
  };

  // Gestion permissions utilisateur
  const loadUserPermissions = async (user) => {
    setSelectedUser(user);
    try {
      const response = await permissionsAPI.getUserPermissions(user.id);
      if (response.data.success) {
        setUserPermissions({
          granted: response.data.data.customPermissions.granted || [],
          denied: response.data.data.customPermissions.denied || []
        });
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des permissions utilisateur');
    }
  };

  const saveUserPermissions = async () => {
    if (!selectedUser) return;

    try {
      setSaving(true);
      const response = await permissionsAPI.updateUserPermissions(selectedUser.id, {
        grantedPermissions: userPermissions.granted,
        deniedPermissions: userPermissions.denied
      });

      if (response.data.success) {
        toast.success('Permissions utilisateur mises à jour');
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchUser) return users;
    const search = searchUser.toLowerCase();
    return users.filter(u =>
      u.firstName?.toLowerCase().includes(search) ||
      u.lastName?.toLowerCase().includes(search) ||
      u.email?.toLowerCase().includes(search) ||
      u.employeeId?.toLowerCase().includes(search)
    );
  }, [users, searchUser]);

  // Filtrer les événements
  const filteredEvents = useMemo(() => {
    if (!searchEvent) return events;
    const search = searchEvent.toLowerCase();
    return events.filter(e =>
      e.name?.toLowerCase().includes(search) ||
      e.location?.toLowerCase().includes(search)
    );
  }, [events, searchEvent]);

  // Filtrer les agents disponibles
  const filteredAvailableAgents = useMemo(() => {
    if (!searchAgent) return availableAgents;
    const search = searchAgent.toLowerCase();
    return availableAgents.filter(a =>
      a.firstName?.toLowerCase().includes(search) ||
      a.lastName?.toLowerCase().includes(search) ||
      a.employeeId?.toLowerCase().includes(search)
    );
  }, [availableAgents, searchAgent]);

  // Charger les zones d'un événement
  const loadEventZones = async (event) => {
    setSelectedEvent(event);
    setSelectedZone(null);
    try {
      const response = await zonesAPI.getByEvent(event.id);
      if (response.data.success) {
        setZones(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading zones:', error);
      toast.error('Erreur lors du chargement des zones');
    }
  };

  // Charger les assignations d'une zone
  const loadZoneAssignments = async (zone) => {
    setSelectedZone(zone);
    try {
      const response = await zonesAPI.getById(zone.id);
      if (response.data.success) {
        setZoneAssignments(response.data.data.assignments || []);
      }
    } catch (error) {
      console.error('Error loading zone assignments:', error);
    }
  };

  // Créer ou modifier une zone
  const handleSaveZone = async () => {
    if (!zoneForm.name.trim()) {
      toast.error('Le nom de la zone est requis');
      return;
    }

    try {
      setSaving(true);
      let response;

      if (editingZone) {
        response = await zonesAPI.update(editingZone.id, zoneForm);
      } else {
        response = await zonesAPI.create({
          ...zoneForm,
          eventId: selectedEvent.id
        });
      }

      if (response.data.success) {
        toast.success(editingZone ? 'Zone modifiée' : 'Zone créée');
        setShowZoneFormModal(false);
        setEditingZone(null);
        resetZoneForm();
        loadEventZones(selectedEvent);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Supprimer une zone
  const handleDeleteZone = async (zone) => {
    if (!window.confirm(`Supprimer la zone "${zone.name}" ?`)) return;

    try {
      const response = await zonesAPI.delete(zone.id);
      if (response.data.success) {
        toast.success('Zone supprimée');
        loadEventZones(selectedEvent);
        if (selectedZone?.id === zone.id) {
          setSelectedZone(null);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  // Réinitialiser le formulaire de zone
  const resetZoneForm = () => {
    setZoneForm({
      name: '',
      description: '',
      type: 'general',
      color: ZONE_COLORS[0],
      requiredAgents: 1,
      requiredSupervisors: 0,
      priority: 'medium',
      instructions: ''
    });
  };

  // Ouvrir le modal d'édition de zone
  const openEditZone = (zone) => {
    setEditingZone(zone);
    setZoneForm({
      name: zone.name || '',
      description: zone.description || '',
      type: zone.type || 'general',
      color: zone.color || ZONE_COLORS[0],
      requiredAgents: zone.requiredAgents || 1,
      requiredSupervisors: zone.requiredSupervisors || 0,
      priority: zone.priority || 'medium',
      instructions: zone.instructions || ''
    });
    setShowZoneFormModal(true);
  };

  // Ouvrir le modal de nouvelle zone
  const openNewZone = () => {
    setEditingZone(null);
    resetZoneForm();
    setShowZoneFormModal(true);
  };

  // Assigner un utilisateur à une zone
  const assignUserToZone = async (userId) => {
    if (!selectedZone || !selectedEvent) return;

    try {
      setSaving(true);
      const user = availableAgents.find(a => a.id === userId);
      const assignmentRole = user?.role === 'supervisor' ? 'supervisor' : 'primary';

      const response = await assignmentsAPI.create({
        agentId: userId,
        eventId: selectedEvent.id,
        zoneId: selectedZone.id,
        role: assignmentRole
      });

      if (response.data.success) {
        toast.success('Utilisateur assigné à la zone');
        loadZoneAssignments(selectedZone);
        loadEventZones(selectedEvent);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'assignation');
    } finally {
      setSaving(false);
    }
  };

  // Retirer un utilisateur d'une zone
  const removeUserFromZone = async (assignmentId) => {
    try {
      const response = await assignmentsAPI.delete(assignmentId);
      if (response.data.success) {
        toast.success('Utilisateur retiré de la zone');
        loadZoneAssignments(selectedZone);
        loadEventZones(selectedEvent);
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Vérifier si un utilisateur est déjà assigné à la zone
  const isUserAssignedToZone = (userId) => {
    return zoneAssignments.some(a => a.userId === userId || a.user?.id === userId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FiShield className="mr-3 text-primary-600" />
            Gestion des Permissions
          </h1>
          <p className="text-gray-500 mt-1">
            Configurez les permissions pour chaque rôle et utilisateur
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="btn-secondary flex items-center"
          >
            <FiRefreshCw className="mr-2" />
            Actualiser
          </button>
          {allPermissions.length === 0 && (
            <button
              onClick={initializePermissions}
              disabled={saving}
              className="btn-primary flex items-center"
            >
              <FiSettings className="mr-2" />
              Initialiser les permissions
            </button>
          )}
        </div>
      </div>

      {/* Toggle View Mode */}
      <div className="flex items-center bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setViewMode('roles')}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'roles'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FiShield className="mr-2" size={16} />
          Par Rôle
        </button>
        <button
          onClick={() => setViewMode('users')}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'users'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FiUser className="mr-2" size={16} />
          Par Utilisateur
        </button>
        <button
          onClick={() => setViewMode('zones')}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'zones'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FiMapPin className="mr-2" size={16} />
          Par Zone
        </button>
      </div>

      {viewMode === 'roles' ? (
        /* Vue par rôle */
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - Sélection du rôle */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
              <h2 className="font-semibold text-gray-800 mb-4">Sélectionner un rôle</h2>
              <div className="space-y-2">
                {roles.map(role => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`w-full flex items-center p-3 rounded-xl transition-all ${
                      selectedRole === role.id
                        ? `bg-${role.color}-50 border-2 border-${role.color}-500`
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg bg-${role.color}-100 flex items-center justify-center mr-3`}>
                      <role.icon className={`text-${role.color}-600`} size={20} />
                    </div>
                    <div className="text-left flex-1">
                      <p className={`font-medium ${selectedRole === role.id ? `text-${role.color}-700` : 'text-gray-700'}`}>
                        {role.name}
                      </p>
                      <p className="text-xs text-gray-500">{role.description}</p>
                    </div>
                    {selectedRole === role.id && (
                      <FiCheck className={`text-${role.color}-600`} size={20} />
                    )}
                  </button>
                ))}
              </div>

              {/* Stats du rôle sélectionné */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Résumé</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Permissions actives</span>
                  <span className="font-bold text-primary-600">{editedPermissions.length}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-gray-500">Total disponible</span>
                  <span className="font-bold text-gray-600">{allPermissions.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Permissions */}
          <div className="col-span-12 lg:col-span-9 space-y-4">
            {/* Actions bar */}
            {hasChanges && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <FiAlertCircle className="text-yellow-600 mr-3" size={20} />
                  <span className="text-yellow-700">
                    Vous avez des modifications non sauvegardées
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetChanges}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={saveRolePermissions}
                    disabled={saving}
                    className="btn-primary flex items-center"
                  >
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <FiSave className="mr-2" />
                    )}
                    Sauvegarder
                  </button>
                </div>
              </div>
            )}

            {/* Permissions groupées par module */}
            {Object.entries(groupedPermissions).map(([module, permissions]) => (
              <ModulePermissionGroup
                key={module}
                module={module}
                permissions={permissions}
                selectedPermissions={editedPermissions}
                onChange={handlePermissionChange}
                disabled={selectedRole === 'admin'} // Admin a toutes les permissions
                defaultExpanded={false}
              />
            ))}

            {selectedRole === 'admin' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center">
                <FiInfo className="text-blue-600 mr-3" size={20} />
                <span className="text-blue-700">
                  Le rôle Administrateur dispose automatiquement de toutes les permissions et ne peut pas être modifié.
                </span>
              </div>
            )}
          </div>
        </div>
      ) : viewMode === 'users' ? (
        /* Vue par utilisateur */
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - Liste des utilisateurs */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-gray-800 mb-3">Sélectionner un utilisateur</h2>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>

              <div className="max-h-[600px] overflow-y-auto">
                {filteredUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => loadUserPermissions(user)}
                    className={`w-full flex items-center p-4 border-b hover:bg-gray-50 transition-colors ${
                      selectedUser?.id === user.id ? 'bg-primary-50' : ''
                    }`}
                  >
                    {user.profilePhoto ? (
                      <img
                        src={user.profilePhoto}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover mr-3"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium mr-3">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-800">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-red-100 text-red-700' :
                      user.role === 'supervisor' ? 'bg-yellow-100 text-yellow-700' :
                      user.role === 'agent' ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {user.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Permissions utilisateur */}
          <div className="col-span-12 lg:col-span-8">
            {selectedUser ? (
              <div className="space-y-4">
                {/* Info utilisateur */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {selectedUser.profilePhoto ? (
                        <img
                          src={selectedUser.profilePhoto}
                          alt=""
                          className="w-16 h-16 rounded-xl object-cover mr-4"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xl mr-4">
                          {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                        </div>
                      )}
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">
                          {selectedUser.firstName} {selectedUser.lastName}
                        </h2>
                        <p className="text-gray-500">{selectedUser.email}</p>
                        <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${
                          selectedUser.role === 'admin' ? 'bg-red-100 text-red-700' :
                          selectedUser.role === 'supervisor' ? 'bg-yellow-100 text-yellow-700' :
                          selectedUser.role === 'agent' ? 'bg-blue-100 text-blue-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {selectedUser.role}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={saveUserPermissions}
                      disabled={saving}
                      className="btn-primary flex items-center"
                    >
                      {saving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <FiSave className="mr-2" />
                      )}
                      Sauvegarder
                    </button>
                  </div>
                </div>

                {/* Info sur les permissions personnalisées */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start">
                    <FiInfo className="text-blue-600 mr-3 mt-0.5" size={18} />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">Permissions personnalisées</p>
                      <p>
                        L'utilisateur hérite des permissions de son rôle ({selectedUser.role}).
                        Vous pouvez ajouter des permissions supplémentaires ou en bloquer certaines.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sections permissions accordées/refusées */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Permissions accordées */}
                  <div className="bg-white rounded-xl border border-green-200 overflow-hidden">
                    <div className="p-4 bg-green-50 border-b border-green-200">
                      <h3 className="font-semibold text-green-700 flex items-center">
                        <FiUnlock className="mr-2" />
                        Permissions supplémentaires
                      </h3>
                      <p className="text-xs text-green-600 mt-1">
                        En plus des permissions du rôle
                      </p>
                    </div>
                    <div className="p-4 max-h-[400px] overflow-y-auto">
                      {allPermissions.map(perm => (
                        <label key={perm.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={userPermissions.granted.includes(perm.code)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setUserPermissions(prev => ({
                                  ...prev,
                                  granted: [...prev.granted, perm.code],
                                  denied: prev.denied.filter(c => c !== perm.code)
                                }));
                              } else {
                                setUserPermissions(prev => ({
                                  ...prev,
                                  granted: prev.granted.filter(c => c !== perm.code)
                                }));
                              }
                            }}
                            className="w-4 h-4 text-green-600 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{perm.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Permissions refusées */}
                  <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
                    <div className="p-4 bg-red-50 border-b border-red-200">
                      <h3 className="font-semibold text-red-700 flex items-center">
                        <FiLock className="mr-2" />
                        Permissions bloquées
                      </h3>
                      <p className="text-xs text-red-600 mt-1">
                        Retirées malgré les permissions du rôle
                      </p>
                    </div>
                    <div className="p-4 max-h-[400px] overflow-y-auto">
                      {allPermissions.map(perm => (
                        <label key={perm.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={userPermissions.denied.includes(perm.code)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setUserPermissions(prev => ({
                                  ...prev,
                                  denied: [...prev.denied, perm.code],
                                  granted: prev.granted.filter(c => c !== perm.code)
                                }));
                              } else {
                                setUserPermissions(prev => ({
                                  ...prev,
                                  denied: prev.denied.filter(c => c !== perm.code)
                                }));
                              }
                            }}
                            className="w-4 h-4 text-red-600 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{perm.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <FiUser className="mx-auto text-gray-300 mb-4" size={60} />
                <h3 className="text-lg font-medium text-gray-600">Sélectionnez un utilisateur</h3>
                <p className="text-gray-500 mt-2">
                  Choisissez un utilisateur dans la liste pour gérer ses permissions personnalisées
                </p>
              </div>
            )}
          </div>
        </div>
      ) : viewMode === 'zones' ? (
        /* Vue par zone */
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - Liste des événements */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-4">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-gray-800 mb-3">Sélectionner un événement</h2>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchEvent}
                    onChange={(e) => setSearchEvent(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>

              <div className="max-h-[500px] overflow-y-auto">
                {filteredEvents.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <FiCalendar className="mx-auto mb-2" size={24} />
                    <p className="text-sm">Aucun événement trouvé</p>
                  </div>
                ) : (
                  filteredEvents.map(event => (
                    <button
                      key={event.id}
                      onClick={() => loadEventZones(event)}
                      className={`w-full flex items-center p-4 border-b hover:bg-gray-50 transition-colors text-left ${
                        selectedEvent?.id === event.id ? 'bg-primary-50 border-l-4 border-l-primary-500' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mr-3">
                        <FiCalendar className="text-green-600" size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{event.name}</p>
                        <p className="text-xs text-gray-500 truncate">{event.location}</p>
                        <p className="text-xs text-gray-400">
                          {event.startDate ? new Date(event.startDate).toLocaleDateString('fr-FR') : ''}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Zone centrale - Liste des zones */}
          <div className="col-span-12 lg:col-span-4">
            {selectedEvent ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-800">Zones de l'événement</h2>
                    <p className="text-xs text-gray-500">{zones.length} zone(s)</p>
                  </div>
                  <button
                    onClick={openNewZone}
                    className="btn-primary btn-sm flex items-center"
                  >
                    <FiPlus className="mr-1" size={16} />
                    Nouvelle zone
                  </button>
                </div>

                <div className="max-h-[600px] overflow-y-auto">
                  {zones.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <FiMapPin className="mx-auto mb-2" size={32} />
                      <p>Aucune zone définie</p>
                      <p className="text-xs mt-1">Créez des zones pour organiser la sécurité</p>
                    </div>
                  ) : (
                    zones.map(zone => {
                      const priority = ZONE_PRIORITIES[zone.priority] || ZONE_PRIORITIES.medium;
                      const zoneType = ZONE_TYPES[zone.type] || ZONE_TYPES.general;
                      const assignedAgents = zone.assignedAgents || zone.assignments?.filter(a => a.role === 'agent' || a.user?.role === 'agent').length || 0;
                      const assignedSupervisors = zone.assignedSupervisors || zone.assignments?.filter(a => a.role === 'supervisor' || a.user?.role === 'supervisor').length || 0;
                      const isFilled = assignedAgents >= (zone.requiredAgents || 1);

                      return (
                        <div
                          key={zone.id}
                          onClick={() => loadZoneAssignments(zone)}
                          className={`w-full p-4 border-b hover:bg-gray-50 transition-colors text-left cursor-pointer ${
                            selectedZone?.id === zone.id ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''
                          }`}
                        >
                          <div className="flex items-start">
                            <div
                              className="w-4 h-4 rounded-full mr-3 mt-1 flex-shrink-0"
                              style={{ backgroundColor: zone.color || '#22C55E' }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-gray-800 truncate">{zone.name}</p>
                                {isFilled && <FiCheck className="text-green-500 flex-shrink-0" size={14} />}
                              </div>
                              <div className="flex flex-wrap gap-1 mb-2">
                                <span className={`px-2 py-0.5 rounded text-xs ${priority.bg} ${priority.text}`}>
                                  {priority.label}
                                </span>
                                <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                  {zoneType.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center">
                                  <FiUser className="mr-1" size={12} />
                                  {assignedAgents}/{zone.requiredAgents || 1}
                                </span>
                                <span className="flex items-center">
                                  <FiUserCheck className="mr-1" size={12} />
                                  {assignedSupervisors}/{zone.requiredSupervisors || 0}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); openEditZone(zone); }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <FiEdit2 size={14} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteZone(zone); }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <FiCalendar className="mx-auto text-gray-300 mb-4" size={60} />
                <h3 className="text-lg font-medium text-gray-600">Sélectionnez un événement</h3>
                <p className="text-gray-500 mt-2">
                  Choisissez un événement pour gérer ses zones
                </p>
              </div>
            )}
          </div>

          {/* Panneau droit - Assignations de la zone */}
          <div className="col-span-12 lg:col-span-5">
            {selectedZone ? (
              <div className="space-y-4">
                {/* Info zone */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div
                        className="w-6 h-6 rounded-full mr-3"
                        style={{ backgroundColor: selectedZone.color || '#22C55E' }}
                      />
                      <div>
                        <h2 className="text-lg font-bold text-gray-800">{selectedZone.name}</h2>
                        <p className="text-sm text-gray-500">{selectedZone.description || 'Aucune description'}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      ZONE_PRIORITIES[selectedZone.priority]?.bg || 'bg-gray-100'
                    } ${ZONE_PRIORITIES[selectedZone.priority]?.text || 'text-gray-700'}`}>
                      {ZONE_PRIORITIES[selectedZone.priority]?.label || 'Moyenne'}
                    </span>
                  </div>
                  {selectedZone.instructions && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm text-yellow-800">
                        <strong>Instructions:</strong> {selectedZone.instructions}
                      </p>
                    </div>
                  )}
                </div>

                {/* Agents assignés */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b bg-emerald-50">
                    <h3 className="font-semibold text-emerald-700 flex items-center">
                      <FiUsers className="mr-2" />
                      Agents assignés ({zoneAssignments.length})
                    </h3>
                    <p className="text-xs text-emerald-600 mt-1">
                      Requis: {selectedZone.requiredAgents || 1} agent(s), {selectedZone.requiredSupervisors || 0} superviseur(s)
                    </p>
                  </div>

                  <div className="max-h-[250px] overflow-y-auto">
                    {zoneAssignments.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        <FiUsers className="mx-auto mb-2" size={24} />
                        <p className="text-sm">Aucun agent assigné</p>
                      </div>
                    ) : (
                      zoneAssignments.map(assignment => {
                        const user = assignment.user || assignment;
                        return (
                          <div key={assignment.id} className="flex items-center p-3 border-b hover:bg-gray-50">
                            {user.profilePhoto ? (
                              <img
                                src={user.profilePhoto}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover mr-3"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-medium mr-3">
                                {user.firstName?.[0]}{user.lastName?.[0]}
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-sm text-gray-800">
                                {user.firstName} {user.lastName}
                              </p>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                user.role === 'supervisor' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {user.role === 'supervisor' ? 'Superviseur' : 'Agent'}
                              </span>
                            </div>
                            <button
                              onClick={() => removeUserFromZone(assignment.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <FiX size={16} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Ajouter des agents */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold text-gray-700 flex items-center">
                      <FiPlus className="mr-2" />
                      Assigner un agent
                    </h3>
                    <div className="relative mt-2">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Rechercher un agent..."
                        value={searchAgent}
                        onChange={(e) => setSearchAgent(e.target.value)}
                        className="input pl-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="max-h-[200px] overflow-y-auto">
                    {filteredAvailableAgents.map(agent => {
                      const isAssigned = isUserAssignedToZone(agent.id);
                      return (
                        <button
                          key={agent.id}
                          onClick={() => !isAssigned && assignUserToZone(agent.id)}
                          disabled={isAssigned || saving}
                          className={`w-full flex items-center p-3 border-b transition-colors text-left ${
                            isAssigned
                              ? 'bg-gray-50 opacity-50 cursor-not-allowed'
                              : 'hover:bg-emerald-50 cursor-pointer'
                          }`}
                        >
                          {agent.profilePhoto ? (
                            <img
                              src={agent.profilePhoto}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover mr-3"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-medium mr-3">
                              {agent.firstName?.[0]}{agent.lastName?.[0]}
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-800">
                              {agent.firstName} {agent.lastName}
                            </p>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              agent.role === 'supervisor' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {agent.role === 'supervisor' ? 'Superviseur' : 'Agent'}
                            </span>
                          </div>
                          {isAssigned ? (
                            <FiCheck className="text-green-500" size={16} />
                          ) : (
                            <FiPlus className="text-emerald-500" size={16} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : selectedEvent ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <FiMapPin className="mx-auto text-gray-300 mb-4" size={60} />
                <h3 className="text-lg font-medium text-gray-600">Sélectionnez une zone</h3>
                <p className="text-gray-500 mt-2">
                  Choisissez une zone pour gérer ses assignations
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <FiInfo className="mx-auto text-gray-300 mb-4" size={60} />
                <h3 className="text-lg font-medium text-gray-600">Gestion des zones</h3>
                <p className="text-gray-500 mt-2">
                  Sélectionnez un événement pour commencer
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Modal création/édition de zone */}
      {showZoneFormModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingZone ? 'Modifier la zone' : 'Nouvelle zone'}
                </h2>
                <button
                  onClick={() => { setShowZoneFormModal(false); setEditingZone(null); }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la zone *
                </label>
                <input
                  type="text"
                  value={zoneForm.name}
                  onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                  className="input"
                  placeholder="Ex: Entrée principale"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={zoneForm.description}
                  onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
                  className="input"
                  rows={2}
                  placeholder="Description optionnelle"
                />
              </div>

              {/* Type et priorité */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={zoneForm.type}
                    onChange={(e) => setZoneForm({ ...zoneForm, type: e.target.value })}
                    className="input"
                  >
                    {Object.entries(ZONE_TYPES).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priorité
                  </label>
                  <select
                    value={zoneForm.priority}
                    onChange={(e) => setZoneForm({ ...zoneForm, priority: e.target.value })}
                    className="input"
                  >
                    {Object.entries(ZONE_PRIORITIES).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Couleur */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Couleur
                </label>
                <div className="flex gap-2 flex-wrap">
                  {ZONE_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setZoneForm({ ...zoneForm, color })}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        zoneForm.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Agents requis */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agents requis
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={zoneForm.requiredAgents}
                    onChange={(e) => setZoneForm({ ...zoneForm, requiredAgents: parseInt(e.target.value) || 0 })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Superviseurs requis
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={zoneForm.requiredSupervisors}
                    onChange={(e) => setZoneForm({ ...zoneForm, requiredSupervisors: parseInt(e.target.value) || 0 })}
                    className="input"
                  />
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructions spéciales
                </label>
                <textarea
                  value={zoneForm.instructions}
                  onChange={(e) => setZoneForm({ ...zoneForm, instructions: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Instructions pour les agents assignés à cette zone..."
                />
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => { setShowZoneFormModal(false); setEditingZone(null); }}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveZone}
                disabled={saving}
                className="btn-primary flex items-center"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <FiSave className="mr-2" />
                )}
                {editingZone ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Permissions;
