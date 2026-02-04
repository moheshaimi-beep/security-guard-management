import React, { useState, useEffect } from 'react';
import {
  FiAward, FiStar, FiTrendingUp, FiUsers, FiGift,
  FiPlus, FiSearch, FiFilter, FiX, FiCheck
} from 'react-icons/fi';
import { badgesAPI, usersAPI } from '../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import useAuthStore from '../hooks/useAuth';

const categoryConfig = {
  performance: { label: 'Performance', color: 'bg-yellow-100 text-yellow-800', icon: '🏆' },
  attendance: { label: 'Assiduité', color: 'bg-blue-100 text-blue-800', icon: '📅' },
  experience: { label: 'Expérience', color: 'bg-purple-100 text-purple-800', icon: '🎖️' },
  special: { label: 'Spécial', color: 'bg-red-100 text-red-800', icon: '⭐' },
  training: { label: 'Formation', color: 'bg-green-100 text-green-800', icon: '📚' }
};

const AwardBadgeModal = ({ isOpen, onClose, badge, onAward }) => {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen]);

  const fetchAgents = async () => {
    try {
      const response = await usersAPI.getAll({ role: 'agent', status: 'active', limit: 100 });
      setAgents(response.data.data.users || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAgent) {
      toast.error('Sélectionnez un agent');
      return;
    }

    setLoading(true);
    try {
      await badgesAPI.award({
        userId: selectedAgent,
        badgeId: badge.id,
        reason
      });
      toast.success(`Badge "${badge.name}" attribué avec succès!`);
      onAward();
      onClose();
      setSelectedAgent('');
      setReason('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'attribution');
    } finally {
      setLoading(false);
    }
  };

  const filteredAgents = agents.filter(agent => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      agent.firstName?.toLowerCase().includes(s) ||
      agent.lastName?.toLowerCase().includes(s) ||
      agent.employeeId?.toLowerCase().includes(s)
    );
  });

  if (!isOpen || !badge) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b bg-gradient-to-r from-yellow-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-4xl mr-3">{badge.icon}</span>
              <div>
                <h2 className="text-xl font-semibold">{badge.name}</h2>
                <p className="text-sm text-gray-500">{badge.points} points</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Rechercher un agent</label>
            <div className="relative mb-2">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
                placeholder="Rechercher par nom..."
              />
            </div>

            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {filteredAgents.map(agent => (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`flex items-center p-3 cursor-pointer border-b last:border-b-0 hover:bg-gray-50 ${
                    selectedAgent === agent.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border mr-3 flex items-center justify-center ${
                    selectedAgent === agent.id
                      ? 'bg-primary-600 border-primary-600'
                      : 'border-gray-300'
                  }`}>
                    {selectedAgent === agent.id && <FiCheck className="text-white" size={12} />}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-medium mr-3">
                    {agent.firstName?.[0]}{agent.lastName?.[0]}
                  </div>
                  <div>
                    <p className="font-medium">{agent.firstName} {agent.lastName}</p>
                    <p className="text-xs text-gray-500">{agent.employeeId}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Raison de l'attribution</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input"
              rows={3}
              placeholder="Ex: Excellence dans la gestion d'un incident critique..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !selectedAgent}
              className="btn-primary bg-yellow-500 hover:bg-yellow-600"
            >
              {loading ? 'Attribution...' : 'Attribuer le badge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Badges = () => {
  const { user, hasRole } = useAuthStore();
  const [badges, setBadges] = useState([]);
  const [myBadges, setMyBadges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all, my, leaderboard
  const [awardModalOpen, setAwardModalOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [badgesRes, myBadgesRes, leaderboardRes] = await Promise.all([
        badgesAPI.getAll(),
        badgesAPI.getMyBadges(),
        badgesAPI.getLeaderboard()
      ]);

      setBadges(badgesRes.data.data || []);
      setMyBadges(myBadgesRes.data.data || {});
      setLeaderboard(leaderboardRes.data.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const seedBadges = async () => {
    try {
      await badgesAPI.seed();
      toast.success('Badges par défaut créés');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la création des badges');
    }
  };

  const openAwardModal = (badge) => {
    setSelectedBadge(badge);
    setAwardModalOpen(true);
  };

  const filteredBadges = filterCategory
    ? badges.filter(b => b.category === filterCategory)
    : badges;

  const groupedBadges = filteredBadges.reduce((acc, badge) => {
    if (!acc[badge.category]) acc[badge.category] = [];
    acc[badge.category].push(badge);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FiAward className="mr-3 text-yellow-500" />
            Badges & Récompenses
          </h1>
          <p className="text-gray-500">Système de gamification et motivation</p>
        </div>
        {hasRole(['admin']) && (
          <button onClick={seedBadges} className="btn-secondary">
            <FiPlus className="mr-2" /> Initialiser badges
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-yellow-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Mes badges</p>
              <p className="text-3xl font-bold text-yellow-600">{myBadges.count || 0}</p>
            </div>
            <div className="text-4xl">🏆</div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Mes points</p>
              <p className="text-3xl font-bold text-purple-600">{myBadges.totalPoints || 0}</p>
            </div>
            <div className="text-4xl">⭐</div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-blue-50 to-cyan-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Badges disponibles</p>
              <p className="text-3xl font-bold text-blue-600">{badges.length}</p>
            </div>
            <div className="text-4xl">🎯</div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-emerald-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Mon classement</p>
              <p className="text-3xl font-bold text-green-600">
                #{leaderboard.findIndex(l => l.id === user?.id) + 1 || '-'}
              </p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex space-x-4">
          {[
            { id: 'all', label: 'Tous les badges', icon: FiAward },
            { id: 'my', label: 'Mes badges', icon: FiStar },
            { id: 'leaderboard', label: 'Classement', icon: FiTrendingUp }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* All Badges Tab */}
          {activeTab === 'all' && (
            <div className="space-y-6">
              {/* Filter */}
              <div className="flex items-center gap-4">
                <FiFilter className="text-gray-400" />
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterCategory('')}
                    className={`px-4 py-2 rounded-full text-sm ${
                      !filterCategory ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Tous
                  </button>
                  {Object.entries(categoryConfig).map(([key, { label, icon }]) => (
                    <button
                      key={key}
                      onClick={() => setFilterCategory(key)}
                      className={`px-4 py-2 rounded-full text-sm ${
                        filterCategory === key ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Badges Grid */}
              {Object.entries(groupedBadges).map(([category, categoryBadges]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <span className="mr-2">{categoryConfig[category]?.icon}</span>
                    {categoryConfig[category]?.label || category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {categoryBadges.map(badge => {
                      const isEarned = myBadges.badges?.some(b => b.badgeId === badge.id);

                      return (
                        <div
                          key={badge.id}
                          className={`card hover:shadow-lg transition-shadow ${
                            isEarned ? 'ring-2 ring-yellow-400' : ''
                          }`}
                        >
                          <div className="text-center">
                            <div className={`text-5xl mb-3 ${!isEarned ? 'grayscale opacity-50' : ''}`}>
                              {badge.icon}
                            </div>
                            <h4 className="font-semibold text-gray-900">{badge.name}</h4>
                            <p className="text-sm text-gray-500 mt-1">{badge.description}</p>
                            <div className="flex items-center justify-center gap-2 mt-3">
                              <span className={`badge ${categoryConfig[badge.category]?.color}`}>
                                {categoryConfig[badge.category]?.label}
                              </span>
                              <span className="badge bg-yellow-100 text-yellow-800">
                                {badge.points} pts
                              </span>
                            </div>
                            {isEarned && (
                              <div className="mt-3 text-green-600 text-sm flex items-center justify-center">
                                <FiCheck className="mr-1" /> Obtenu
                              </div>
                            )}
                            {hasRole(['admin', 'supervisor']) && !isEarned && (
                              <button
                                onClick={() => openAwardModal(badge)}
                                className="mt-3 btn-secondary text-sm w-full"
                              >
                                <FiGift className="mr-2" /> Attribuer
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* My Badges Tab */}
          {activeTab === 'my' && (
            <div>
              {myBadges.badges?.length === 0 ? (
                <div className="card text-center py-12">
                  <div className="text-6xl mb-4 opacity-30">🏆</div>
                  <p className="text-gray-500">Vous n'avez pas encore de badges</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Continuez votre excellent travail pour en obtenir!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myBadges.badges?.map(userBadge => (
                    <div
                      key={userBadge.id}
                      className="card bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200"
                    >
                      <div className="flex items-start">
                        <div className="text-4xl mr-4">{userBadge.badge?.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{userBadge.badge?.name}</h4>
                          <p className="text-sm text-gray-500">{userBadge.badge?.description}</p>
                          <div className="mt-2 text-xs text-gray-400">
                            Obtenu le {format(new Date(userBadge.awardedAt), 'dd MMMM yyyy', { locale: fr })}
                          </div>
                          {userBadge.reason && (
                            <div className="mt-2 p-2 bg-white rounded text-sm text-gray-600">
                              "{userBadge.reason}"
                            </div>
                          )}
                        </div>
                        <span className="badge bg-yellow-200 text-yellow-800">
                          +{userBadge.badge?.points} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <div className="card overflow-hidden p-0">
              <div className="p-4 bg-gradient-to-r from-yellow-100 to-orange-100 border-b">
                <h3 className="font-semibold text-gray-800">🏆 Classement des points</h3>
              </div>
              <div className="divide-y">
                {leaderboard.map((agent, index) => (
                  <div
                    key={agent.id}
                    className={`flex items-center p-4 ${
                      agent.id === user?.id ? 'bg-primary-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-8 h-8 flex items-center justify-center font-bold text-lg mr-4 ${
                      index === 0 ? 'text-yellow-500' :
                      index === 1 ? 'text-gray-400' :
                      index === 2 ? 'text-orange-500' : 'text-gray-500'
                    }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </div>
                    {agent.profilePhoto ? (
                      <img
                        src={agent.profilePhoto}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover mr-3"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium mr-3">
                        {agent.firstName?.[0]}{agent.lastName?.[0]}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">
                        {agent.firstName} {agent.lastName}
                        {agent.id === user?.id && (
                          <span className="ml-2 text-xs text-primary-600">(Vous)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{agent.employeeId}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-yellow-600">{agent.totalPoints || 0} pts</p>
                      <p className="text-xs text-gray-500">{agent.badgeCount || 0} badges</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <AwardBadgeModal
        isOpen={awardModalOpen}
        onClose={() => setAwardModalOpen(false)}
        badge={selectedBadge}
        onAward={fetchData}
      />
    </div>
  );
};

export default Badges;
