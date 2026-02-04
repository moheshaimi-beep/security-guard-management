import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiArrowLeft, FiCamera, FiUpload, FiImage, FiCheck, FiAlertCircle,
  FiCheckCircle, FiX, FiEdit2, FiTrash2, FiEye
} from 'react-icons/fi';
import { usersAPI } from '../services/api';
import { toast } from 'react-toastify';
import FaceVerification from '../components/FaceVerification';

/**
 * Admin Page - Gestion du Descripteur Facial
 * Permet à l'admin de créer/modifier/supprimer le profil facial d'un utilisateur
 */
const AdminFacialManager = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [facialDescriptor, setFacialDescriptor] = useState(null);
  const [facialPhoto, setFacialPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [captureMode, setCaptureMode] = useState('camera');
  const [showSteps, setShowSteps] = useState(true);

  // Charger les infos de l'utilisateur
  useEffect(() => {
    const loadUser = async () => {
      try {
        if (userId) {
          const res = await usersAPI.getUser(userId);
          const userData = res.data.data || res.data;
          setUser(userData);
          
          // Charger le descripteur existant
          if (userData.facialDescriptor) {
            setFacialDescriptor(userData.facialDescriptor);
          }
          if (userData.profilePhoto) {
            setFacialPhoto(userData.profilePhoto);
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
        toast.error('Erreur lors du chargement de l\'utilisateur');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [userId]);

  const handleDescriptorCaptured = async (data) => {
    setCapturing(true);
    try {
      if (userId) {
        await usersAPI.updateFacialVector(userId, {
          facialVector: data.descriptor,
          profilePhoto: data.photo
        });
        setFacialDescriptor(data.descriptor);
        setFacialPhoto(data.photo);
        toast.success(`✅ Profil facial sauvegardé pour ${user?.firstName} ${user?.lastName}`);
        setShowSteps(false);
      }
    } catch (error) {
      console.error('Error saving descriptor:', error);
      toast.error('Erreur lors de la sauvegarde du descripteur');
    } finally {
      setCapturing(false);
    }
  };

  const handleDeleteDescriptor = async () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le profil facial de ${user?.firstName} ${user?.lastName}?`)) {
      try {
        await usersAPI.updateUser(userId, { facialDescriptor: null });
        setFacialDescriptor(null);
        setFacialPhoto(null);
        toast.success('✅ Profil facial supprimé');
      } catch (error) {
        console.error('Error deleting descriptor:', error);
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  // Vérifier si l'API répond
  fetch('http://localhost:5000/api/attendance/my-records')
    .then(r => r.json())
    .then(d => console.log('Données:', d))
    .catch(e => console.error('Erreur:', e));

  // Vérifier les tokens disponibles
  console.log('accessToken:', localStorage.getItem('accessToken'));
  console.log('checkInToken:', localStorage.getItem('checkInToken'));

  // Vérifier s'il y a eu des erreurs
  console.log('Dernier 10 logs:', console.log);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <p className="text-white">Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-400 hover:text-blue-300 mb-6 flex items-center gap-2"
        >
          <FiArrowLeft size={20} />
          Retour
        </button>
        <div className="text-white text-center">Utilisateur non trouvé</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-400 hover:text-blue-300 transition"
          >
            <FiArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-white font-bold text-2xl">Gestion Profil Facial</h1>
            <p className="text-blue-300 text-sm">{user?.firstName} {user?.lastName}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLONNE 1: INFOS UTILISATEUR */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <FiEye size={18} />
              Utilisateur
            </h2>
            
            <div className="space-y-3">
              <div>
                <p className="text-slate-400 text-sm">Nom Complet</p>
                <p className="text-white font-semibold">
                  {user?.firstName} {user?.lastName}
                </p>
              </div>
              
              <div>
                <p className="text-slate-400 text-sm">Email</p>
                <p className="text-blue-400 text-sm">{user?.email}</p>
              </div>

              <div>
                <p className="text-slate-400 text-sm">Rôle</p>
                <p className="text-white font-semibold capitalize">{user?.role}</p>
              </div>

              <div className="pt-3 border-t border-slate-700">
                <p className="text-slate-400 text-sm mb-2">Statut Facial</p>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${facialDescriptor ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="text-white font-semibold">
                    {facialDescriptor ? '✅ Profil enregistré' : '⏳ En attente'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* COLONNE 2+3: ZONE DE CAPTURE */}
          <div className="lg:col-span-2">
            {facialDescriptor && facialPhoto ? (
              // État: Profil déjà enregistré
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-xl p-8">
                <div className="text-center mb-6">
                  <FiCheckCircle className="text-green-400 mx-auto mb-2" size={40} />
                  <h2 className="text-green-300 font-bold text-lg">Profil Facial Enregistré</h2>
                </div>

                <div className="mb-6">
                  <img
                    src={facialPhoto}
                    alt="Profil facial"
                    className="w-full max-w-sm mx-auto rounded-lg border border-green-500/50 shadow-lg shadow-green-500/20"
                  />
                </div>

                <div className="bg-black/30 rounded-lg p-4 mb-6 text-center">
                  <p className="text-green-300 font-semibold mb-2">Descripteur Sauvegardé</p>
                  <p className="text-slate-400 text-sm">
                    128 valeurs numériques • {typeof facialDescriptor === 'string' ? facialDescriptor.length : 'N/A'} caractères
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setCaptureMode('camera');
                      setShowSteps(true);
                    }}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <FiCamera size={18} />
                    Mettre à Jour avec Caméra
                  </button>

                  <button
                    onClick={() => {
                      setCaptureMode('upload');
                      setShowSteps(true);
                    }}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <FiUpload size={18} />
                    Mettre à Jour avec Photo
                  </button>

                  <button
                    onClick={handleDeleteDescriptor}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <FiTrash2 size={18} />
                    Supprimer le Profil
                  </button>
                </div>
              </div>
            ) : showSteps ? (
              // État: Capture en cours
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
                {/* Sélecteur Mode */}
                {!capturing && (
                  <div className="mb-6">
                    <p className="text-white mb-3 text-sm font-semibold">Mode de Capture</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setCaptureMode('camera')}
                        className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                          captureMode === 'camera'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        <FiCamera size={18} />
                        Caméra
                      </button>
                      <button
                        onClick={() => setCaptureMode('upload')}
                        className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                          captureMode === 'upload'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        <FiUpload size={18} />
                        Photo
                      </button>
                    </div>
                  </div>
                )}

                {/* Zone de Capture */}
                <div className="bg-black/40 rounded-lg overflow-hidden">
                  <FaceVerification
                    mode="capture"
                    autoStart={true}
                    showReferencePhoto={false}
                    className="w-full"
                    onDescriptorCaptured={handleDescriptorCaptured}
                  />
                </div>

                {/* Étapes */}
                <div className="mt-6 space-y-3">
                  <h3 className="text-white font-semibold mb-3">Étapes:</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-3 text-slate-300">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                      <div>
                        <p className="font-semibold">Positionner le visage</p>
                        <p className="text-slate-400">Face à la caméra, bonne éclairage</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-slate-300">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                      <div>
                        <p className="font-semibold">Attendre la détection</p>
                        <p className="text-slate-400">Le système détecte automatiquement</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-slate-300">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                      <div>
                        <p className="font-semibold">Confirmation</p>
                        <p className="text-slate-400">Cliquez "Capturer" quand prêt</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* FOOTER INFO */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex gap-3">
            <FiAlertCircle className="text-blue-400 flex-shrink-0" size={20} />
            <div className="text-blue-100 text-sm">
              <p className="font-semibold mb-1">💡 Info Admin:</p>
              <ul className="space-y-1 text-blue-100/80 ml-3">
                <li>✓ Le descripteur est automatiquement sauvegardé</li>
                <li>✓ 128 valeurs numériques stockées en JSON</li>
                <li>✓ Utilisable immédiatement après capture</li>
                <li>✓ Vous pouvez le mettre à jour ou le supprimer à tout moment</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminFacialManager;
