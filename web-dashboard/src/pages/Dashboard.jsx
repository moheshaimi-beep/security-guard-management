import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  FiUsers, FiCalendar, FiClock, FiAlertCircle,
  FiCheckCircle, FiXCircle, FiTrendingUp, FiMapPin,
  FiNavigation, FiPlay, FiPause, FiRefreshCw, FiBell,
  FiShield, FiActivity, FiTarget, FiAward, FiZap,
  FiSun, FiMoon, FiCloudRain, FiWind, FiThermometer,
  FiEye, FiUserCheck, FiUserX, FiAlertTriangle,
  FiArrowUp, FiArrowDown, FiMoreVertical, FiChevronRight,
  FiBarChart2, FiPieChart, FiTrendingDown, FiPercent,
  FiStar, FiMessageCircle, FiPhone, FiMail
} from 'react-icons/fi';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, RadialBarChart, RadialBar,
  Legend, ComposedChart
} from 'recharts';
import { reportsAPI, eventsAPI, usersAPI } from '../services/api';
import { format, differenceInSeconds, isToday, isTomorrow, isPast, isFuture, differenceInDays, differenceInHours, differenceInMinutes, startOfDay, endOfDay, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import DynamicMapIntegrated from '../components/maps/DynamicMapIntegrated';
import WeatherWidget from '../components/WeatherWidget';
import { browserNotifications } from '../services/notifications';

// ============================================
// COMPOSANTS UTILITAIRES
// ============================================

// Animated Counter Component
const AnimatedCounter = ({ value, duration = 1000, prefix = '', suffix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value) || 0;
    if (start === end) return;

    const incrementTime = duration / end;
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) clearInterval(timer);
    }, Math.max(incrementTime, 10));

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{prefix}{count}{suffix}</span>;
};

// Progress Ring Component
const ProgressRing = ({ progress, size = 60, strokeWidth = 6, color = '#3B82F6', bgColor = '#E5E7EB', children }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

// Stat Card with Gradient
const StatCard = ({ title, value, icon: Icon, gradient, trend, trendLabel, onClick, subtitle, suffix = '', loading }) => (
  <div
    onClick={onClick}
    className={`group relative overflow-hidden rounded-2xl p-6 text-white transform transition-all duration-300 ${
      onClick ? 'cursor-pointer hover:scale-105 hover:shadow-2xl' : 'hover:scale-102 hover:shadow-xl'
    }`}
    style={{ background: gradient }}
  >
    {/* Enhanced background decoration */}
    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
    <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 group-hover:rotate-45 transition-transform duration-1000" />

    <div className="relative z-10">
      <div className="flex items-start justify-between mb-6">
        <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm group-hover:bg-white/30 transition-colors duration-300 group-hover:scale-110 transform">
          <Icon size={28} className="group-hover:animate-pulse" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold backdrop-blur-sm ${
            trend > 0 ? 'bg-green-400/30 text-green-100 shadow-lg shadow-green-500/20' : 
            trend < 0 ? 'bg-red-400/30 text-red-100 shadow-lg shadow-red-500/20' : 
            'bg-white/20 text-white shadow-lg shadow-white/10'
          } group-hover:scale-110 transition-all duration-300`}>
            {trend > 0 ? <FiArrowUp size={14} className="animate-bounce" /> : 
             trend < 0 ? <FiArrowDown size={14} className="animate-bounce" /> : null}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      {loading ? (
        <div className="animate-pulse">
          <div className="h-10 bg-white/20 rounded-xl w-20 mb-3" />
          <div className="h-5 bg-white/10 rounded-lg w-32" />
        </div>
      ) : (
        <>
          <div className="mb-3">
            <p className="text-3xl lg:text-4xl font-black mb-1 group-hover:scale-110 transition-transform duration-300">
              <AnimatedCounter value={value} />{suffix}
            </p>
            <p className="text-white/90 text-base font-bold tracking-wide">{title}</p>
            {subtitle && <p className="text-white/70 text-sm mt-2 font-medium">{subtitle}</p>}
          </div>
        </>
      )}
    </div>

    {/* Shine effect on hover */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
  </div>
);

// Mini Stat Card
const MiniStatCard = ({ label, value, icon: Icon, color, change }) => (
  <div className="group bg-white rounded-2xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={20} className="group-hover:animate-pulse" />
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
          change >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        } group-hover:scale-110 transition-all duration-300`}>
          {change >= 0 ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />}
          {change >= 0 ? '+' : ''}{change}%
        </div>
      )}
    </div>
    <div className="space-y-2">
      <p className="text-3xl font-black text-gray-900 group-hover:scale-105 transition-transform duration-300">{value}</p>
      <p className="text-sm text-gray-600 font-semibold">{label}</p>
    </div>
    
    {/* Subtle shine effect */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out rounded-2xl" />
  </div>
);

// ============================================
// COUNTDOWN COMPONENT AMÉLIORÉ
// ============================================

const EventCountdownCard = ({ event, featured = false }) => {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, status: 'upcoming' });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();

      // Parser la date de début
      let startDateStr = event.startDate;
      if (typeof startDateStr === 'string' && startDateStr.includes('T')) {
        startDateStr = startDateStr.split('T')[0];
      }
      const [startYear, startMonth, startDay] = (startDateStr || '').split('-').map(Number);
      const eventStartDate = new Date(startYear, startMonth - 1, startDay);
      const checkInTime = event.checkInTime || '08:00:00';
      const [checkInHours, checkInMinutes] = checkInTime.split(':').map(Number);
      eventStartDate.setHours(checkInHours || 0, checkInMinutes || 0, 0, 0);

      // Parser la date de fin
      let endDateStr = event.endDate || event.startDate;
      if (typeof endDateStr === 'string' && endDateStr.includes('T')) {
        endDateStr = endDateStr.split('T')[0];
      }
      const [endYear, endMonth, endDay] = (endDateStr || '').split('-').map(Number);
      const eventEndDate = new Date(endYear, endMonth - 1, endDay);
      const checkOutTime = event.checkOutTime || '18:00:00';
      const [checkOutHours, checkOutMinutes] = checkOutTime.split(':').map(Number);
      eventEndDate.setHours(checkOutHours || 23, checkOutMinutes || 59, 0, 0);

      if (now < eventStartDate) {
        const diff = eventStartDate.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        // Calculer le progrès jusqu'au début (sur 24h avant)
        const hoursUntil = diff / (1000 * 60 * 60);
        setProgress(Math.max(0, 100 - (hoursUntil / 24) * 100));

        return { days, hours, minutes, seconds, status: days === 0 && hours < 2 ? 'imminent' : 'upcoming' };
      }

      if (now >= eventStartDate && now < eventEndDate) {
        const totalDuration = eventEndDate.getTime() - eventStartDate.getTime();
        const elapsed = now.getTime() - eventStartDate.getTime();
        setProgress((elapsed / totalDuration) * 100);
        return { days: 0, hours: 0, minutes: 0, seconds: 0, status: 'active' };
      }

      setProgress(100);
      return { days: 0, hours: 0, minutes: 0, seconds: 0, status: 'ended' };
    };

    setCountdown(calculateCountdown());
    const interval = setInterval(() => setCountdown(calculateCountdown()), 1000);
    return () => clearInterval(interval);
  }, [event]);

  const getStatusConfig = () => {
    switch (countdown.status) {
      case 'imminent':
        return { color: 'from-orange-500 to-red-500', bgColor: 'bg-orange-50', textColor: 'text-orange-600', label: 'Imminent', icon: FiZap };
      case 'active':
        return { color: 'from-green-500 to-emerald-500', bgColor: 'bg-green-50', textColor: 'text-green-600', label: 'En cours', icon: FiPlay };
      case 'ended':
        return { color: 'from-gray-400 to-gray-500', bgColor: 'bg-gray-50', textColor: 'text-gray-600', label: 'Terminé', icon: FiCheckCircle };
      default:
        return { color: 'from-blue-500 to-indigo-500', bgColor: 'bg-blue-50', textColor: 'text-blue-600', label: 'À venir', icon: FiCalendar };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  if (featured) {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.color} p-6 text-white`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <StatusIcon size={20} className={countdown.status === 'imminent' ? 'animate-pulse' : ''} />
              <span className="font-semibold">{config.label}</span>
            </div>
            {countdown.status === 'active' && (
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
            )}
          </div>

          <h3 className="text-2xl font-bold mb-2">{event.name}</h3>
          <p className="text-white/80 text-sm flex items-center mb-4">
            <FiMapPin className="mr-1" size={14} />
            {event.location?.substring(0, 40)}{event.location?.length > 40 ? '...' : ''}
          </p>

          {countdown.status === 'upcoming' || countdown.status === 'imminent' ? (
            <div className="grid grid-cols-4 gap-1 sm:gap-2">
              {[
                { value: countdown.days, label: 'Jours' },
                { value: countdown.hours, label: 'Heures' },
                { value: countdown.minutes, label: 'Min' },
                { value: countdown.seconds, label: 'Sec' }
              ].map((item, i) => (
                <div key={i} className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-3xl font-bold font-mono">{String(item.value).padStart(2, '0')}</div>
                  <div className="text-xs text-white/70">{item.label}</div>
                </div>
              ))}
            </div>
          ) : countdown.status === 'active' ? (
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Progression</span>
                <span className="text-sm font-bold">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
              <FiCheckCircle size={32} className="mx-auto mb-2" />
              <p>Événement terminé</p>
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center gap-2 text-sm">
              <FiClock size={14} />
              {event.checkInTime} - {event.checkOutTime}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FiUsers size={14} />
              {event.assignedAgentsCount || 0}/{event.requiredAgents} agents
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.color} ${countdown.status === 'active' || countdown.status === 'imminent' ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bgColor} ${config.textColor}`}>
              {config.label}
            </span>
          </div>
          <h4 className="font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
            {event.name}
          </h4>
          <p className="text-xs text-gray-500 truncate flex items-center mt-1">
            <FiMapPin className="mr-1 flex-shrink-0" size={10} />
            {event.location?.substring(0, 30)}{event.location?.length > 30 ? '...' : ''}
          </p>
        </div>

        {(countdown.status === 'upcoming' || countdown.status === 'imminent') && (
          <ProgressRing
            progress={progress}
            size={50}
            strokeWidth={4}
            color={countdown.status === 'imminent' ? '#F97316' : '#3B82F6'}
          >
            <span className="text-xs font-bold text-gray-700">
              {countdown.days > 0 ? `${countdown.days}j` : countdown.hours > 0 ? `${countdown.hours}h` : `${countdown.minutes}m`}
            </span>
          </ProgressRing>
        )}
      </div>

      {(countdown.status === 'upcoming' || countdown.status === 'imminent') && (
        <div className="grid grid-cols-4 gap-1 sm:gap-1.5 mb-3">
          {[
            { v: countdown.days, l: 'J' },
            { v: countdown.hours, l: 'H' },
            { v: countdown.minutes, l: 'M' },
            { v: countdown.seconds, l: 'S' }
          ].map((item, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-gray-800 font-mono">{String(item.v).padStart(2, '0')}</div>
              <div className="text-[10px] text-gray-400">{item.l}</div>
            </div>
          ))}
        </div>
      )}

      {countdown.status === 'active' && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>En cours</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${config.color} transition-all duration-1000`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-50">
        <span className="flex items-center gap-1">
          <FiCalendar size={12} />
          {format(new Date(event.startDate.split('T')[0]), 'dd MMM', { locale: fr })}
        </span>
        <span className="flex items-center gap-1">
          <FiClock size={12} />
          {event.checkInTime?.substring(0, 5)}
        </span>
        <span className="flex items-center gap-1">
          <FiUsers size={12} />
          {event.assignedAgentsCount || 0}/{event.requiredAgents}
        </span>
      </div>
    </div>
  );
};

// ============================================
// ACTIVITY TIMELINE COMPONENT
// ============================================

const ActivityTimeline = ({ activities }) => {
  const getActivityConfig = (action) => {
    if (action?.includes('CHECK_IN')) return { icon: FiUserCheck, color: 'bg-green-500', bgColor: 'bg-green-50' };
    if (action?.includes('CHECK_OUT')) return { icon: FiClock, color: 'bg-blue-500', bgColor: 'bg-blue-50' };
    if (action?.includes('ABSENT') || action?.includes('LATE')) return { icon: FiUserX, color: 'bg-red-500', bgColor: 'bg-red-50' };
    if (action?.includes('CREATE')) return { icon: FiCalendar, color: 'bg-purple-500', bgColor: 'bg-purple-50' };
    if (action?.includes('ALERT')) return { icon: FiAlertCircle, color: 'bg-orange-500', bgColor: 'bg-orange-50' };
    return { icon: FiActivity, color: 'bg-gray-500', bgColor: 'bg-gray-50' };
  };

  return (
    <div className="space-y-4">
      {activities?.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <FiActivity size={40} className="mx-auto mb-2 opacity-50" />
          <p>Aucune activité récente</p>
        </div>
      ) : (
        activities?.slice(0, 8).map((activity, index) => {
          const config = getActivityConfig(activity.action);
          const Icon = config.icon;

          return (
            <div key={index} className="flex items-start gap-3 group">
              <div className={`relative flex-shrink-0 p-2 rounded-full ${config.color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                <Icon size={14} />
                {index < (activities?.length || 0) - 1 && (
                  <div className="absolute top-full left-1/2 w-0.5 h-8 bg-gray-200 -translate-x-1/2" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{activity.description}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                  <span>{activity.user?.firstName} {activity.user?.lastName}</span>
                  <span>•</span>
                  <span>{activity.createdAt ? format(new Date(activity.createdAt), 'HH:mm', { locale: fr }) : ''}</span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

// ============================================
// AGENTS ONLINE COMPONENT
// ============================================

const AgentsOnlineWidget = ({ agents }) => {
  const activeAgents = agents.filter(a => a.status === 'active');
  const onlineAgents = agents.filter(a => a.lastLocationUpdate);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <FiUsers className="text-blue-500" />
          Agents en ligne
        </h3>
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
          {onlineAgents.length} connectés
        </span>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-4">
        <div className="bg-blue-50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-blue-600">{agents.length}</p>
          <p className="text-[10px] text-blue-500">Total</p>
        </div>
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-green-600">{activeAgents.length}</p>
          <p className="text-[10px] text-green-500">Actifs</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-orange-600">{onlineAgents.length}</p>
          <p className="text-[10px] text-orange-500">En ligne</p>
        </div>
      </div>

      {/* Agents list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {agents.slice(0, 6).map(agent => (
          <div key={agent.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-medium text-sm">
                {agent.firstName?.[0]}{agent.lastName?.[0]}
              </div>
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                agent.lastLocationUpdate ? 'bg-green-500' : agent.status === 'active' ? 'bg-yellow-500' : 'bg-gray-400'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {agent.firstName} {agent.lastName}
              </p>
              <p className="text-xs text-gray-400">{agent.employeeId}</p>
            </div>
            {agent.lastLocationUpdate && (
              <div className="text-right">
                <p className="text-xs text-gray-400">
                  {format(new Date(agent.lastLocationUpdate), 'HH:mm')}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {agents.length > 6 && (
        <button className="w-full mt-3 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-1">
          Voir tous les agents <FiChevronRight size={14} />
        </button>
      )}
    </div>
  );
};

// ============================================
// QUICK ACTIONS COMPONENT
// ============================================

const QuickActions = () => {
  const actions = [
    { icon: FiCalendar, label: 'Nouvel événement', color: 'bg-blue-500', href: '/events' },
    { icon: FiUsers, label: 'Ajouter agent', color: 'bg-green-500', href: '/users' },
    { icon: FiClipboard, label: 'Planifier', color: 'bg-purple-500', href: '/planning' },
    { icon: FiBarChart2, label: 'Rapports', color: 'bg-orange-500', href: '/reports' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {actions.map((action, i) => (
        <a
          key={i}
          href={action.href}
          className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all group"
        >
          <div className={`p-3 rounded-xl ${action.color} text-white group-hover:scale-110 transition-transform`}>
            <action.icon size={20} />
          </div>
          <span className="text-xs text-gray-600 font-medium text-center">{action.label}</span>
        </a>
      ))}
    </div>
  );
};

// Missing icon
const FiClipboard = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

// ============================================
// TODAY SCHEDULE COMPONENT
// ============================================

const TodaySchedule = ({ events }) => {
  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.startDate.split('T')[0]);
    return isToday(eventDate);
  }).sort((a, b) => (a.checkInTime || '').localeCompare(b.checkInTime || ''));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <FiClock className="text-purple-500" />
          Aujourd'hui
        </h3>
        <span className="text-sm text-gray-500">
          {format(new Date(), 'EEEE d MMMM', { locale: fr })}
        </span>
      </div>

      {todayEvents.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <FiCalendar size={40} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucun événement aujourd'hui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {todayEvents.map((event, index) => {
            const now = new Date();
            const [h, m] = (event.checkInTime || '08:00').split(':').map(Number);
            const [eh, em] = (event.checkOutTime || '18:00').split(':').map(Number);
            const startTime = new Date();
            startTime.setHours(h, m, 0, 0);
            const endTime = new Date();
            endTime.setHours(eh, em, 0, 0);

            let status = 'upcoming';
            if (now >= startTime && now <= endTime) status = 'active';
            else if (now > endTime) status = 'ended';

            return (
              <div
                key={event.id}
                className={`relative pl-4 py-3 rounded-lg border-l-4 ${
                  status === 'active' ? 'border-green-500 bg-green-50' :
                  status === 'ended' ? 'border-gray-300 bg-gray-50' :
                  'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{event.name}</p>
                    <p className="text-xs text-gray-500">
                      {event.checkInTime?.substring(0, 5)} - {event.checkOutTime?.substring(0, 5)}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    status === 'active' ? 'bg-green-200 text-green-700' :
                    status === 'ended' ? 'bg-gray-200 text-gray-600' :
                    'bg-blue-200 text-blue-700'
                  }`}>
                    {status === 'active' ? 'En cours' : status === 'ended' ? 'Terminé' : 'À venir'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================
// PERFORMANCE CHART COMPONENT
// ============================================

const PerformanceChart = ({ data }) => {
  const chartData = data?.slice(-7) || [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <FiTrendingUp className="text-blue-500" />
          Performance hebdomadaire
        </h3>
        <select className="text-sm border border-gray-200 rounded-lg px-2 py-1">
          <option>7 derniers jours</option>
          <option>14 derniers jours</option>
          <option>30 derniers jours</option>
        </select>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(new Date(value), 'dd/MM')}
              tick={{ fontSize: 11 }}
              stroke="#9CA3AF"
            />
            <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              labelFormatter={(value) => format(new Date(value), 'EEEE d MMMM', { locale: fr })}
            />
            <Area
              type="monotone"
              dataKey="present"
              stroke="#10B981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPresent)"
              name="Présents"
            />
            <Bar dataKey="late" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Retards" />
            <Bar dataKey="absent" fill="#EF4444" radius={[4, 4, 0, 0]} name="Absents" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs text-gray-600">Présents</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-xs text-gray-600">Retards</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-xs text-gray-600">Absents</span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// ATTENDANCE DONUT CHART
// ============================================

const AttendanceDonut = ({ stats }) => {
  const data = [
    { name: 'Présent', value: stats?.todayAttendance?.present || 0, color: '#10B981' },
    { name: 'Retard', value: stats?.todayAttendance?.late || 0, color: '#F59E0B' },
    { name: 'Absent', value: stats?.todayAttendance?.absent || 0, color: '#EF4444' },
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const presentPercent = total > 0 ? Math.round((data[0].value / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
        <FiPieChart className="text-green-500" />
        Présences aujourd'hui
      </h3>

      <div className="flex items-center justify-center">
        <div className="relative" style={{ width: 180, height: 180 }}>
          <PieChart width={180} height={180}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-800">{presentPercent}%</span>
            <span className="text-xs text-gray-500">Présence</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-4">
        {data.map((item, i) => (
          <div key={i} className="text-center p-2 rounded-lg bg-gray-50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-lg font-bold" style={{ color: item.color }}>{item.value}</span>
            </div>
            <span className="text-xs text-gray-500">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// ALERTS WIDGET
// ============================================

const AlertsWidget = ({ stats, events }) => {
  const alerts = [];

  // Check for understaffed events
  events.forEach(event => {
    const assigned = event.assignedAgentsCount || 0;
    if (assigned < event.requiredAgents) {
      alerts.push({
        type: 'warning',
        message: `${event.name}: ${event.requiredAgents - assigned} agent(s) manquant(s)`,
        icon: FiUsers
      });
    }
  });

  // Check for high absence rate
  if (stats?.todayAttendance?.absent > 2) {
    alerts.push({
      type: 'danger',
      message: `${stats.todayAttendance.absent} absences aujourd'hui`,
      icon: FiUserX
    });
  }

  // Check for late arrivals
  if (stats?.todayAttendance?.late > 0) {
    alerts.push({
      type: 'warning',
      message: `${stats.todayAttendance.late} retard(s) signalé(s)`,
      icon: FiClock
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      type: 'success',
      message: 'Tout est en ordre, aucune alerte',
      icon: FiCheckCircle
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <FiBell className="text-orange-500" />
          Alertes
        </h3>
        {alerts.length > 0 && alerts[0].type !== 'success' && (
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        )}
      </div>

      <div className="space-y-3">
        {alerts.slice(0, 5).map((alert, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-xl ${
              alert.type === 'danger' ? 'bg-red-50' :
              alert.type === 'warning' ? 'bg-orange-50' :
              'bg-green-50'
            }`}
          >
            <alert.icon className={`flex-shrink-0 ${
              alert.type === 'danger' ? 'text-red-500' :
              alert.type === 'warning' ? 'text-orange-500' :
              'text-green-500'
            }`} size={18} />
            <p className={`text-sm ${
              alert.type === 'danger' ? 'text-red-700' :
              alert.type === 'warning' ? 'text-orange-700' :
              'text-green-700'
            }`}>
              {alert.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [events, setEvents] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(browserNotifications.hasPermission());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userLocation, setUserLocation] = useState({ latitude: 33.5731, longitude: -7.5898 }); // Casablanca par défaut

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => console.log('Géolocalisation non disponible')
      );
    }

    return () => clearInterval(interval);
  }, []);

  const enableNotifications = async () => {
    const result = await browserNotifications.requestPermission();
    setNotificationsEnabled(result.granted);
    if (result.granted) {
      browserNotifications.send('Notifications activées', {
        body: 'Vous recevrez les alertes importantes en temps réel.'
      });
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, trendsRes, eventsRes, agentsRes] = await Promise.all([
        reportsAPI.getDashboard(),
        reportsAPI.getAttendanceTrends({ days: 14 }),
        eventsAPI.getAll({ limit: 50 }),
        usersAPI.getAgents()
      ]);

      // Handle error responses from handleApiError
      if (statsRes?.success === false) {
        console.error('Stats API Error:', statsRes.message);
        setStats(null);
      } else if (statsRes?.data?.data) {
        setStats(statsRes.data.data);
      }

      if (trendsRes?.success === false) {
        console.error('Trends API Error:', trendsRes.message);
        setTrends(null);
      } else if (trendsRes?.data?.data) {
        setTrends(trendsRes.data.data);
      }

      if (eventsRes?.success === false) {
        console.error('Events API Error:', eventsRes.message);
        setEvents([]);
      } else if (eventsRes?.data?.data?.events) {
        setEvents(eventsRes.data.data.events);
      } else if (Array.isArray(eventsRes?.data?.data)) {
        setEvents(eventsRes.data.data);
      }

      if (agentsRes?.success === false) {
        console.error('Agents API Error:', agentsRes.message);
        setAgents([]);
      } else if (Array.isArray(agentsRes?.data?.data)) {
        setAgents(agentsRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter upcoming events
  const upcomingEvents = useMemo(() => {
    return events
      .filter(e => {
        const endDateStr = (e.endDate || e.startDate).split('T')[0];
        const [y, m, d] = endDateStr.split('-').map(Number);
        const endDate = new Date(y, m - 1, d);
        const [h, min] = (e.checkOutTime || '23:59').split(':').map(Number);
        endDate.setHours(h, min, 59, 0);
        return endDate >= new Date();
      })
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .slice(0, 6);
  }, [events]);

  // Get featured event (next upcoming or currently active)
  const featuredEvent = useMemo(() => {
    return upcomingEvents[0];
  }, [upcomingEvents]);

  const activeAgents = agents.filter(a => a.status === 'active');

  // Calculate quick stats
  const activeEventsCount = events.filter(e => {
    const now = new Date();
    const startStr = e.startDate.split('T')[0];
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const [sh, smin] = (e.checkInTime || '00:00').split(':').map(Number);
    start.setHours(sh, smin, 0, 0);

    const endStr = (e.endDate || e.startDate).split('T')[0];
    const [ey, em, ed] = endStr.split('-').map(Number);
    const end = new Date(ey, em - 1, ed);
    const [eh, emin] = (e.checkOutTime || '23:59').split(':').map(Number);
    end.setHours(eh, emin, 59, 0);

    return now >= start && now <= end;
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500 font-medium">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* ==================== HEADER ==================== */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <FiActivity className="text-white" size={24} />
              </div>
              Tableau de bord
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              {format(currentTime, "EEEE d MMMM yyyy", { locale: fr })}
              <span className="mx-2 text-gray-400">•</span>
              <span className="font-mono text-base font-bold text-blue-600">
                {format(currentTime, "HH:mm:ss")}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!notificationsEnabled && (
              <button
                onClick={enableNotifications}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <FiBell size={18} />
                <span className="hidden sm:inline">Activer les alertes</span>
              </button>
            )}
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <FiRefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================== STAT CARDS ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Agents actifs"
          value={stats?.overview?.activeAgents || activeAgents.length}
          icon={FiUsers}
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          trend={5}
          subtitle={`${agents.length} au total`}
        />
        <StatCard
          title="Événements en cours"
          value={stats?.overview?.activeEvents || activeEventsCount}
          icon={FiCalendar}
          gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
          subtitle={`${events.length} total planifiés`}
        />
        <StatCard
          title="Pointages aujourd'hui"
          value={stats?.overview?.todayAttendances || 0}
          icon={FiCheckCircle}
          gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
          trend={12}
        />
        <StatCard
          title="Taux de présence"
          value={stats?.todayAttendance ? Math.round((stats.todayAttendance.present / (stats.todayAttendance.present + stats.todayAttendance.late + stats.todayAttendance.absent || 1)) * 100) : 0}
          icon={FiTarget}
          gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
          suffix="%"
        />
      </div>

      {/* ==================== ÉVÉNEMENT PRINCIPAL ==================== */}
      {featuredEvent ? (
        <EventCountdownCard event={featuredEvent} featured />
      ) : (
        <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl border border-gray-100 p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiCalendar size={32} className="text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Aucun événement à venir</h3>
          <p className="text-gray-600 mb-6">Créez un nouvel événement pour commencer la planification</p>
          <a href="/events" className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1">
            <FiCalendar size={20} /> Créer un événement
          </a>
        </div>
      )}

      {/* ==================== CARTE DYNAMIQUE PRINCIPALE ==================== */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <FiMapPin className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Carte Dynamique</h2>
                <p className="text-blue-100 text-sm">Vue en temps réel des événements et agents</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-white">
              <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-sm font-medium">En direct</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ height: '600px' }}>
          <DynamicMapIntegrated events={events} agents={activeAgents} />
        </div>
      </div>

      {/* ==================== WIDGETS LATÉRAUX ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AgentsOnlineWidget agents={agents} />
        <WeatherWidget latitude={userLocation.latitude} longitude={userLocation.longitude} />
        <AlertsWidget stats={stats} events={events} />
      </div>

      {/* ==================== ÉVÉNEMENTS À VENIR ==================== */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <FiClock className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Événements à venir</h2>
              <p className="text-sm text-gray-600">{upcomingEvents.length} événements planifiés</p>
            </div>
          </div>
          <a href="/events" className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all duration-300 font-medium">
            Voir tout <FiChevronRight size={16} />
          </a>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCalendar size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Aucun événement à venir</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {upcomingEvents.slice(0, 6).map(event => (
              <EventCountdownCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      {/* ==================== PLANNING DU JOUR ==================== */}
      <TodaySchedule events={events} />

      {/* ==================== ANALYSES ET STATISTIQUES ==================== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Performance Chart - 2 columns */}
        <div className="xl:col-span-2">
          <PerformanceChart data={trends} />
        </div>

        {/* Attendance Donut */}
        <AttendanceDonut stats={stats} />
      </div>

      {/* ==================== ACTIVITÉ ET STATISTIQUES DÉTAILLÉES ==================== */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Recent Activity - 3 columns */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <FiActivity className="text-white" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Activité récente</h3>
                <p className="text-sm text-gray-600">Dernières 24 heures</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium">Temps réel</span>
          </div>
          <ActivityTimeline activities={stats?.recentActivity} />
        </div>

        {/* Mini Stats Grid - 1 column */}
        <div className="space-y-4">
          <MiniStatCard
            label="Événements ce mois"
            value={events.length}
            icon={FiCalendar}
            color="bg-gradient-to-br from-blue-500 to-cyan-500"
          />
          <MiniStatCard
            label="Agents en service"
            value={activeAgents.length}
            icon={FiShield}
            color="bg-gradient-to-br from-green-500 to-emerald-500"
          />
          <MiniStatCard
            label="Affectations en attente"
            value={stats?.overview?.pendingAssignments || 0}
            icon={FiAlertCircle}
            color="bg-gradient-to-br from-orange-500 to-red-500"
          />
          <MiniStatCard
            label="Score moyen"
            value={Math.round(agents.reduce((sum, a) => sum + (a.overallScore || 0), 0) / (agents.length || 1))}
            icon={FiStar}
            color="bg-gradient-to-br from-purple-500 to-pink-500"
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
