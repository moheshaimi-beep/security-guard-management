import React, { useState, useEffect } from 'react';
import {
  FiDatabase, FiTrash2, FiRefreshCw, FiAlertCircle,
  FiCheck, FiX, FiActivity, FiUsers, FiCalendar,
  FiShield, FiHardDrive, FiClock, FiInfo
} from 'react-icons/fi';
import { toast } from 'react-toastify';

const MaintenancePage = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [cleanupPreview, setCleanupPreview] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  // Charger les statistiques de la base
  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/maintenance/database/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
        setLastSync(new Date());
      } else {
        toast.error('Erreur lors du chargement des statistiques');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  // Prévisualiser le nettoyage
  const previewCleanup = async (daysOld = 30) => {
    try {
      const response = await fetch('/api/maintenance/cleanup/deleted-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          daysOld,
          force: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCleanupPreview(data.data);
      } else {
        toast.error('Erreur lors de la prévisualisation');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    }
  };

  // Exécuter le nettoyage
  const executeCleanup = async (daysOld = 30) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer définitivement tous les utilisateurs supprimés depuis plus de ${daysOld} jours ?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/maintenance/cleanup/deleted-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          daysOld,
          force: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setCleanupPreview(null);
        loadStats(); // Recharger les stats
      } else {
        toast.error('Erreur lors du nettoyage');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  // Forcer la synchronisation
  const forceSync = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/maintenance/sync/force', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          action: 'refresh_cache'
        })
      });

      if (response.ok) {
        toast.success('Synchronisation forcée avec succès');
        loadStats();
      } else {
        toast.error('Erreur lors de la synchronisation');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const StatCard = ({ icon: Icon, title, value, subtitle, color = 'blue' }) => (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg bg-${color}-100 text-${color}-600`}>
          <Icon size={24} />
        </div>
        <div className="ml-4">
          <h3 className="text-gray-900 font-semibold">{title}</h3>
          <p className="text-2xl font-bold text-gray-700">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Maintenance & Synchronisation</h1>
        <p className="text-gray-600">Outils de maintenance et synchronisation de la base de données</p>
        {lastSync && (
          <p className="text-sm text-gray-400 mt-2">
            Dernière mise à jour : {lastSync.toLocaleString('fr-FR')}
          </p>
        )}
      </div>

      {/* Actions principales */}
      <div className="mb-8 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions Rapides</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={loadStats}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
          <button
            onClick={forceSync}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            <FiDatabase />
            Forcer la synchronisation
          </button>
          <button
            onClick={() => previewCleanup(30)}
            disabled={loading}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2"
          >
            <FiTrash2 />
            Prévisualiser le nettoyage
          </button>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistiques de la Base</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard
              icon={FiUsers}
              title="Utilisateurs Total"
              value={stats.users.total}
              subtitle={`${stats.users.active} actifs`}
              color="blue"
            />
            <StatCard
              icon={FiTrash2}
              title="Utilisateurs Supprimés"
              value={stats.users.deleted}
              subtitle={`${stats.users.deletedBreakdown.older} anciens`}
              color="red"
            />
            <StatCard
              icon={FiCalendar}
              title="Affectations"
              value={stats.assignments.total}
              subtitle={`${stats.assignments.active} actives`}
              color="green"
            />
            <StatCard
              icon={FiClock}
              title="Pointages"
              value={stats.attendances.total}
              subtitle="Total enregistré"
              color="purple"
            />
          </div>

          {/* Détail des utilisateurs supprimés */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition des Utilisateurs Supprimés</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-700">{stats.users.deletedBreakdown.last24h}</p>
                <p className="text-sm text-gray-500">Dernières 24h</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-700">{stats.users.deletedBreakdown.lastWeek}</p>
                <p className="text-sm text-gray-500">Dernière semaine</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-700">{stats.users.deletedBreakdown.lastMonth}</p>
                <p className="text-sm text-gray-500">Dernier mois</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-2xl font-bold text-yellow-700">{stats.users.deletedBreakdown.older}</p>
                <p className="text-sm text-yellow-600">Plus de 30 jours</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prévisualisation du nettoyage */}
      {cleanupPreview && (
        <div className="mb-8 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FiInfo className="text-yellow-500" />
            Prévisualisation du Nettoyage
          </h2>
          
          {cleanupPreview.total === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FiCheck size={48} className="mx-auto mb-4 text-green-500" />
              <p className="text-lg">Aucun utilisateur à nettoyer trouvé</p>
              <p className="text-sm">Tous les utilisateurs supprimés sont récents</p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">
                  <strong>{cleanupPreview.total} utilisateur(s)</strong> peuvent être nettoyés définitivement
                </p>
              </div>
              
              {cleanupPreview.usersToCleanup && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Utilisateurs concernés :</h3>
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID Employé</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Supprimé le</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {cleanupPreview.usersToCleanup.map((user, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{user.name}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{user.employeeId}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{user.email}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {new Date(user.deletedAt).toLocaleDateString('fr-FR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              <div className="flex gap-4">
                <button
                  onClick={() => executeCleanup(30)}
                  disabled={loading}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <FiTrash2 />
                  Confirmer le nettoyage
                </button>
                <button
                  onClick={() => setCleanupPreview(null)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Annuler
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* État de santé */}
      {stats && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FiActivity className="text-green-500" />
            État de Santé
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">Synchronisation : {stats.health.syncStatus}</span>
            </div>
            <div className="flex items-center gap-2">
              <FiClock className="text-gray-500" />
              <span className="text-gray-500 text-sm">
                Dernière vérification : {new Date(stats.health.lastCheck).toLocaleString('fr-FR')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenancePage;