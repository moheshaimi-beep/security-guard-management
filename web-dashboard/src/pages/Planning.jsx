import React, { useState, useEffect, useMemo } from 'react';
import {
  FiCalendar, FiChevronLeft, FiChevronRight, FiPlus,
  FiClock, FiMapPin, FiUsers, FiFilter, FiGrid, FiList,
  FiCheck, FiX, FiAlertCircle, FiRefreshCw
} from 'react-icons/fi';
import { eventsAPI, assignmentsAPI, usersAPI } from '../services/api';
import { toast } from 'react-toastify';
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isSameMonth, addWeeks, subWeeks,
  addMonths, subMonths, parseISO, isWithinInterval, addDays
} from 'date-fns';
import { fr } from 'date-fns/locale';

const Planning = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week'); // week, month
  const [events, setEvents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterAgent, setFilterAgent] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [draggedAgent, setDraggedAgent] = useState(null);

  useEffect(() => {
    fetchData();
  }, [currentDate, view]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = view === 'week'
        ? startOfWeek(currentDate, { weekStartsOn: 1 })
        : startOfMonth(currentDate);
      const endDate = view === 'week'
        ? endOfWeek(currentDate, { weekStartsOn: 1 })
        : endOfMonth(currentDate);

      const [eventsRes, assignmentsRes, agentsRes] = await Promise.all([
        eventsAPI.getAll({
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          limit: 100
        }),
        assignmentsAPI.getAll({ limit: 100 }),
        usersAPI.getAgents()
      ]);

      setEvents(eventsRes.data.data.events || []);
      setAssignments(assignmentsRes.data.data.assignments || []);
      setAgents(agentsRes.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const navigate = (direction) => {
    if (view === 'week') {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  const days = useMemo(() => {
    const start = view === 'week'
      ? startOfWeek(currentDate, { weekStartsOn: 1 })
      : startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = view === 'week'
      ? endOfWeek(currentDate, { weekStartsOn: 1 })
      : endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });

    return eachDayOfInterval({ start, end });
  }, [currentDate, view]);

  const getEventsForDay = (day) => {
    return events.filter(event => {
      const eventStart = parseISO(event.startDate);
      const eventEnd = event.endDate ? parseISO(event.endDate) : eventStart;
      return isWithinInterval(day, { start: eventStart, end: eventEnd }) ||
             isSameDay(day, eventStart);
    });
  };

  const getAssignmentsForEvent = (eventId) => {
    return assignments.filter(a => a.eventId === eventId);
  };

  const getEventColor = (event) => {
    const eventAssignments = getAssignmentsForEvent(event.id);
    const required = event.agentsRequired || 1;
    const confirmed = eventAssignments.filter(a => a.status === 'confirmed').length;

    if (confirmed >= required) return 'bg-green-100 border-green-500 text-green-800';
    if (confirmed > 0) return 'bg-yellow-100 border-yellow-500 text-yellow-800';
    return 'bg-red-100 border-red-500 text-red-800';
  };

  const handleAssignAgent = async (eventId, agentId) => {
    try {
      await assignmentsAPI.create({
        eventId,
        agentId,
        role: 'primary',
        status: 'confirmed'
      });
      toast.success('Agent affecté');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'affectation');
    }
  };

  const handleDragStart = (agent) => {
    setDraggedAgent(agent);
  };

  const handleDragEnd = () => {
    setDraggedAgent(null);
  };

  const handleDrop = async (event) => {
    if (draggedAgent) {
      await handleAssignAgent(event.id, draggedAgent.id);
      setDraggedAgent(null);
    }
  };

  const hours = Array.from({ length: 14 }, (_, i) => i + 6); // 6h - 20h

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FiCalendar className="mr-3 text-primary-600" />
            Planning
          </h1>
          <p className="text-gray-500">
            {view === 'week'
              ? `Semaine du ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMMM', { locale: fr })}`
              : format(currentDate, 'MMMM yyyy', { locale: fr })
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="btn-secondary">
            <FiRefreshCw className="mr-2" /> Actualiser
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('prev')}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <FiChevronLeft />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg"
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => navigate('next')}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <FiChevronRight />
            </button>
            <span className="ml-4 text-lg font-semibold">
              {format(currentDate, view === 'week' ? "'Semaine' w" : 'MMMM yyyy', { locale: fr })}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <select
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              className="input w-48"
            >
              <option value="">Tous les agents</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.firstName} {agent.lastName}
                </option>
              ))}
            </select>

            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView('week')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'week' ? 'bg-white shadow text-primary-600' : 'text-gray-600'
                }`}
              >
                <FiGrid className="inline mr-2" /> Semaine
              </button>
              <button
                onClick={() => setView('month')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'month' ? 'bg-white shadow text-primary-600' : 'text-gray-600'
                }`}
              >
                <FiCalendar className="inline mr-2" /> Mois
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Agents sidebar (drag source) */}
        <div className="w-64 flex-shrink-0">
          <div className="card h-full">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
              <FiUsers className="mr-2" /> Agents disponibles
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Glissez un agent vers un événement pour l'affecter
            </p>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {agents.map(agent => (
                <div
                  key={agent.id}
                  draggable
                  onDragStart={() => handleDragStart(agent)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-colors ${
                    draggedAgent?.id === agent.id
                      ? 'bg-primary-100 border-primary-500'
                      : 'bg-white border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-medium mr-3">
                    {agent.firstName?.[0]}{agent.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {agent.firstName} {agent.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{agent.employeeId}</p>
                  </div>
                  <div className="text-xs">
                    <span className={`px-2 py-0.5 rounded-full ${
                      agent.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {agent.status === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="flex-1">
          {loading ? (
            <div className="card flex items-center justify-center h-96">
              <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : view === 'week' ? (
            /* Week View */
            <div className="card overflow-hidden p-0">
              <div className="grid grid-cols-8 border-b">
                <div className="p-2 text-center text-sm font-medium text-gray-500 border-r bg-gray-50">
                  Heure
                </div>
                {days.slice(0, 7).map(day => (
                  <div
                    key={day.toISOString()}
                    className={`p-2 text-center border-r last:border-r-0 ${
                      isSameDay(day, new Date()) ? 'bg-primary-50' : 'bg-gray-50'
                    }`}
                  >
                    <div className="text-xs text-gray-500">
                      {format(day, 'EEE', { locale: fr })}
                    </div>
                    <div className={`text-lg font-semibold ${
                      isSameDay(day, new Date()) ? 'text-primary-600' : 'text-gray-900'
                    }`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                ))}
              </div>

              <div className="overflow-y-auto max-h-[60vh]">
                {hours.map(hour => (
                  <div key={hour} className="grid grid-cols-8 border-b last:border-b-0 min-h-[60px]">
                    <div className="p-2 text-xs text-gray-500 border-r bg-gray-50 flex items-start justify-center">
                      {hour}:00
                    </div>
                    {days.slice(0, 7).map(day => {
                      const dayEvents = getEventsForDay(day).filter(event => {
                        const eventHour = parseInt(event.checkInTime?.split(':')[0] || '8');
                        return eventHour === hour;
                      });

                      return (
                        <div
                          key={day.toISOString()}
                          className={`p-1 border-r last:border-r-0 min-h-[60px] ${
                            isSameDay(day, new Date()) ? 'bg-primary-50/30' : ''
                          }`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => dayEvents[0] && handleDrop(dayEvents[0])}
                        >
                          {dayEvents.map(event => {
                            const eventAssignments = getAssignmentsForEvent(event.id);

                            return (
                              <div
                                key={event.id}
                                onClick={() => setSelectedEvent(event)}
                                className={`p-2 rounded text-xs mb-1 cursor-pointer border-l-4 ${getEventColor(event)}`}
                              >
                                <div className="font-semibold truncate">{event.name}</div>
                                <div className="text-xs opacity-75 flex items-center mt-1">
                                  <FiClock className="mr-1" size={10} />
                                  {event.checkInTime} - {event.checkOutTime}
                                </div>
                                <div className="flex items-center mt-1">
                                  <FiUsers className="mr-1" size={10} />
                                  <span>
                                    {eventAssignments.filter(a => a.status === 'confirmed').length}
                                    /{event.agentsRequired || 1}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Month View */
            <div className="card overflow-hidden p-0">
              <div className="grid grid-cols-7 border-b bg-gray-50">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                  <div key={day} className="p-3 text-center text-sm font-medium text-gray-600 border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {days.map((day, index) => {
                  const dayEvents = getEventsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);

                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[120px] p-2 border-b border-r ${
                        index % 7 === 6 ? 'border-r-0' : ''
                      } ${!isCurrentMonth ? 'bg-gray-50' : ''} ${
                        isSameDay(day, new Date()) ? 'bg-primary-50' : ''
                      }`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => dayEvents[0] && handleDrop(dayEvents[0])}
                    >
                      <div className={`text-sm font-medium mb-2 ${
                        !isCurrentMonth ? 'text-gray-400' :
                        isSameDay(day, new Date()) ? 'text-primary-600' : 'text-gray-700'
                      }`}>
                        {format(day, 'd')}
                      </div>

                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map(event => {
                          const eventAssignments = getAssignmentsForEvent(event.id);

                          return (
                            <div
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className={`p-1.5 rounded text-xs cursor-pointer border-l-2 ${getEventColor(event)}`}
                            >
                              <div className="font-medium truncate">{event.name}</div>
                              <div className="flex items-center justify-between mt-0.5 opacity-75">
                                <span>{event.checkInTime}</span>
                                <span className="flex items-center">
                                  <FiUsers size={10} className="mr-1" />
                                  {eventAssignments.filter(a => a.status === 'confirmed').length}
                                  /{event.agentsRequired || 1}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{dayEvents.length - 3} autres
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">{selectedEvent.name}</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center text-gray-600">
                <FiCalendar className="mr-3 text-gray-400" />
                <span>
                  {format(parseISO(selectedEvent.startDate), 'EEEE d MMMM yyyy', { locale: fr })}
                </span>
              </div>

              <div className="flex items-center text-gray-600">
                <FiClock className="mr-3 text-gray-400" />
                <span>{selectedEvent.checkInTime} - {selectedEvent.checkOutTime}</span>
              </div>

              <div className="flex items-center text-gray-600">
                <FiMapPin className="mr-3 text-gray-400" />
                <span>{selectedEvent.location}</span>
              </div>

              {/* Assigned agents */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                  <FiUsers className="mr-2" />
                  Agents affectés ({getAssignmentsForEvent(selectedEvent.id).length}/{selectedEvent.agentsRequired || 1})
                </h3>

                {getAssignmentsForEvent(selectedEvent.id).length === 0 ? (
                  <p className="text-gray-500 text-sm">Aucun agent affecté</p>
                ) : (
                  <div className="space-y-2">
                    {getAssignmentsForEvent(selectedEvent.id).map(assignment => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-medium mr-3">
                            {assignment.agent?.firstName?.[0]}{assignment.agent?.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {assignment.agent?.firstName} {assignment.agent?.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{assignment.role}</p>
                          </div>
                        </div>
                        <span className={`badge ${
                          assignment.status === 'confirmed' ? 'badge-success' :
                          assignment.status === 'pending' ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {assignment.status === 'confirmed' ? 'Confirmé' :
                           assignment.status === 'pending' ? 'En attente' : 'Refusé'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick assign */}
                <div className="mt-4">
                  <label className="label">Affecter un agent</label>
                  <div className="flex gap-2">
                    <select
                      className="input flex-1"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignAgent(selectedEvent.id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="">Sélectionner un agent</option>
                      {agents
                        .filter(a => !getAssignmentsForEvent(selectedEvent.id).some(as => as.agentId === a.id))
                        .map(agent => (
                          <option key={agent.id} value={agent.id}>
                            {agent.firstName} {agent.lastName}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="btn-secondary"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-3">Légende</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded bg-green-100 border-l-4 border-green-500 mr-2" />
            <span className="text-gray-600">Effectif complet</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded bg-yellow-100 border-l-4 border-yellow-500 mr-2" />
            <span className="text-gray-600">Effectif partiel</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded bg-red-100 border-l-4 border-red-500 mr-2" />
            <span className="text-gray-600">Aucun agent</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Planning;
