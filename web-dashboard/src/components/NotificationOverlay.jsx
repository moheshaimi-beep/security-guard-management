import React, { useEffect, useState } from 'react';
import { FiCheck, FiX, FiAlertCircle, FiUser, FiCamera } from 'react-icons/fi';

/**
 * Composant de notification overlay avec animations
 * Types: success, error, warning, info
 */
const NotificationOverlay = ({
  show,
  type = 'success',
  title,
  message,
  onClose,
  autoClose = true,
  autoCloseDelay = 3000,
  userPhoto = null,
  userName = null
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsLeaving(false);

      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDelay);
        return () => clearTimeout(timer);
      }
    }
  }, [show, autoClose, autoCloseDelay]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsLeaving(false);
      if (onClose) onClose();
    }, 500);
  };

  if (!isVisible) return null;

  const configs = {
    success: {
      bgGradient: 'from-green-500 to-emerald-600',
      iconBg: 'bg-white/20',
      icon: FiCheck,
      ringColor: 'ring-green-300',
      particleColor: 'bg-green-300'
    },
    error: {
      bgGradient: 'from-red-500 to-rose-600',
      iconBg: 'bg-white/20',
      icon: FiX,
      ringColor: 'ring-red-300',
      particleColor: 'bg-red-300'
    },
    warning: {
      bgGradient: 'from-yellow-500 to-orange-500',
      iconBg: 'bg-white/20',
      icon: FiAlertCircle,
      ringColor: 'ring-yellow-300',
      particleColor: 'bg-yellow-300'
    },
    info: {
      bgGradient: 'from-blue-500 to-indigo-600',
      iconBg: 'bg-white/20',
      icon: FiCamera,
      ringColor: 'ring-blue-300',
      particleColor: 'bg-blue-300'
    }
  };

  const config = configs[type] || configs.success;
  const IconComponent = config.icon;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-500 ${
        isLeaving ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={handleClose}
    >
      {/* Particules animées en arrière-plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {type === 'success' && [...Array(20)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 rounded-full ${config.particleColor} opacity-60`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Carte principale */}
      <div
        className={`relative bg-gradient-to-br ${config.bgGradient} rounded-3xl p-8 max-w-md w-full shadow-2xl transform transition-all duration-500 ${
          isLeaving ? 'scale-75 opacity-0' : 'scale-100 opacity-100'
        }`}
        style={{
          animation: !isLeaving ? 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)' : 'none'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cercles décoratifs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />

        {/* Contenu */}
        <div className="relative text-center text-white">
          {/* Photo utilisateur ou icône */}
          {userPhoto ? (
            <div className="relative inline-block mb-6">
              <div className={`w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl ring-4 ${config.ringColor} ring-opacity-50`}
                   style={{ animation: 'pulse-ring 2s infinite' }}>
                <img src={userPhoto} alt={userName} className="w-full h-full object-cover" />
              </div>
              <div className={`absolute -bottom-2 -right-2 w-10 h-10 ${config.iconBg} rounded-full flex items-center justify-center shadow-lg`}
                   style={{ animation: 'pop 0.5s ease-out 0.3s both' }}>
                <IconComponent className="text-white" size={20} />
              </div>
            </div>
          ) : (
            <div className="relative inline-block mb-6">
              <div
                className={`w-24 h-24 ${config.iconBg} rounded-full flex items-center justify-center shadow-xl ring-4 ${config.ringColor} ring-opacity-50`}
                style={{ animation: 'pop 0.5s ease-out 0.2s both' }}
              >
                <IconComponent className="text-white" size={48} />
              </div>
              {type === 'success' && (
                <div className="absolute inset-0 rounded-full border-4 border-white/30"
                     style={{ animation: 'ripple 1.5s ease-out infinite' }} />
              )}
            </div>
          )}

          {/* Nom utilisateur */}
          {userName && (
            <h2
              className="text-2xl font-bold mb-2"
              style={{ animation: 'slideUp 0.5s ease-out 0.4s both' }}
            >
              {userName}
            </h2>
          )}

          {/* Titre */}
          <h3
            className="text-xl font-semibold mb-2"
            style={{ animation: 'slideUp 0.5s ease-out 0.5s both' }}
          >
            {title}
          </h3>

          {/* Message */}
          {message && (
            <p
              className="text-white/80 text-sm"
              style={{ animation: 'slideUp 0.5s ease-out 0.6s both' }}
            >
              {message}
            </p>
          )}

          {/* Barre de progression pour auto-close */}
          {autoClose && (
            <div className="mt-6 h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/60 rounded-full"
                style={{
                  animation: `shrink ${autoCloseDelay}ms linear forwards`
                }}
              />
            </div>
          )}

          {/* Bouton fermer */}
          <button
            onClick={handleClose}
            className="mt-6 px-6 py-2 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-all"
            style={{ animation: 'fadeIn 0.5s ease-out 0.7s both' }}
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Styles d'animation */}
      <style>{`
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes pop {
          0% { transform: scale(0); opacity: 0; }
          80% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes slideUp {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }

        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes ripple {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.4); }
          50% { box-shadow: 0 0 0 10px rgba(255,255,255,0); }
        }

        @keyframes shrink {
          0% { width: 100%; }
          100% { width: 0%; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
      `}</style>
    </div>
  );
};

/**
 * Composant pour afficher les erreurs de validation
 */
export const ValidationErrorsOverlay = ({
  show,
  errors = [],
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (show && errors.length > 0) {
      setIsVisible(true);
      setIsLeaving(false);
    }
  }, [show, errors]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsLeaving(false);
      if (onClose) onClose();
    }, 400);
  };

  if (!isVisible || errors.length === 0) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-400 ${
        isLeaving ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={handleClose}
    >
      <div
        className={`bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all duration-400 ${
          isLeaving ? 'scale-90 opacity-0 translate-y-4' : 'scale-100 opacity-100 translate-y-0'
        }`}
        style={{ animation: !isLeaving ? 'shake 0.5s ease-in-out' : 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
            <FiAlertCircle className="text-red-500" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Erreurs de saisie</h3>
            <p className="text-sm text-gray-500">Veuillez corriger les erreurs suivantes</p>
          </div>
        </div>

        {/* Liste des erreurs */}
        <div className="space-y-2 mb-6">
          {errors.map((error, index) => (
            <div
              key={index}
              className="flex items-start p-3 bg-red-50 rounded-lg border-l-4 border-red-500"
              style={{
                animation: `slideInRight 0.3s ease-out ${index * 0.1}s both`
              }}
            >
              <FiX className="text-red-500 mr-2 mt-0.5 flex-shrink-0" size={16} />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          ))}
        </div>

        {/* Bouton */}
        <button
          onClick={handleClose}
          className="w-full py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-medium hover:from-red-600 hover:to-rose-600 transition-all shadow-lg shadow-red-500/30"
        >
          J'ai compris
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        @keyframes slideInRight {
          0% { transform: translateX(20px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default NotificationOverlay;
