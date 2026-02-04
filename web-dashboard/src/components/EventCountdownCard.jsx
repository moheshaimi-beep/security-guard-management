/**
 * Advanced Event Card with Animated Countdown
 * Beautiful, interactive event display with real-time countdown
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FiMapPin, FiUsers, FiClock, FiCalendar, FiChevronRight,
  FiAlertCircle, FiCheck, FiPlay, FiPause, FiZap
} from 'react-icons/fi';

// Countdown digit component with flip animation
const CountdownDigit = ({ value, label, color = 'blue' }) => {
  const [flip, setFlip] = useState(false);
  const [prevValue, setPrevValue] = useState(value);

  useEffect(() => {
    if (value !== prevValue) {
      setFlip(true);
      const timer = setTimeout(() => {
        setPrevValue(value);
        setFlip(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [value, prevValue]);

  const colorClasses = {
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    green: 'from-green-500 to-green-700 shadow-green-500/30',
    orange: 'from-orange-500 to-orange-700 shadow-orange-500/30',
    red: 'from-red-500 to-red-700 shadow-red-500/30',
    purple: 'from-purple-500 to-purple-700 shadow-purple-500/30',
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`relative overflow-hidden rounded-lg shadow-lg ${colorClasses[color]}`}>
        <div
          className={`bg-gradient-to-b ${colorClasses[color]} px-3 py-2 min-w-[50px] text-center transform transition-transform duration-300 ${
            flip ? 'scale-y-0' : 'scale-y-100'
          }`}
        >
          <span className="text-2xl font-bold text-white font-mono">
            {String(value).padStart(2, '0')}
          </span>
        </div>
        <div className="absolute inset-x-0 top-1/2 h-px bg-black/20" />
      </div>
      <span className="text-xs text-gray-500 mt-1.5 font-medium uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
};

// Circular progress countdown
const CircularCountdown = ({ progress, size = 120, strokeWidth = 8, children }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

// Main Event Card Component
const EventCountdownCard = ({
  event,
  variant = 'default', // 'default', 'compact', 'featured'
  onClick,
  showAgents = true,
  showProgress = true,
}) => {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [status, setStatus] = useState('upcoming'); // 'upcoming', 'starting', 'ongoing', 'ending', 'completed'
  const [progress, setProgress] = useState(0);

  // Calculate countdown
  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();

      // Parser la date de début correctement (format: "2025-12-24" ou "2025-12-24T00:00:00")
      let startDateStr = event.startDate;
      if (typeof startDateStr === 'string' && startDateStr.includes('T')) {
        startDateStr = startDateStr.split('T')[0];
      }
      const [startYear, startMonth, startDay] = (startDateStr || '').split('-').map(Number);
      const startDate = new Date(startYear, startMonth - 1, startDay);

      // Ajouter l'heure de check-in
      if (event.checkInTime) {
        const [hours, minutes, seconds] = event.checkInTime.split(':').map(Number);
        startDate.setHours(hours || 0, minutes || 0, seconds || 0, 0);
      } else {
        startDate.setHours(0, 0, 0, 0);
      }

      // Parser la date de fin
      let endDateStr = event.endDate || event.startDate;
      if (typeof endDateStr === 'string' && endDateStr.includes('T')) {
        endDateStr = endDateStr.split('T')[0];
      }
      const [endYear, endMonth, endDay] = (endDateStr || '').split('-').map(Number);
      const endDate = new Date(endYear, endMonth - 1, endDay);

      // Ajouter l'heure de check-out
      if (event.checkOutTime) {
        const [hours, minutes, seconds] = event.checkOutTime.split(':').map(Number);
        endDate.setHours(hours || 23, minutes || 59, seconds || 0, 0);
      } else {
        endDate.setHours(23, 59, 59, 0);
      }

      // Si l'heure de fin est avant l'heure de début sur le même jour (événement de nuit)
      if (startDate.getTime() === endDate.getTime() || endDate < startDate) {
        if (event.checkOutTime && event.checkInTime) {
          const checkInHour = parseInt(event.checkInTime.split(':')[0]) || 0;
          const checkOutHour = parseInt(event.checkOutTime.split(':')[0]) || 0;
          if (checkOutHour < checkInHour) {
            endDate.setDate(endDate.getDate() + 1);
          }
        }
      }

      let targetDate;
      let newStatus;

      // Debug log (à retirer en production)
      // console.log('Now:', now, 'Start:', startDate, 'End:', endDate);

      if (now < startDate) {
        // L'événement n'a pas encore commencé - countdown jusqu'au début
        targetDate = startDate;
        const timeUntilStart = startDate.getTime() - now.getTime();
        if (timeUntilStart < 30 * 60 * 1000) { // Moins de 30 minutes
          newStatus = 'starting';
        } else {
          newStatus = 'upcoming';
        }
      } else if (now >= startDate && now < endDate) {
        // L'événement est en cours - countdown jusqu'à la fin
        targetDate = endDate;
        const totalDuration = endDate.getTime() - startDate.getTime();
        const elapsed = now.getTime() - startDate.getTime();
        setProgress(Math.min(100, (elapsed / totalDuration) * 100));

        const timeUntilEnd = endDate.getTime() - now.getTime();
        if (timeUntilEnd < 30 * 60 * 1000) { // Moins de 30 minutes
          newStatus = 'ending';
        } else {
          newStatus = 'ongoing';
        }
      } else {
        // L'événement est terminé
        newStatus = 'completed';
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setProgress(100);
        setStatus('completed');
        return;
      }

      setStatus(newStatus);

      const diff = targetDate.getTime() - now.getTime();
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setCountdown({ days, hours, minutes, seconds });
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [event]);

  // Status configurations
  const statusConfig = {
    upcoming: {
      color: 'blue',
      label: 'À venir',
      icon: FiCalendar,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
      countdownLabel: 'Commence dans',
    },
    starting: {
      color: 'orange',
      label: 'Imminent',
      icon: FiZap,
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-200',
      countdownLabel: 'Commence dans',
    },
    ongoing: {
      color: 'green',
      label: 'En cours',
      icon: FiPlay,
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
      countdownLabel: 'Se termine dans',
    },
    ending: {
      color: 'red',
      label: 'Bientôt fini',
      icon: FiAlertCircle,
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      countdownLabel: 'Se termine dans',
    },
    completed: {
      color: 'gray',
      label: 'Terminé',
      icon: FiCheck,
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-200',
      countdownLabel: 'Terminé',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  // Featured variant
  if (variant === 'featured') {
    return (
      <div
        onClick={onClick}
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-6 cursor-pointer group transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]`}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          {/* Status badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor} mb-4`}>
            <StatusIcon className={config.textColor} size={14} />
            <span className={`text-sm font-semibold ${config.textColor}`}>{config.label}</span>
            {status === 'starting' && (
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
            )}
          </div>

          {/* Event name */}
          <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
            {event.name}
          </h3>

          {/* Location & time */}
          <div className="flex flex-wrap gap-4 text-gray-400 text-sm mb-6">
            <div className="flex items-center gap-1">
              <FiMapPin size={14} />
              <span>{event.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <FiClock size={14} />
              <span>{event.checkInTime} - {event.checkOutTime}</span>
            </div>
          </div>

          {/* Countdown */}
          {status !== 'completed' && (
            <div className="mb-6">
              <p className="text-gray-500 text-sm mb-3">{config.countdownLabel}</p>
              <div className="flex items-center gap-3">
                {countdown.days > 0 && (
                  <CountdownDigit value={countdown.days} label="Jours" color={config.color} />
                )}
                <CountdownDigit value={countdown.hours} label="Heures" color={config.color} />
                <CountdownDigit value={countdown.minutes} label="Minutes" color={config.color} />
                <CountdownDigit value={countdown.seconds} label="Secondes" color={config.color} />
              </div>
            </div>
          )}

          {/* Progress bar for ongoing events */}
          {(status === 'ongoing' || status === 'ending') && showProgress && (
            <div className="mb-6">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progression</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    status === 'ending' ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-green-500 to-blue-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Agents */}
          {showAgents && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
              <div className="flex items-center gap-2">
                <FiUsers className="text-gray-500" />
                <span className="text-gray-400">
                  <span className="text-white font-semibold">{event.assignedAgents || 0}</span>
                  /{event.requiredAgents} agents
                </span>
              </div>
              <FiChevronRight className="text-gray-500 group-hover:translate-x-1 transition-transform" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className={`flex items-center gap-4 p-4 rounded-xl bg-white border ${config.borderColor} cursor-pointer hover:shadow-md transition-all`}
      >
        {/* Circular countdown */}
        <CircularCountdown progress={status === 'completed' ? 100 : progress} size={70} strokeWidth={6}>
          <div className="text-center">
            {status !== 'completed' ? (
              <>
                <span className="text-lg font-bold text-gray-800">
                  {countdown.hours > 0 ? countdown.hours : countdown.minutes}
                </span>
                <span className="text-xs text-gray-500 block">
                  {countdown.hours > 0 ? 'hrs' : 'min'}
                </span>
              </>
            ) : (
              <FiCheck className="text-green-500" size={24} />
            )}
          </div>
        </CircularCountdown>

        {/* Event info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
              {config.label}
            </span>
          </div>
          <h4 className="font-semibold text-gray-800 truncate">{event.name}</h4>
          <p className="text-sm text-gray-500 truncate">{event.location}</p>
        </div>

        <FiChevronRight className="text-gray-400" />
      </div>
    );
  }

  // Default variant
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl bg-white border ${config.borderColor} p-5 cursor-pointer hover:shadow-lg transition-all duration-300 group`}
    >
      {/* Status indicator line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
        status === 'upcoming' ? 'from-blue-400 to-blue-600' :
        status === 'starting' ? 'from-orange-400 to-orange-600' :
        status === 'ongoing' ? 'from-green-400 to-green-600' :
        status === 'ending' ? 'from-red-400 to-red-600' :
        'from-gray-300 to-gray-400'
      }`} />

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.bgColor} mb-2`}>
            <StatusIcon className={config.textColor} size={12} />
            <span className={`text-xs font-semibold ${config.textColor}`}>{config.label}</span>
          </div>
          <h3 className="text-lg font-bold text-gray-800 group-hover:text-primary-600 transition-colors">
            {event.name}
          </h3>
        </div>

        {/* Mini countdown for non-completed */}
        {status !== 'completed' && (
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">{config.countdownLabel}</p>
            <div className="font-mono text-lg font-bold text-gray-800">
              {countdown.days > 0 ? `${countdown.days}j ` : ''}
              {String(countdown.hours).padStart(2, '0')}:
              {String(countdown.minutes).padStart(2, '0')}:
              {String(countdown.seconds).padStart(2, '0')}
            </div>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FiMapPin className="text-gray-400" size={14} />
          <span>{event.location}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FiClock className="text-gray-400" size={14} />
          <span>{event.checkInTime} - {event.checkOutTime}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FiCalendar className="text-gray-400" size={14} />
          <span>{new Date(event.startDate).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          })}</span>
        </div>
      </div>

      {/* Progress bar */}
      {(status === 'ongoing' || status === 'ending') && showProgress && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progression</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                status === 'ending'
                  ? 'bg-gradient-to-r from-red-400 to-orange-400'
                  : 'bg-gradient-to-r from-green-400 to-blue-400'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      {showAgents && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            {/* Agent avatars stack */}
            <div className="flex -space-x-2">
              {[...Array(Math.min(3, event.assignedAgents || 0))].map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border-2 border-white flex items-center justify-center"
                >
                  <span className="text-xs font-medium text-gray-600">{i + 1}</span>
                </div>
              ))}
              {(event.assignedAgents || 0) > 3 && (
                <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">+{event.assignedAgents - 3}</span>
                </div>
              )}
            </div>
            <span className="text-sm text-gray-500">
              {event.assignedAgents || 0}/{event.requiredAgents} agents
            </span>
          </div>

          <button className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
            Détails
            <FiChevronRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}
    </div>
  );
};

export default EventCountdownCard;
