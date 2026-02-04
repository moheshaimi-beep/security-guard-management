import React, { useState, useEffect } from 'react';
import {
  FiPlus, FiEdit2, FiTrash2, FiLayers, FiMapPin, FiUsers,
  FiShield, FiX, FiCheck, FiRefreshCw, FiAlertCircle, FiClock,
  FiUserPlus, FiUserMinus, FiSearch, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import { zonesAPI, usersAPI, assignmentsAPI } from '../services/api';
import { toast } from 'react-toastify';

// Types de zones disponibles
const ZONE_TYPES = [
  { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-700' },
  { value: 'entry', label: 'Entree', color: 'bg-blue-100 text-blue-700' },
  { value: 'exit', label: 'Sortie', color: 'bg-green-100 text-green-700' },
  { value: 'vip', label: 'VIP', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'parking', label: 'Parking', color: 'bg-purple-100 text-purple-700' },
  { value: 'backstage', label: 'Backstage', color: 'bg-pink-100 text-pink-700' },
  { value: 'security_post', label: 'Poste Securite', color: 'bg-red-100 text-red-700' },
  { value: 'other', label: 'Autre', color: 'bg-gray-100 text-gray-600' },
];

// Couleurs disponibles pour les zones
const ZONE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

// Niveaux de priorite
const PRIORITY_LEVELS = [
  { value: 'low', label: 'Basse', color: 'bg-gray-100 text-gray-600' },
  { value: 'medium', label: 'Moyenne', color: 'bg-blue-100 text-blue-600' },
  { value: 'high', label: 'Haute', color: 'bg-orange-100 text-orange-600' },
  { value: 'critical', label: 'Critique', color: 'bg-red-100 text-red-600' },
];

// Modal pour creer/editer une zone
const ZoneFormModal = ({ isOpen, onClose, onSave, editData, eventId }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'general',
    color: '#3B82F6',
    requiredAgents: 1,
    requiredSupervisors: 0,
    priority: 'medium',
    instructions: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editData) {
      setFormData({
        name: editData.name || '',
        description: editData.description || '',
        type: editData.type || 'general',
        color: editData.color || '#3B82F6',
        requiredAgents: editData.requiredAgents || 1,
        requiredSupervisors: editData.requiredSupervisors || 0,
        priority: editData.priority || 'medium',
        instructions: editData.instructions || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'general',
        color: '#3B82F6',
        requiredAgents: 1,
        requiredSupervisors: 0,
        priority: 'medium',
        instructions: ''
      });
    }
  }, [editData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Le nom de la zone est requis');
      return;
    }

    setLoading(true);
    try {
      if (editData) {
        await zonesAPI.update(editData.id, formData);
        toast.success('Zone mise a jour');
      } else {
        await zonesAPI.create({ ...formData, eventId });
        toast.success('Zone creee avec succes');
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-xl">
                <FiLayers className="text-purple-600" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editData ? 'Modifier la zone' : 'Nouvelle zone'}
                </h2>
                <p className="text-sm text-gray-500">Definir une zone pour l'evenement</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <FiX size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-5">
            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la zone *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Tribune Nord, Entree VIP, Parking A..."
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description de la zone..."
                rows={2}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
              />
            </div>

            {/* Type et Couleur */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de zone
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {ZONE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Couleur
                </label>
                <div className="flex flex-wrap gap-2 p-2 border rounded-xl">
                  {ZONE_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-7 h-7 rounded-lg transition-all ${
                        formData.color === color ? 'ring-2 ring-offset-2 ring-purple-500 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Agents et Superviseurs requis */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FiUsers className="inline mr-1" size={14} />
                  Agents requis
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.requiredAgents}
                  onChange={(e) => setFormData({ ...formData, requiredAgents: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FiShield className="inline mr-1" size={14} />
                  Responsables requis
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.requiredSupervisors}
                  onChange={(e) => setFormData({ ...formData, requiredSupervisors: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Priorite */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priorite
              </label>
              <div className="flex gap-2">
                {PRIORITY_LEVELS.map(level => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: level.value })}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      formData.priority === level.value
                        ? `${level.color} ring-2 ring-offset-1 ring-purple-400`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instructions speciales
              </label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Instructions pour les agents de cette zone..."
                rows={3}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <FiRefreshCw className="animate-spin" size={16} />
                  Enregistrement...
                </>
              ) : (
                <>
                  <FiCheck size={16} />
                  {editData ? 'Mettre a jour' : 'Creer la zone'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal pour affecter des agents/responsables a une zone
const ZoneAssignmentModal = ({ isOpen, onClose, zone, eventId, onSave }) => {
  const [agents, setAgents] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [selectedSupervisors, setSelectedSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchAgent, setSearchAgent] = useState('');
  const [searchSupervisor, setSearchSupervisor] = useState('');
  const [activeTab, setActiveTab] = useState('agents'); // 'agents' ou 'supervisors'
  const [existingAssignments, setExistingAssignments] = useState([]);

  useEffect(() => {
    if (isOpen && zone) {
      fetchData();
    }
  }, [isOpen, zone]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Charger les agents et superviseurs disponibles
      const [agentsRes, supervisorsRes, assignmentsRes] = await Promise.all([
        usersAPI.getAgents({ status: 'active', limit: 500 }),
        usersAPI.getSupervisors(),
        assignmentsAPI.getAll({ eventId, zoneId: zone.id })
      ]);

      const agentsList = agentsRes.data?.data?.users || agentsRes.data?.data || [];
      const supervisorsList = supervisorsRes.data?.data || [];
      const assignmentsList = assignmentsRes.data?.data?.assignments || [];

      setAgents(agentsList);
      setSupervisors(supervisorsList);
      setExistingAssignments(assignmentsList);

      // Pre-selectionner les agents/superviseurs deja affectes
      const assignedAgentIds = assignmentsList
        .filter(a => a.role !== 'supervisor')
        .map(a => a.agentId);
      const assignedSupervisorIds = assignmentsList
        .filter(a => a.role === 'supervisor')
        .map(a => a.agentId);

      setSelectedAgents(assignedAgentIds);
      setSelectedSupervisors(assignedSupervisorIds);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des donnees');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Trouver les agents a ajouter et a supprimer
      const currentAgentIds = existingAssignments
        .filter(a => a.role !== 'supervisor')
        .map(a => a.agentId);
      const currentSupervisorIds = existingAssignments
        .filter(a => a.role === 'supervisor')
        .map(a => a.agentId);

      // Agents a ajouter
      const agentsToAdd = selectedAgents.filter(id => !currentAgentIds.includes(id));
      // Agents a supprimer
      const agentsToRemove = currentAgentIds.filter(id => !selectedAgents.includes(id));

      // Superviseurs a ajouter
      const supervisorsToAdd = selectedSupervisors.filter(id => !currentSupervisorIds.includes(id));
      // Superviseurs a supprimer
      const supervisorsToRemove = currentSupervisorIds.filter(id => !selectedSupervisors.includes(id));

      // Supprimer les affectations
      const assignmentsToDelete = existingAssignments.filter(a =>
        (a.role !== 'supervisor' && agentsToRemove.includes(a.agentId)) ||
        (a.role === 'supervisor' && supervisorsToRemove.includes(a.agentId))
      );

      for (const assignment of assignmentsToDelete) {
        await assignmentsAPI.delete(assignment.id);
      }

      // Ajouter les nouveaux agents
      if (agentsToAdd.length > 0) {
        await assignmentsAPI.createBulk({
          eventId,
          zoneId: zone.id,
          agentIds: agentsToAdd,
          role: 'primary'
        });
      }

      // Ajouter les nouveaux superviseurs
      for (const supervisorId of supervisorsToAdd) {
        await assignmentsAPI.create({
          eventId,
          zoneId: zone.id,
          agentId: supervisorId,
          role: 'supervisor'
        });
      }

      toast.success('Affectations mises a jour');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const toggleAgent = (agentId) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const toggleSupervisor = (supervisorId) => {
    setSelectedSupervisors(prev =>
      prev.includes(supervisorId)
        ? prev.filter(id => id !== supervisorId)
        : [...prev, supervisorId]
    );
  };

  const filteredAgents = agents.filter(agent =>
    `${agent.firstName} ${agent.lastName} ${agent.employeeId}`.toLowerCase().includes(searchAgent.toLowerCase())
  );

  const filteredSupervisors = supervisors.filter(sup =>
    `${sup.firstName} ${sup.lastName} ${sup.employeeId}`.toLowerCase().includes(searchSupervisor.toLowerCase())
  );

  if (!isOpen || !zone) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div
          className="p-6 border-b"
          style={{ backgroundColor: `${zone.color}15` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: zone.color }}
              >
                <FiUserPlus className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Affecter a la zone: {zone.name}
                </h2>
                <p className="text-sm text-gray-500">
                  Requis: {zone.requiredAgents} agent(s), {zone.requiredSupervisors} responsable(s)
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('agents')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'agents'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FiUsers size={16} />
            Agents ({selectedAgents.length}/{zone.requiredAgents})
          </button>
          <button
            onClick={() => setActiveTab('supervisors')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'supervisors'
                ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FiShield size={16} />
            Responsables ({selectedSupervisors.length}/{zone.requiredSupervisors})
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <FiRefreshCw className="animate-spin text-purple-500" size={32} />
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder={activeTab === 'agents' ? 'Rechercher un agent...' : 'Rechercher un responsable...'}
                  value={activeTab === 'agents' ? searchAgent : searchSupervisor}
                  onChange={(e) => activeTab === 'agents' ? setSearchAgent(e.target.value) : setSearchSupervisor(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* List */}
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {activeTab === 'agents' ? (
                  filteredAgents.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Aucun agent disponible</p>
                  ) : (
                    filteredAgents.map(agent => {
                      const isSelected = selectedAgents.includes(agent.id);
                      return (
                        <div
                          key={agent.id}
                          onClick={() => toggleAgent(agent.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50 border-2 border-blue-500'
                              : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                            isSelected ? 'bg-blue-500' : 'bg-gray-400'
                          }`}>
                            {agent.profilePhoto ? (
                              <img
                                src={agent.profilePhoto}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              agent.firstName?.charAt(0) + agent.lastName?.charAt(0)
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">
                              {agent.firstName} {agent.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {agent.employeeId} {agent.phone && `• ${agent.phone}`}
                            </p>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                          }`}>
                            {isSelected && <FiCheck className="text-white" size={14} />}
                          </div>
                        </div>
                      );
                    })
                  )
                ) : (
                  filteredSupervisors.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Aucun responsable disponible</p>
                  ) : (
                    filteredSupervisors.map(sup => {
                      const isSelected = selectedSupervisors.includes(sup.id);
                      return (
                        <div
                          key={sup.id}
                          onClick={() => toggleSupervisor(sup.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-orange-50 border-2 border-orange-500'
                              : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                            isSelected ? 'bg-orange-500' : 'bg-gray-400'
                          }`}>
                            {sup.profilePhoto ? (
                              <img
                                src={sup.profilePhoto}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              sup.firstName?.charAt(0) + sup.lastName?.charAt(0)
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">
                              {sup.firstName} {sup.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {sup.employeeId} {sup.phone && `• ${sup.phone}`}
                            </p>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300'
                          }`}>
                            {isSelected && <FiCheck className="text-white" size={14} />}
                          </div>
                        </div>
                      );
                    })
                  )
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {activeTab === 'agents' ? (
              <span className={selectedAgents.length >= zone.requiredAgents ? 'text-green-600' : 'text-orange-600'}>
                {selectedAgents.length} agent(s) selectionne(s)
              </span>
            ) : (
              <span className={selectedSupervisors.length >= zone.requiredSupervisors ? 'text-green-600' : 'text-orange-600'}>
                {selectedSupervisors.length} responsable(s) selectionne(s)
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 font-medium"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <FiRefreshCw className="animate-spin" size={16} />
                  Enregistrement...
                </>
              ) : (
                <>
                  <FiCheck size={16} />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant principal de gestion des zones
const ZoneManager = ({ eventId, eventName, onClose }) => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formModal, setFormModal] = useState({ open: false, editData: null });
  const [assignmentModal, setAssignmentModal] = useState({ open: false, zone: null });
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [expandedZones, setExpandedZones] = useState({});

  useEffect(() => {
    if (eventId) {
      fetchZones();
    }
  }, [eventId]);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const response = await zonesAPI.getByEvent(eventId, { includeAssignments: 'true' });
      setZones(response.data.data || []);
    } catch (error) {
      console.error('Error fetching zones:', error);
      toast.error('Erreur lors du chargement des zones');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (zone) => {
    if (!window.confirm(`Supprimer la zone "${zone.name}" ?`)) return;

    setDeleteLoading(zone.id);
    try {
      await zonesAPI.delete(zone.id);
      toast.success('Zone supprimee');
      fetchZones();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeleteLoading(null);
    }
  };

  const getTypeConfig = (type) => {
    return ZONE_TYPES.find(t => t.value === type) || ZONE_TYPES[0];
  };

  const getPriorityConfig = (priority) => {
    return PRIORITY_LEVELS.find(p => p.value === priority) || PRIORITY_LEVELS[1];
  };

  const toggleZoneExpanded = (zoneId) => {
    setExpandedZones(prev => ({
      ...prev,
      [zoneId]: !prev[zoneId]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FiLayers className="text-purple-600" />
                Gestion des zones
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Evenement: <span className="font-medium text-gray-700">{eventName}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFormModal({ open: true, editData: null })}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium text-sm"
              >
                <FiPlus size={16} />
                Nouvelle zone
              </button>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <FiX size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <FiRefreshCw className="animate-spin text-purple-500" size={32} />
            </div>
          ) : zones.length === 0 ? (
            <div className="text-center py-12">
              <FiLayers className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-500 font-medium">Aucune zone definie</p>
              <p className="text-sm text-gray-400 mt-1">
                Creez des zones pour organiser les affectations
              </p>
              <button
                onClick={() => setFormModal({ open: true, editData: null })}
                className="mt-4 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium inline-flex items-center gap-2"
              >
                <FiPlus size={16} />
                Creer une zone
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {zones.map(zone => {
                const typeConfig = getTypeConfig(zone.type);
                const priorityConfig = getPriorityConfig(zone.priority);
                const stats = zone.stats || {};
                const assignedAgents = stats.assignedAgents || 0;
                const assignedSupervisors = stats.assignedSupervisors || 0;
                const isAgentsFull = assignedAgents >= (zone.requiredAgents || 1);
                const isSupervisorsFull = assignedSupervisors >= (zone.requiredSupervisors || 0);
                const isExpanded = expandedZones[zone.id];
                const assignments = zone.assignments || [];

                // Separer agents et superviseurs
                const agentAssignments = assignments.filter(a => a.role !== 'supervisor');
                const supervisorAssignments = assignments.filter(a => a.role === 'supervisor');

                return (
                  <div
                    key={zone.id}
                    className="border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div
                      className="px-4 py-3 flex items-center justify-between"
                      style={{ backgroundColor: `${zone.color}15` }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: zone.color }}
                        />
                        <h3 className="font-semibold text-gray-800">{zone.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                        {zone.priority !== 'medium' && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig.color}`}>
                            {priorityConfig.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAssignmentModal({ open: true, zone })}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Affecter agents/responsables"
                        >
                          <FiUserPlus size={16} />
                        </button>
                        <button
                          onClick={() => setFormModal({ open: true, editData: zone })}
                          className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(zone)}
                          disabled={deleteLoading === zone.id}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Supprimer"
                        >
                          {deleteLoading === zone.id ? (
                            <FiRefreshCw className="animate-spin" size={16} />
                          ) : (
                            <FiTrash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="px-4 py-3 bg-white">
                      {zone.description && (
                        <p className="text-sm text-gray-600 mb-3">{zone.description}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <FiUsers className="text-blue-500" size={16} />
                            <span className="text-sm">
                              <span className={`font-semibold ${isAgentsFull ? 'text-green-600' : 'text-orange-600'}`}>
                                {assignedAgents}
                              </span>
                              <span className="text-gray-400"> / {zone.requiredAgents || 1}</span>
                              <span className="text-gray-500 ml-1">agents</span>
                            </span>
                            {isAgentsFull && (
                              <FiCheck className="text-green-500" size={14} />
                            )}
                          </div>

                          {zone.requiredSupervisors > 0 && (
                            <div className="flex items-center gap-2">
                              <FiShield className="text-orange-500" size={16} />
                              <span className="text-sm">
                                <span className={`font-semibold ${isSupervisorsFull ? 'text-green-600' : 'text-orange-600'}`}>
                                  {assignedSupervisors}
                                </span>
                                <span className="text-gray-400"> / {zone.requiredSupervisors}</span>
                                <span className="text-gray-500 ml-1">responsables</span>
                              </span>
                              {isSupervisorsFull && (
                                <FiCheck className="text-green-500" size={14} />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Bouton pour voir les agents assignes */}
                        {assignments.length > 0 && (
                          <button
                            onClick={() => toggleZoneExpanded(zone.id)}
                            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                          >
                            {isExpanded ? 'Masquer' : 'Voir les affectations'}
                            {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                          </button>
                        )}
                      </div>

                      {/* Liste des agents/superviseurs assignes (expandable) */}
                      {isExpanded && assignments.length > 0 && (
                        <div className="mt-3 pt-3 border-t space-y-3">
                          {/* Agents */}
                          {agentAssignments.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-blue-600 mb-2 flex items-center gap-1">
                                <FiUsers size={12} />
                                Agents ({agentAssignments.length})
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {agentAssignments.map(assignment => (
                                  <div
                                    key={assignment.id}
                                    className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded-lg"
                                  >
                                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                                      {assignment.agent?.profilePhoto ? (
                                        <img
                                          src={assignment.agent.profilePhoto}
                                          alt=""
                                          className="w-6 h-6 rounded-full object-cover"
                                        />
                                      ) : (
                                        (assignment.agent?.firstName?.charAt(0) || '') + (assignment.agent?.lastName?.charAt(0) || '')
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-700">
                                      {assignment.agent?.firstName} {assignment.agent?.lastName}
                                    </span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      assignment.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                      assignment.status === 'declined' ? 'bg-red-100 text-red-700' :
                                      'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {assignment.status === 'confirmed' ? 'Confirme' :
                                       assignment.status === 'declined' ? 'Refuse' : 'En attente'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Superviseurs */}
                          {supervisorAssignments.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-orange-600 mb-2 flex items-center gap-1">
                                <FiShield size={12} />
                                Responsables ({supervisorAssignments.length})
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {supervisorAssignments.map(assignment => (
                                  <div
                                    key={assignment.id}
                                    className="flex items-center gap-2 px-2 py-1 bg-orange-50 rounded-lg"
                                  >
                                    <div className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center">
                                      {assignment.agent?.profilePhoto ? (
                                        <img
                                          src={assignment.agent.profilePhoto}
                                          alt=""
                                          className="w-6 h-6 rounded-full object-cover"
                                        />
                                      ) : (
                                        (assignment.agent?.firstName?.charAt(0) || '') + (assignment.agent?.lastName?.charAt(0) || '')
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-700">
                                      {assignment.agent?.firstName} {assignment.agent?.lastName}
                                    </span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      assignment.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                      assignment.status === 'declined' ? 'bg-red-100 text-red-700' :
                                      'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {assignment.status === 'confirmed' ? 'Confirme' :
                                       assignment.status === 'declined' ? 'Refuse' : 'En attente'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {zone.instructions && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-gray-500 flex items-start gap-1">
                            <FiAlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                            <span>{zone.instructions}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            {zones.length} zone(s) definie(s)
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-medium"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Modal de formulaire */}
      <ZoneFormModal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, editData: null })}
        onSave={fetchZones}
        editData={formModal.editData}
        eventId={eventId}
      />

      {/* Modal d'affectation */}
      <ZoneAssignmentModal
        isOpen={assignmentModal.open}
        onClose={() => setAssignmentModal({ open: false, zone: null })}
        zone={assignmentModal.zone}
        eventId={eventId}
        onSave={fetchZones}
      />
    </div>
  );
};

export default ZoneManager;
