import React from 'react';
import { FiCamera, FiX } from 'react-icons/fi';

/**
 * CameraCapture - Composant pour la capture caméra avec guide visuel
 */
export const CameraCapture = ({
  videoRef,
  isActive,
  isDetected,
  onStart,
  onStop,
  onCancel,
  facialMessage,
  matchScore,
  loading = false
}) => {
  return (
    <div className="space-y-4">
      {isActive ? (
        <>
          {/* VIDEO CONTAINER */}
          <div className="relative bg-black rounded-2xl overflow-hidden shadow-xl aspect-square md:aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* FACE GUIDE OVERLAY */}
            {isDetected && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-32 md:w-40 h-40 md:h-48 border-2 border-green-400 rounded-xl animate-pulse shadow-lg shadow-green-400/50"></div>
              </div>
            )}

            {/* CORNER GUIDES */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top Left */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white/30 rounded-tl"></div>
              {/* Top Right */}
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white/30 rounded-tr"></div>
              {/* Bottom Left */}
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white/30 rounded-bl"></div>
              {/* Bottom Right */}
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white/30 rounded-br"></div>
            </div>

            {/* NO FACE MESSAGE */}
            {!isDetected && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <p className="text-white/60 text-center px-4">Face non détectée</p>
              </div>
            )}

            {/* STATUS TEXT */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <p className={`text-xs md:text-sm font-semibold text-center ${
                isDetected ? 'text-green-300' : 'text-yellow-300'
              }`}>
                {facialMessage}
              </p>
              {matchScore > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/70 text-xs">Correspondance</span>
                    <span className="text-white/70 text-xs font-mono">{Math.round(matchScore)}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        matchScore >= 50 ? 'bg-green-500' : matchScore >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(matchScore, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <button
              onClick={onCancel || onStop}
              disabled={loading}
              className={`py-3 md:py-4 px-4 bg-red-500/20 border border-red-500/50 text-red-300 rounded-xl hover:bg-red-500/30 transition font-semibold flex items-center justify-center gap-2 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <FiX size={18} />
              <span className="hidden sm:inline">Annuler</span>
            </button>

            <button
              onClick={onStop}
              disabled={loading}
              className={`py-3 md:py-4 px-4 bg-green-500/20 border border-green-500/50 text-green-300 rounded-xl hover:bg-green-500/30 transition font-semibold flex items-center justify-center gap-2 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <FiCamera size={18} />
              <span className="hidden sm:inline">Valider</span>
            </button>
          </div>
        </>
      ) : (
        // START CAMERA BUTTON
        <button
          onClick={onStart}
          disabled={loading}
          className={`
            w-full py-4 md:py-6 px-6 bg-gradient-to-r from-blue-500 to-cyan-500
            text-white rounded-xl font-bold text-lg
            hover:shadow-lg hover:shadow-blue-500/50 transition-all transform hover:scale-105 active:scale-95
            flex items-center justify-center gap-3 shadow-lg
            ${loading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <FiCamera size={24} />
          <span className="hidden sm:inline">Ouvrir la caméra</span>
          <span className="sm:hidden">Caméra</span>
        </button>
      )}
    </div>
  );
};

export default CameraCapture;
