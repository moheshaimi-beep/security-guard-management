import React, { useState, useEffect, useMemo } from 'react';
import {
  FiLayers, FiPlus, FiEdit2, FiTrash2, FiSearch, FiFilter,
  FiMapPin, FiUsers, FiShield, FiX, FiCheck, FiRefreshCw,
  FiAlertCircle, FiCopy, FiEye, FiChevronDown, FiChevronUp,
  FiCalendar, FiClock, FiUserPlus, FiGrid, FiList, FiDownload,
  FiUpload, FiSettings, FiBarChart2, FiTarget, FiMap
} from 'react-icons/fi';
import { zonesAPI, eventsAPI, usersAPI, assignmentsAPI } from '../services/api';
import { toast } from 'react-toastify';
import AddressAutocomplete from '../components/AddressAutocomplete';
import MiniMap from '../components/MiniMap';

// Types de zones disponibles
const ZONE_TYPES = [
  { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-700', icon: FiLayers },
  { value: 'entry', label: 'Entree', color: 'bg-blue-100 text-blue-700', icon: FiMapPin },
  { value: 'exit', label: 'Sortie', color: 'bg-green-100 text-green-700', icon: FiMapPin },
  { value: 'vip', label: 'VIP', color: 'bg-yellow-100 text-yellow-700', icon: FiShield },
  { value: 'parking', label: 'Parking', color: 'bg-purple-100 text-purple-700', icon: FiGrid },
  { value: 'backstage', label: 'Backstage', color: 'bg-pink-100 text-pink-700', icon: FiTarget },
  { value: 'security_post', label: 'Poste Securite', color: 'bg-red-100 text-red-700', icon: FiShield },
  { value: 'control', label: 'Controle', color: 'bg-indigo-100 text-indigo-700', icon: FiEye },
  { value: 'medical', label: 'Medical', color: 'bg-emerald-100 text-emerald-700', icon: FiPlus },
  { value: 'other', label: 'Autre', color: 'bg-gray-100 text-gray-600', icon: FiLayers },
];

// Couleurs disponibles pour les zones
const ZONE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#F43F5E', '#A855F7', '#22C55E', '#0EA5E9'
];

// Niveaux de priorite
const PRIORITY_LEVELS = [
  { value: 'low', label: 'Basse', color: 'bg-gray-100 text-gray-600', badge: 'bg-gray-500' },
  { value: 'medium', label: 'Moyenne', color: 'bg-blue-100 text-blue-600', badge: 'bg-blue-500' },
  { value: 'high', label: 'Haute', color: 'bg-orange-100 text-orange-600', badge: 'bg-orange-500' },
  { value: 'critical', label: 'Critique', color: 'bg-red-100 text-red-600', badge: 'bg-red-500' },
];

// Modal pour creer/editer une zone
const ZoneFormModal = ({ isOpen, onClose, onSave, editData, events, selectedEventId }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'general',
    color: '#3B82F6',
    requiredAgents: 1,
    requiredSupervisors: 0,
    priority: 'medium',
    instructions: '',
    eventId: selectedEventId || '',
    latitude: '',
    longitude: '',
    address: '',
    geoRadius: 50,
    capacity: '',
    isActive: true
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
        instructions: editData.instructions || '',
        eventId: editData.eventId || selectedEventId || '',
        latitude: editData.latitude || '',
        longitude: editData.longitude || '',
        address: editData.address || '',
        geoRadius: editData.geoRadius || 50,
        capacity: editData.capacity || '',
        isActive: editData.isActive !== false
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
        instructions: '',
        eventId: selectedEventId || '',
        latitude: '',
        longitude: '',
        address: '',
        geoRadius: 50,
        capacity: '',
        isActive: true
      });
    }
  }, [editData, isOpen, selectedEventId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Le nom de la zone est requis');
      return;
    }
    if (!formData.eventId) {
      toast.error('Veuillez selectionner un evenement');
      return;
    }

    setLoading(true);
    try {
      const dataToSend = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
      };

      if (editData) {
        await zonesAPI.update(editData.id, dataToSend);
        toast.success('Zone mise a jour');
      } else {
        await zonesAPI.create(dataToSend);
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
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
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
            {/* Evenement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Evenement *
              </label>
              <select
                value={formData.eventId}
                onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
                disabled={!!editData}
              >
                <option value="">Selectionner un evenement</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))}
              </select>
            </div>

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
                      className={`w-6 h-6 rounded-lg transition-all ${
                        formData.color === color ? 'ring-2 ring-offset-2 ring-purple-500 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Agents et Superviseurs requis */}
            <div className="grid grid-cols-3 gap-4">
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
                  Responsables
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.requiredSupervisors}
                  onChange={(e) => setFormData({ ...formData, requiredSupervisors: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacite max
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="Illimite"
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

            {/* Geolocalisation */}
            <div className="p-4 bg-gray-50 rounded-xl space-y-4">
              <h4 className="font-medium text-gray-700 flex items-center gap-2">
                <FiMapPin size={16} />
                Emplacement de la zone
              </h4>

              <AddressAutocomplete
                value={formData.address || formData.name}
                onChange={(address) => setFormData({ ...formData, address })}
                onCoordinatesChange={(coords) => {
                  if (coords) {
                    setFormData(prev => ({
                      ...prev,
                      address: coords.address || prev.address,
                      latitude: coords.latitude.toFixed(6),
                      longitude: coords.longitude.toFixed(6)
                    }));
                  }
                }}
                label="Rechercher une adresse (facultatif)"
                placeholder="Tapez pour rechercher un lieu..."
                initialCoordinates={
                  formData.latitude && formData.longitude
                    ? { lat: parseFloat(formData.latitude), lng: parseFloat(formData.longitude) }
                    : null
                }
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                    <input
                      type="text"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="33.5731"
                      className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                    <input
                      type="text"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="-7.5898"
                      className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Rayon du geofencing (m)</label>
                  <input
                    type="number"
                    min="10"
                    max="2000"
                    value={formData.geoRadius}
                    onChange={(e) => setFormData({ ...formData, geoRadius: parseInt(e.target.value) || 50 })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <MiniMap
                latitude={formData.latitude}
                longitude={formData.longitude}
                geoRadius={formData.geoRadius}
                height="200px"
                draggable={true}
                onPositionChange={(pos) => {
                  setFormData(prev => ({
                    ...prev,
                    latitude: pos.latitude.toFixed(6),
                    longitude: pos.longitude.toFixed(6)
                  }));
                }}
              />
              <p className="text-[10px] text-gray-400 italic">
                * Le cercle bleu represente la zone de geofencing. Les agents devront etre dans ce rayon pour pointer.
              </p>
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

            {/* Statut actif */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Zone active
              </label>
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

// Composant carte de zone
const ZoneCard = ({ zone, onEdit, onDelete, onDuplicate, expanded, onToggleExpand }) => {
  const typeConfig = ZONE_TYPES.find(t => t.value === zone.type) || ZONE_TYPES[0];
  const priorityConfig = PRIORITY_LEVELS.find(p => p.value === zone.priority) || PRIORITY_LEVELS[1];
  const TypeIcon = typeConfig.icon;

  const stats = zone.stats || {};
  const assignedAgents = stats.assignedAgents || 0;
  const assignedSupervisors = stats.assignedSupervisors || 0;
  const isAgentsFull = assignedAgents >= (zone.requiredAgents || 1);
  const isSupervisorsFull = assignedSupervisors >= (zone.requiredSupervisors || 0);
  const assignments = zone.assignments || [];
  const agentAssignments = assignments.filter(a => a.role !== 'supervisor');
  const supervisorAssignments = assignments.filter(a => a.role === 'supervisor');

  return (
    <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${!zone.isActive ? 'opacity-60' : ''}`}>
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: `${zone.color}15` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: zone.color }}
          >
            <TypeIcon className="text-white" size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              {zone.name}
              {!zone.isActive && (
                <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">Inactive</span>
              )}
            </h3>
            <p className="text-xs text-gray-500">{zone.event?.name || 'Evenement'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.color}`}>
            {typeConfig.label}
          </span>
          {zone.priority !== 'medium' && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig.color}`}>
              {priorityConfig.label}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-3">
        {zone.description && (
          <p className="text-sm text-gray-600 mb-3">{zone.description}</p>
        )}

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FiUsers className="text-blue-500" size={16} />
              <span className="text-sm">
                <span className={`font-semibold ${isAgentsFull ? 'text-green-600' : 'text-orange-600'}`}>
                  {assignedAgents}
                </span>
                <span className="text-gray-400"> / {zone.requiredAgents || 1}</span>
              </span>
              {isAgentsFull && <FiCheck className="text-green-500" size={14} />}
            </div>

            {zone.requiredSupervisors > 0 && (
              <div className="flex items-center gap-2">
                <FiShield className="text-orange-500" size={16} />
                <span className="text-sm">
                  <span className={`font-semibold ${isSupervisorsFull ? 'text-green-600' : 'text-orange-600'}`}>
                    {assignedSupervisors}
                  </span>
                  <span className="text-gray-400"> / {zone.requiredSupervisors}</span>
                </span>
                {isSupervisorsFull && <FiCheck className="text-green-500" size={14} />}
              </div>
            )}

            {zone.capacity && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <FiUsers size={14} />
                <span>Cap: {zone.capacity}</span>
              </div>
            )}
          </div>

          {assignments.length > 0 && (
            <button
              onClick={() => onToggleExpand(zone.id)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              {expanded ? 'Masquer' : 'Details'}
              {expanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </button>
          )}
        </div>

        {/* Agents/Superviseurs assignes (expandable) */}
        {expanded && assignments.length > 0 && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg space-y-2">
            {agentAssignments.length > 0 && (
              <div>
                <p className="text-xs font-medium text-blue-600 mb-1 flex items-center gap-1">
                  <FiUsers size={12} /> Agents ({agentAssignments.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {agentAssignments.map(a => (
                    <span key={a.id} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                      {a.agent?.firstName} {a.agent?.lastName}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {supervisorAssignments.length > 0 && (
              <div>
                <p className="text-xs font-medium text-orange-600 mb-1 flex items-center gap-1">
                  <FiShield size={12} /> Responsables ({supervisorAssignments.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {supervisorAssignments.map(a => (
                    <span key={a.id} className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                      {a.agent?.firstName} {a.agent?.lastName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {zone.instructions && (
          <div className="p-2 bg-yellow-50 rounded-lg mb-3">
            <p className="text-xs text-yellow-700 flex items-start gap-1">
              <FiAlertCircle size={12} className="mt-0.5 flex-shrink-0" />
              <span>{zone.instructions}</span>
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <button
            onClick={() => onDuplicate(zone)}
            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Dupliquer"
          >
            <FiCopy size={16} />
          </button>
          <button
            onClick={() => onEdit(zone)}
            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Modifier"
          >
            <FiEdit2 size={16} />
          </button>
          <button
            onClick={() => onDelete(zone)}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Supprimer"
          >
            <FiTrash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Page principale
const Zones = () => {
  const [zones, setZones] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formModal, setFormModal] = useState({ open: false, editData: null });
  const [assignmentModal, setAssignmentModal] = useState({ open: false, zone: null });
  const [expandedZones, setExpandedZones] = useState({});

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' ou 'list'
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventsRes] = await Promise.all([
        eventsAPI.getAll({ limit: 100 })
      ]);

      const allEvents = eventsRes.data?.data?.events || eventsRes.data?.data || [];
      // Filtrer les événements terminés, annulés et ceux dont la date est passée
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Début de la journée actuelle

      const eventsList = allEvents.filter(e => {
        // Exclure les événements avec statut terminé ou annulé
        if (e.status === 'completed' || e.status === 'cancelled') return false;

        // Exclure les événements dont la date de fin est passée
        const endDate = new Date(e.endDate);
        if (endDate < now) return false;

        return true;
      });
      setEvents(eventsList);

      // Charger les zones pour tous les evenements
      const allZones = [];
      for (const event of eventsList) {
        try {
          const zonesRes = await zonesAPI.getByEvent(event.id, { includeAssignments: 'true' });
          const eventZones = (zonesRes.data?.data || []).map(z => ({ ...z, event }));
          allZones.push(...eventZones);
        } catch (e) {
          console.error(`Error fetching zones for event ${event.id}:`, e);
        }
      }
      setZones(allZones);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des donnees');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (zone) => {
    if (!window.confirm(`Supprimer la zone "${zone.name}" ?`)) return;

    try {
      await zonesAPI.delete(zone.id);
      toast.success('Zone supprimee');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleDuplicate = async (zone) => {
    const newName = prompt(`Nom de la nouvelle zone (copie de "${zone.name}"):`, `${zone.name} - Copie`);
    if (!newName) return;

    try {
      await zonesAPI.create({
        ...zone,
        id: undefined,
        name: newName,
        eventId: zone.eventId
      });
      toast.success('Zone dupliquee');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la duplication');
    }
  };

  const toggleExpand = (zoneId) => {
    setExpandedZones(prev => ({ ...prev, [zoneId]: !prev[zoneId] }));
  };

  // Filtrage
  const filteredZones = useMemo(() => {
    return zones.filter(zone => {
      const matchesSearch = !searchTerm ||
        zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zone.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zone.event?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesEvent = !filterEvent || zone.eventId === filterEvent;
      const matchesType = !filterType || zone.type === filterType;
      const matchesPriority = !filterPriority || zone.priority === filterPriority;

      return matchesSearch && matchesEvent && matchesType && matchesPriority;
    });
  }, [zones, searchTerm, filterEvent, filterType, filterPriority]);

  // Statistiques
  const stats = useMemo(() => {
    const total = zones.length;
    const byType = {};
    const byPriority = {};
    let totalAgentsRequired = 0;
    let totalAgentsAssigned = 0;

    zones.forEach(zone => {
      byType[zone.type] = (byType[zone.type] || 0) + 1;
      byPriority[zone.priority] = (byPriority[zone.priority] || 0) + 1;
      totalAgentsRequired += zone.requiredAgents || 0;
      totalAgentsAssigned += zone.stats?.assignedAgents || 0;
    });

    return { total, byType, byPriority, totalAgentsRequired, totalAgentsAssigned };
  }, [zones]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-xl">
                <FiLayers className="text-purple-600" size={24} />
              </div>
              Gestion des Zones
            </h1>
            <p className="text-gray-500 mt-1">Gerez les zones de securite pour vos evenements</p>
          </div>
          <button
            onClick={() => setFormModal({ open: true, editData: null })}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium shadow-lg shadow-purple-200"
          >
            <FiPlus size={18} />
            Nouvelle zone
          </button>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FiLayers className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Zones totales</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiUsers className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalAgentsAssigned}/{stats.totalAgentsRequired}
                </p>
                <p className="text-sm text-gray-500">Agents affectes</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <FiAlertCircle className="text-red-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.byPriority.critical || 0}</p>
                <p className="text-sm text-gray-500">Zones critiques</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FiCalendar className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{events.length}</p>
                <p className="text-sm text-gray-500">Evenements actifs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher une zone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <select
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Tous les evenements</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-colors ${
                showFilters ? 'bg-purple-50 border-purple-300 text-purple-700' : 'hover:bg-gray-50'
              }`}
            >
              <FiFilter size={18} />
              Filtres
            </button>

            <div className="flex items-center border rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 ${viewMode === 'grid' ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-50'}`}
              >
                <FiGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 ${viewMode === 'list' ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-50'}`}
              >
                <FiList size={18} />
              </button>
            </div>

            <button
              onClick={fetchData}
              className="p-2.5 border rounded-xl hover:bg-gray-50"
              title="Rafraichir"
            >
              <FiRefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Filtres avances */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t flex items-center gap-4">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border rounded-xl text-sm"
              >
                <option value="">Tous les types</option>
                {ZONE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>

              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-4 py-2 border rounded-xl text-sm"
              >
                <option value="">Toutes les priorites</option>
                {PRIORITY_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>

              {(filterType || filterPriority) && (
                <button
                  onClick={() => { setFilterType(''); setFilterPriority(''); }}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Effacer les filtres
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <FiRefreshCw className="animate-spin text-purple-500" size={40} />
        </div>
      ) : filteredZones.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border">
          <FiLayers className="mx-auto text-gray-300 mb-4" size={60} />
          <p className="text-gray-500 font-medium text-lg">Aucune zone trouvee</p>
          <p className="text-sm text-gray-400 mt-1">
            {searchTerm || filterEvent || filterType || filterPriority
              ? 'Essayez de modifier vos criteres de recherche'
              : 'Creez votre premiere zone pour commencer'}
          </p>
          {!searchTerm && !filterEvent && (
            <button
              onClick={() => setFormModal({ open: true, editData: null })}
              className="mt-4 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium inline-flex items-center gap-2"
            >
              <FiPlus size={16} />
              Creer une zone
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'space-y-4'
        }>
          {filteredZones.map(zone => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              onEdit={(z) => setFormModal({ open: true, editData: z })}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              expanded={expandedZones[zone.id]}
              onToggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}

      {/* Resultats */}
      {!loading && filteredZones.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          {filteredZones.length} zone(s) affichee(s) sur {zones.length}
        </div>
      )}

      {/* Modals */}
      <ZoneFormModal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, editData: null })}
        onSave={fetchData}
        editData={formModal.editData}
        events={events}
        selectedEventId={filterEvent}
      />

    </div>
  );
};

export default Zones;
