import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiCamera, FiUser, FiMail, FiPhone, FiArrowLeft, FiCheckCircle,
  FiAlertCircle, FiLoader
} from 'react-icons/fi';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';

/**
 * Page dédiée - Profil Facial Manquant
 * Affiche les détails et les solutions pour créer un profil facial
 */
const MissingProfile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initUser = async () => {
      try {
        const res = await authAPI.getProfile();
        const userData = res.data.data || res.data;
        setUser(userData);
      } catch (error) {
        console.error('Error loading user:', error);
        toast.error('Erreur lors du chargement du profil');
      } finally {
        setLoading(false);
      }
    };
    initUser();
  }, []);

  const handleGoToCheckIn = () => {
    navigate('/checkin');
  };

  const handleGoToProfile = () => {
    navigate('/profile');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <FiLoader className="animate-spin text-blue-400 mx-auto mb-4" size={32} />
          <p className="text-white">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-400 hover:text-blue-300 transition"
          >
            <FiArrowLeft size={20} />
          </button>
          <h1 className="text-white font-bold text-lg">Profil Facial Manquant</h1>
        </div>

        {/* ALERT */}
        <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/50 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">⚠️</div>
            <div>
              <h2 className="text-red-300 font-bold text-lg mb-2">Profil facial non enregistré</h2>
              <p className="text-red-100/90 text-sm mb-3">
                Votre profil de reconnaissance faciale n'a pas été configuré. 
                Cela peut affecter vos pointages et accès à certaines zones.
              </p>
              <div className="bg-black/30 rounded-lg p-3 text-red-100/80 text-xs space-y-2">
                <p><strong>Impact:</strong></p>
                <ul className="ml-3 space-y-1">
                  <li>✓ Vous pouvez toujours pointer manuellement</li>
                  <li>✗ La vérification faciale automatique sera désactivée</li>
                  <li>✗ Moins de sécurité pour les zones protégées</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* USER INFO */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <FiUser size={18} />
            Vos Informations
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-900/30 rounded-lg p-3">
              <span className="text-slate-400 text-sm">Nom:</span>
              <span className="text-white font-semibold">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-900/30 rounded-lg p-3">
              <span className="text-slate-400 text-sm">Email:</span>
              <span className="text-blue-300 text-sm">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between bg-slate-900/30 rounded-lg p-3">
              <span className="text-slate-400 text-sm">Profil Facial:</span>
              <span className="text-red-400 font-semibold">❌ Non configuré</span>
            </div>
          </div>
        </div>

        {/* SOLUTIONS */}
        <div className="space-y-4 mb-6">
          <h3 className="text-white font-semibold text-lg">✅ Solutions</h3>

          {/* OPTION 1: CREATE NOW */}
          <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/50 rounded-xl p-5 hover:border-purple-400/70 transition cursor-pointer"
            onClick={handleGoToCheckIn}>
            <div className="flex items-start gap-4">
              <div className="text-2xl">📸</div>
              <div className="flex-1">
                <h4 className="text-purple-300 font-semibold mb-2">Option 1: Créer maintenant (Rapide)</h4>
                <p className="text-purple-100/80 text-sm mb-3">
                  Allez à la page de pointage et créez votre profil en 30 secondes avec votre caméra.
                </p>
                <button
                  onClick={handleGoToCheckIn}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
                >
                  <FiCamera size={16} />
                  Aller à CheckIn
                </button>
              </div>
            </div>
          </div>

          {/* OPTION 2: ADMIN */}
          <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/50 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="text-2xl">👨‍💼</div>
              <div className="flex-1">
                <h4 className="text-blue-300 font-semibold mb-2">Option 2: Contact Administrateur</h4>
                <p className="text-blue-100/80 text-sm mb-3">
                  Contactez votre administrateur ou responsable pour que votre profil soit configuré 
                  sur la page de gestion des utilisateurs.
                </p>
                <div className="bg-black/30 rounded-lg p-3 text-blue-100/70 text-xs space-y-2">
                  <p><strong>Responsable:</strong> Contactez directement votre manager</p>
                  <p><strong>Admin:</strong> Demandez une configuration via l'interface /users</p>
                </div>
              </div>
            </div>
          </div>

          {/* OPTION 3: PROFILE PAGE */}
          <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/50 rounded-xl p-5 hover:border-green-400/70 transition cursor-pointer"
            onClick={handleGoToProfile}>
            <div className="flex items-start gap-4">
              <div className="text-2xl">⚙️</div>
              <div className="flex-1">
                <h4 className="text-green-300 font-semibold mb-2">Option 3: Page de Profil</h4>
                <p className="text-green-100/80 text-sm mb-3">
                  Accédez à vos paramètres personnels où vous pouvez aussi configurer votre profil facial.
                </p>
                <button
                  onClick={handleGoToProfile}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
                >
                  <FiUser size={16} />
                  Aller au Profil
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* STEPS */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">📋 Étapes pour créer votre profil</h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
              <div>
                <p className="text-white font-semibold text-sm">Aller à CheckIn</p>
                <p className="text-slate-400 text-xs mt-1">Cliquez sur "Créer maintenant" ou allez directement à /checkin</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
              <div>
                <p className="text-white font-semibold text-sm">Activer la caméra</p>
                <p className="text-slate-400 text-xs mt-1">Cliquez sur le bouton "Capturer Mon Profil Facial"</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
              <div>
                <p className="text-white font-semibold text-sm">Positionner votre visage</p>
                <p className="text-slate-400 text-xs mt-1">Bonne éclairage, face de face, distance normale</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">4</div>
              <div>
                <p className="text-white font-semibold text-sm">Confirmer la capture</p>
                <p className="text-slate-400 text-xs mt-1">Cliquez sur "Capturer Mon Profil Facial" une fois prêt</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">✓</div>
              <div>
                <p className="text-white font-semibold text-sm">Succès!</p>
                <p className="text-slate-400 text-xs mt-1">Votre profil facial est maintenant sauvegardé</p>
              </div>
            </div>
          </div>
        </div>

        {/* TIPS */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5">
          <h3 className="text-blue-300 font-semibold mb-3 flex items-center gap-2">
            <FiAlertCircle size={18} />
            💡 Conseils pour une bonne capture
          </h3>
          <ul className="text-blue-100/80 text-sm space-y-2 ml-3">
            <li>✓ Assurez-vous d'avoir une bonne illumination (pas trop sombre, pas trop clair)</li>
            <li>✓ Regardez droit vers la caméra</li>
            <li>✓ Votre visage doit occuper environ 40-70% de l'écran</li>
            <li>✓ Évitez les reflets ou contrejour</li>
            <li>✓ Attendez que le score affiche "100%" ou "✅ Position parfaite"</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MissingProfile;
