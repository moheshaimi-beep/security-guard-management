import React, { useState, useEffect } from 'react';
import {
  FiAward, FiTrendingUp, FiUser, FiStar, FiClock,
  FiShield, FiTarget, FiFilter, FiChevronUp, FiChevronDown
} from 'react-icons/fi';
import { usersAPI } from '../services/api';
import { toast } from 'react-toastify';

const RankBadge = ({ rank }) => {
  if (rank === 1) return <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold shadow-lg">🥇</div>;
  if (rank === 2) return <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold shadow-lg">🥈</div>;
  if (rank === 3) return <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center text-white font-bold shadow-lg">🥉</div>;
  return <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold">{rank}</div>;
};

const ScoreBar = ({ score, color = 'primary' }) => {
  const colors = {
    primary: 'bg-primary-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500'
  };

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`${colors[color]} h-2 rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(score, 100)}%` }}
      />
    </div>
  );
};

const StarRating = ({ rating }) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<FiStar key={i} className="text-yellow-400 fill-current" />);
    } else if (i === fullStars && hasHalfStar) {
      stars.push(<FiStar key={i} className="text-yellow-400" />);
    } else {
      stars.push(<FiStar key={i} className="text-gray-300" />);
    }
  }

  return <div className="flex items-center gap-0.5">{stars}</div>;
};

const Rankings = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('agent');
  const [sortBy, setSortBy] = useState('overallScore');
  const [sortOrder, setSortOrder] = useState('DESC');

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, sortBy, sortOrder]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await usersAPI.getAll({
        role: roleFilter,
        sortBy,
        sortOrder,
        limit: 100
      });

      // Calculate scores for each user
      const usersWithScores = (response.data.data.users || []).map(user => ({
        ...user,
        overallScore: calculateScore(user)
      })).sort((a, b) => sortOrder === 'DESC' ? b.overallScore - a.overallScore : a.overallScore - b.overallScore);

      setUsers(usersWithScores);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = (user) => {
    let score = 0;

    // Ponctualité (30%)
    score += (user.punctualityScore || 75) * 0.30;

    // Fiabilité (25%)
    score += (user.reliabilityScore || 75) * 0.25;

    // Professionnalisme (20%)
    score += (user.professionalismScore || 75) * 0.20;

    // Expérience (10%)
    const expScore = Math.min((user.experienceYears || 0) * 10, 100);
    score += expScore * 0.10;

    // Diplôme (10%)
    const diplomaScores = { 'cap': 40, 'bac': 60, 'bac+2': 75, 'bac+3': 85, 'bac+5': 100, 'autre': 50 };
    score += (diplomaScores[user.diplomaLevel] || 50) * 0.10;

    // Condition physique (5%)
    if (user.height && user.weight) {
      const heightM = user.height / 100;
      const bmi = user.weight / (heightM * heightM);
      let physicalScore = 100;
      if (bmi < 18.5 || bmi > 30) physicalScore = 60;
      else if (bmi < 20 || bmi > 27) physicalScore = 80;
      score += physicalScore * 0.05;
    } else {
      score += 70 * 0.05;
    }

    return Math.round(score);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'DESC' ? 'ASC' : 'DESC');
    } else {
      setSortBy(field);
      setSortOrder('DESC');
    }
  };

  const topThree = users.slice(0, 3);
  const restOfUsers = users.slice(3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FiAward className="mr-3 text-yellow-500" />
            Classement
          </h1>
          <p className="text-gray-500 mt-1">Performance et notation des agents et responsables</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-400" />
            <span className="text-sm text-gray-600">Filtrer:</span>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input w-40"
          >
            <option value="agent">Agents</option>
            <option value="supervisor">Responsables</option>
            <option value="">Tous</option>
          </select>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Trier par:</span>
            <button
              onClick={() => handleSort('overallScore')}
              className={`px-3 py-1 rounded ${sortBy === 'overallScore' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'}`}
            >
              Score global
            </button>
            <button
              onClick={() => handleSort('punctualityScore')}
              className={`px-3 py-1 rounded ${sortBy === 'punctualityScore' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'}`}
            >
              Ponctualité
            </button>
            <button
              onClick={() => handleSort('experienceYears')}
              className={`px-3 py-1 rounded ${sortBy === 'experienceYears' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'}`}
            >
              Expérience
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Podium - Top 3 */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 2nd place */}
              {topThree[1] && (
                <div className="card bg-gradient-to-br from-gray-50 to-gray-100 order-1 md:order-1 transform md:translate-y-4">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🥈</div>
                    <div className="w-20 h-20 rounded-full bg-gray-300 mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-white">
                      {topThree[1].firstName?.[0]}{topThree[1].lastName?.[0]}
                    </div>
                    <h3 className="font-bold text-lg">{topThree[1].firstName} {topThree[1].lastName}</h3>
                    <p className="text-sm text-gray-500 capitalize">{topThree[1].role}</p>
                    <div className="mt-3">
                      <div className="text-3xl font-bold text-gray-700">{topThree[1].overallScore}</div>
                      <p className="text-xs text-gray-500">points</p>
                    </div>
                    <StarRating rating={topThree[1].rating || 4} />
                  </div>
                </div>
              )}

              {/* 1st place */}
              {topThree[0] && (
                <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 order-0 md:order-2 transform md:-translate-y-2">
                  <div className="text-center">
                    <div className="text-5xl mb-2">🏆</div>
                    <div className="w-24 h-24 rounded-full bg-yellow-400 mx-auto mb-3 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                      {topThree[0].firstName?.[0]}{topThree[0].lastName?.[0]}
                    </div>
                    <h3 className="font-bold text-xl">{topThree[0].firstName} {topThree[0].lastName}</h3>
                    <p className="text-sm text-gray-500 capitalize">{topThree[0].role}</p>
                    <div className="mt-3">
                      <div className="text-4xl font-bold text-yellow-600">{topThree[0].overallScore}</div>
                      <p className="text-xs text-gray-500">points</p>
                    </div>
                    <StarRating rating={topThree[0].rating || 5} />
                  </div>
                </div>
              )}

              {/* 3rd place */}
              {topThree[2] && (
                <div className="card bg-gradient-to-br from-orange-50 to-orange-100 order-2 md:order-3 transform md:translate-y-4">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🥉</div>
                    <div className="w-20 h-20 rounded-full bg-orange-400 mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-white">
                      {topThree[2].firstName?.[0]}{topThree[2].lastName?.[0]}
                    </div>
                    <h3 className="font-bold text-lg">{topThree[2].firstName} {topThree[2].lastName}</h3>
                    <p className="text-sm text-gray-500 capitalize">{topThree[2].role}</p>
                    <div className="mt-3">
                      <div className="text-3xl font-bold text-orange-600">{topThree[2].overallScore}</div>
                      <p className="text-xs text-gray-500">points</p>
                    </div>
                    <StarRating rating={topThree[2].rating || 3.5} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full Rankings Table */}
          <div className="card overflow-hidden p-0">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-900">Classement complet</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header w-16">Rang</th>
                    <th className="table-header">Agent</th>
                    <th className="table-header text-center">Score Global</th>
                    <th className="table-header text-center">
                      <div className="flex items-center justify-center">
                        <FiClock className="mr-1" size={14} /> Ponctualité
                      </div>
                    </th>
                    <th className="table-header text-center">
                      <div className="flex items-center justify-center">
                        <FiShield className="mr-1" size={14} /> Fiabilité
                      </div>
                    </th>
                    <th className="table-header text-center">
                      <div className="flex items-center justify-center">
                        <FiTarget className="mr-1" size={14} /> Professionnalisme
                      </div>
                    </th>
                    <th className="table-header text-center">Expérience</th>
                    <th className="table-header text-center">Physique</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-8 text-gray-500">
                        Aucun utilisateur trouvé
                      </td>
                    </tr>
                  ) : (
                    users.map((user, index) => (
                      <tr key={user.id} className={`hover:bg-gray-50 ${index < 3 ? 'bg-yellow-50/30' : ''}`}>
                        <td className="table-cell">
                          <RankBadge rank={index + 1} />
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium mr-3">
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-medium">{user.firstName} {user.lastName}</p>
                              <p className="text-xs text-gray-500">{user.employeeId} • {user.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell text-center">
                          <div className="flex flex-col items-center">
                            <span className={`text-lg font-bold ${
                              user.overallScore >= 80 ? 'text-green-600' :
                              user.overallScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {user.overallScore}
                            </span>
                            <ScoreBar score={user.overallScore} color={getScoreColor(user.overallScore)} />
                          </div>
                        </td>
                        <td className="table-cell text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-medium">{user.punctualityScore || 75}%</span>
                            <ScoreBar score={user.punctualityScore || 75} color="primary" />
                          </div>
                        </td>
                        <td className="table-cell text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-medium">{user.reliabilityScore || 75}%</span>
                            <ScoreBar score={user.reliabilityScore || 75} color="purple" />
                          </div>
                        </td>
                        <td className="table-cell text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-medium">{user.professionalismScore || 75}%</span>
                            <ScoreBar score={user.professionalismScore || 75} color="green" />
                          </div>
                        </td>
                        <td className="table-cell text-center">
                          <span className="badge badge-info">{user.experienceYears || 0} ans</span>
                        </td>
                        <td className="table-cell text-center">
                          {user.height && user.weight ? (
                            <div className="text-xs">
                              <p>{user.height}cm / {user.weight}kg</p>
                              <p className="text-gray-500">IMC: {(user.weight / Math.pow(user.height/100, 2)).toFixed(1)}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Score Legend */}
          <div className="card">
            <h3 className="font-semibold mb-4">Comment le score est calculé</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-bold text-primary-600">30%</div>
                <div className="text-gray-600">Ponctualité</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-bold text-purple-600">25%</div>
                <div className="text-gray-600">Fiabilité</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-bold text-green-600">20%</div>
                <div className="text-gray-600">Professionnalisme</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-bold text-blue-600">10%</div>
                <div className="text-gray-600">Expérience</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-bold text-orange-600">10%</div>
                <div className="text-gray-600">Diplôme</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-bold text-red-600">5%</div>
                <div className="text-gray-600">Condition physique</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Rankings;
