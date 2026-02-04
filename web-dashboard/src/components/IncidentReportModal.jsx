import React, { useState, useRef } from 'react';
import { FiX, FiAlertTriangle, FiCamera, FiUpload, FiLoader, FiCheck, FiFile, FiVideo } from 'react-icons/fi';
import { toast } from 'react-toastify';

const IncidentReportModal = ({ isOpen, onClose, userId, userLocation, eventId, eventName, zoneName, onSuccess }) => {
  const [description, setDescription] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [severity, setSeverity] = useState('medium'); // low, medium, high, critical

  const fileInputRef = useRef(null);

  // Handle media upload
  const handleMediaUpload = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length + mediaFiles.length > 5) {
      toast.warning('Maximum 5 fichiers autorisés');
      return;
    }

    const newMediaFiles = [];
    const newPreviews = [];

    files.forEach(file => {
      // Check file size (max 50MB per file)
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`Fichier trop volumineux: ${file.name} (max 50MB)`);
        return;
      }

      newMediaFiles.push(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push({
          url: reader.result,
          type: file.type.startsWith('video') ? 'video' : 'image',
          name: file.name
        });

        if (newPreviews.length === files.length) {
          setMediaFiles(prev => [...prev, ...newMediaFiles]);
          setMediaPreviews(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove media
  const removeMedia = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error('Veuillez décrire l\'incident');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('description', description);
      formData.append('severity', severity);
      formData.append('userId', userId);
      
      // Add event data
      if (eventId) {
        formData.append('eventId', eventId);
      }
      
      // Add zone/location data
      if (zoneName) {
        formData.append('location', zoneName);
      }
      
      // Add GPS location data
      if (userLocation) {
        formData.append('latitude', userLocation.latitude);
        formData.append('longitude', userLocation.longitude);
        if (userLocation.address) {
          formData.append('address', userLocation.address);
        }
      }

      // Add media files
      mediaFiles.forEach((file, index) => {
        formData.append(`media`, file);
      });

      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('accessToken') || localStorage.getItem('checkInToken');
      
      const response = await fetch(`${API_URL}/incidents/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      console.log('📥 Response from server:', { status: response.status, data });

      if (response.ok) {
        toast.success('✅ Incident signalé avec succès!');
        if (onSuccess) onSuccess(data.incident);
        resetForm();
        onClose();
      } else {
        console.error('❌ Error from server:', data);
        toast.error(data.message || 'Erreur lors du signalement');
      }
    } catch (error) {
      console.error('❌ Submit error:', error);
      toast.error('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setDescription('');
    setMediaFiles([]);
    setMediaPreviews([]);
    setSeverity('medium');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-red-600 to-orange-600 p-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <FiAlertTriangle className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Signaler un Incident</h2>
              <p className="text-white/70 text-sm">Alerte immédiate à l'admin et aux utilisateurs</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Event and Zone Info */}
          {(eventName || zoneName) && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              {eventName && (
                <div className="flex items-center gap-2 text-white/80">
                  <span className="text-sm font-medium">Événement:</span>
                  <span className="text-sm bg-white/10 px-2 py-1 rounded">{eventName}</span>
                </div>
              )}
              {zoneName && (
                <div className="flex items-center gap-2 text-white/80">
                  <span className="text-sm font-medium">Zone:</span>
                  <span className="text-sm bg-white/10 px-2 py-1 rounded">{zoneName}</span>
                </div>
              )}
            </div>
          )}

          {/* Severity Level */}
          <div className="space-y-3">
            <label className="block text-white/80 text-sm font-medium">
              Niveau de gravité *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'low', label: 'Faible', color: 'bg-blue-500', icon: '📘' },
                { value: 'medium', label: 'Moyen', color: 'bg-yellow-500', icon: '⚠️' },
                { value: 'high', label: 'Élevé', color: 'bg-orange-500', icon: '🚨' },
                { value: 'critical', label: 'Critique', color: 'bg-red-600', icon: '🔴' }
              ].map(level => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setSeverity(level.value)}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    severity === level.value
                      ? `${level.color} border-white text-white shadow-lg scale-105`
                      : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <div className="text-2xl mb-1">{level.icon}</div>
                  <div className="text-xs font-semibold">{level.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <label className="block text-white/80 text-sm font-medium">
              Description de l'incident *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              placeholder="Décrivez l'incident en détail (qui, quoi, où, quand, comment)..."
              required
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">
                Soyez précis pour faciliter l'intervention
              </span>
              <span className={`font-medium ${
                description.length < 20 ? 'text-red-400' : 'text-green-400'
              }`}>
                {description.length} caractères
              </span>
            </div>
          </div>

          {/* Media Upload */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-white/80 text-sm font-medium">
                Photos / Vidéos (optionnel)
              </label>
              <span className="text-white/50 text-xs">
                {mediaFiles.length}/5 fichiers
              </span>
            </div>

            {/* Media Previews */}
            {mediaPreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {mediaPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    {preview.type === 'video' ? (
                      <div className="relative">
                        <video
                          src={preview.url}
                          className="w-full h-32 object-cover rounded-xl border border-white/20"
                          controls
                        />
                        <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded-lg flex items-center gap-1">
                          <FiVideo size={14} className="text-white" />
                          <span className="text-white text-xs">Vidéo</span>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <img
                          src={preview.url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-xl border border-white/20"
                        />
                        <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded-lg flex items-center gap-1">
                          <FiCamera size={14} className="text-white" />
                          <span className="text-white text-xs">Photo</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 rounded-lg flex items-center justify-center text-white transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <FiX size={16} />
                    </button>

                    {/* File Name */}
                    <div className="mt-1 px-2">
                      <p className="text-white/60 text-xs truncate">
                        {preview.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {mediaFiles.length < 5 && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleMediaUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-6 border-2 border-dashed border-white/30 rounded-xl hover:border-red-500 transition-colors bg-white/5 flex flex-col items-center gap-2"
                >
                  <FiUpload className="text-white/50" size={32} />
                  <p className="text-white/70 font-medium">
                    Ajouter photos ou vidéos
                  </p>
                  <p className="text-white/50 text-xs">
                    JPG, PNG, MP4, MOV (max. 50MB par fichier)
                  </p>
                </button>
              </>
            )}
          </div>

          {/* Location Info */}
          {userLocation && (
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">📍</span>
                </div>
                <div className="flex-1">
                  <p className="text-white/90 font-semibold text-sm mb-1">
                    Position de l'incident
                  </p>
                  {userLocation.address ? (
                    <p className="text-blue-200 text-sm">
                      {userLocation.address}
                    </p>
                  ) : (
                    <p className="text-blue-200 text-sm">
                      {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Escalation Info */}
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <FiAlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-red-200">
                <p className="font-semibold mb-1">⚡ Alerte immédiate</p>
                <ul className="text-red-300/80 space-y-1 list-disc list-inside">
                  <li>L'administrateur sera notifié instantanément</li>
                  <li>Les utilisateurs concernés recevront une alerte</li>
                  <li>L'incident sera enregistré avec horodatage</li>
                  <li>Votre position GPS sera sauvegardée</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || !description.trim()}
              className={`flex-1 px-6 py-3 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${
                submitting || !description.trim()
                  ? 'bg-gray-500 text-white/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg shadow-red-500/30'
              }`}
            >
              {submitting ? (
                <>
                  <FiLoader className="animate-spin" size={20} />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <FiAlertTriangle size={20} />
                  Signaler l'incident
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IncidentReportModal;
