import React from 'react';
import {
  FiCamera, FiMapPin, FiCheck, FiLoader, FiAlertCircle, FiSmartphone
} from 'react-icons/fi';

/**
 * ValidationBadge - Composant pour afficher l'état des validations
 */
export const ValidationBadge = ({
  icon: Icon,
  title,
  status, // 'success' | 'loading' | 'warning' | 'error' | 'pending'
  message,
  detail,
  onClick,
  className = ''
}) => {
  const statusConfig = {
    success: {
      bg: 'bg-green-500/20',
      border: 'border-green-500/50',
      icon: 'text-green-400',
      text: 'text-green-300',
      glow: 'shadow-lg shadow-green-500/20'
    },
    loading: {
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/50',
      icon: 'text-blue-400',
      text: 'text-blue-300',
      glow: 'shadow-lg shadow-blue-500/20'
    },
    warning: {
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/50',
      icon: 'text-yellow-400',
      text: 'text-yellow-300',
      glow: 'shadow-lg shadow-yellow-500/20'
    },
    error: {
      bg: 'bg-red-500/20',
      border: 'border-red-500/50',
      icon: 'text-red-400',
      text: 'text-red-300',
      glow: 'shadow-lg shadow-red-500/20'
    },
    pending: {
      bg: 'bg-white/5',
      border: 'border-white/20',
      icon: 'text-white/40',
      text: 'text-white/60',
      glow: ''
    }
  };

  const config = statusConfig[status] || statusConfig.pending;

  const renderIcon = () => {
    switch (status) {
      case 'success':
        return <FiCheck className={`${config.icon} text-2xl`} />;
      case 'loading':
        return <FiLoader className={`${config.icon} text-2xl animate-spin`} />;
      case 'warning':
        return <FiAlertCircle className={`${config.icon} text-2xl`} />;
      case 'error':
        return <FiAlertCircle className={`${config.icon} text-2xl`} />;
      default:
        return Icon ? <Icon className={`${config.icon} text-2xl`} /> : null;
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`
        p-4 rounded-2xl backdrop-blur-md border transition-all transform hover:scale-105
        ${config.bg} ${config.border} ${config.glow}
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
        ${className}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-white/80 font-semibold text-sm">{title}</p>
        {renderIcon()}
      </div>
      <p className={`text-xs ${config.text}`}>
        {message}
      </p>
      {detail && (
        <div className="mt-2 bg-black/20 rounded px-2 py-1">
          <p className="text-white/70 text-xs font-mono">{detail}</p>
        </div>
      )}
    </button>
  );
};

export default ValidationBadge;
