/**
 * Face Recognition Analytics Dashboard
 * Monitoring, statistics, and anomaly detection
 */

import React, { useState, useEffect } from 'react';
import {
  FiShield, FiUsers, FiAlertTriangle, FiActivity,
  FiCheck, FiX, FiRefreshCw, FiSettings, FiDownload,
  FiUpload, FiTrendingUp, FiClock, FiEye, FiTarget
} from 'react-icons/fi';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { faceRecognitionAPI } from '../services/api';
import { toast } from 'react-toastify';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];

const FaceRecognitionDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [threshold, setThreshold] = useState(0.45);
  const [showSettings, setShowSettings] = useState(false);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, anomaliesRes] = await Promise.all([
        faceRecognitionAPI.getStats(),
        faceRecognitionAPI.getAnomalies({ hours: 24 })
      ]);

      setStats(statsRes.data.data);
      setAnomalies(anomaliesRes.data.data.alerts || []);
      setThreshold(statsRes.data.data.service?.threshold || 0.45);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des donnees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Update threshold
  const handleUpdateThreshold = async () => {
    try {
      await faceRecognitionAPI.adjustThreshold({ threshold });
      toast.success('Seuil mis a jour');
    } catch (error) {
      toast.error('Erreur lors de la mise a jour');
    }
  };

  // Export data
  const handleExport = async () => {
    try {
      const response = await faceRecognitionAPI.exportData();
      const blob = new Blob([JSON.stringify(response.data.data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `face-data-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      toast.success('Donnees exportees');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  // Import data
  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await faceRecognitionAPI.importData({ data });
      toast.success('Donnees importees');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de l\'import');
    }
  };

  // Initialize models
  const handleInitialize = async () => {
    try {
      await faceRecognitionAPI.initialize();
      toast.success('Modeles initialises');
      fetchData();
    } catch (error) {
      toast.error('Erreur d\'initialisation');
    }
  };

  // Prepare chart data
  const getVerificationChartData = () => {
    if (!stats?.service) return [];
    const { successfulVerifications, failedVerifications, spoofAttempts } = stats.service;
    return [
      { name: 'Reussies', value: successfulVerifications, color: '#10B981' },
      { name: 'Echouees', value: failedVerifications, color: '#F59E0B' },
      { name: 'Spoofs', value: spoofAttempts, color: '#EF4444' },
    ];
  };

  const getAnomalyByType = () => {
    const types = {};
    anomalies.forEach(a => {
      types[a.type] = (types[a.type] || 0) + 1;
    });
    return Object.entries(types).map(([type, count]) => ({
      type: type.replace(/_/g, ' '),
      count
    }));
  };

  // Get severity badge
  const getSeverityBadge = (severity) => {
    const styles = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800',
    };
    return styles[severity] || styles.low;
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FiShield className="mr-3 text-primary-600" />
            Reconnaissance Faciale
          </h1>
          <p className="text-gray-500">Monitoring et analyse de securite biometrique</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="btn-secondary"
            disabled={loading}
          >
            <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn-secondary"
          >
            <FiSettings className="mr-2" />
            Parametres
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="card bg-gray-50">
          <h3 className="font-semibold text-gray-800 mb-4">Parametres</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seuil de reconnaissance ({Math.round((1 - threshold) * 100)}% similarite min)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.2"
                  max="0.7"
                  step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 w-12">{threshold}</span>
                <button
                  onClick={handleUpdateThreshold}
                  className="btn-primary text-sm py-1"
                >
                  Appliquer
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Plus bas = plus strict (moins de faux positifs)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Backup / Restore
              </label>
              <div className="flex gap-2">
                <button onClick={handleExport} className="btn-secondary text-sm">
                  <FiDownload className="mr-1" /> Exporter
                </button>
                <label className="btn-secondary text-sm cursor-pointer">
                  <FiUpload className="mr-1" /> Importer
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Initialisation
              </label>
              <button onClick={handleInitialize} className="btn-secondary text-sm">
                <FiTarget className="mr-1" /> Reinitialiser modeles
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">Utilisateurs enregistres</p>
              <p className="text-3xl font-bold text-blue-700">
                {stats?.registeredUsers || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-500 rounded-full">
              <FiUsers className="text-white" size={24} />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Taux de succes</p>
              <p className="text-3xl font-bold text-green-700">
                {stats?.service?.successRate || 0}%
              </p>
            </div>
            <div className="p-3 bg-green-500 rounded-full">
              <FiCheck className="text-white" size={24} />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600">Temps moyen</p>
              <p className="text-3xl font-bold text-purple-700">
                {Math.round(stats?.service?.avgProcessingTime || 0)}ms
              </p>
            </div>
            <div className="p-3 bg-purple-500 rounded-full">
              <FiClock className="text-white" size={24} />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-50 to-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600">Tentatives de spoof</p>
              <p className="text-3xl font-bold text-red-700">
                {stats?.service?.spoofAttempts || 0}
              </p>
            </div>
            <div className="p-3 bg-red-500 rounded-full">
              <FiAlertTriangle className="text-white" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Distribution */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
            <FiActivity className="mr-2 text-primary-500" />
            Distribution des verifications
          </h3>
          <div className="h-72 flex items-center justify-center">
            {stats?.service?.totalVerifications > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getVerificationChartData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getVerificationChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500">Aucune donnee disponible</p>
            )}
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
              <span className="text-sm text-gray-600">
                Reussies ({stats?.service?.successfulVerifications || 0})
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2" />
              <span className="text-sm text-gray-600">
                Echouees ({stats?.service?.failedVerifications || 0})
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
              <span className="text-sm text-gray-600">
                Spoofs ({stats?.service?.spoofAttempts || 0})
              </span>
            </div>
          </div>
        </div>

        {/* Anomalies by Type */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
            <FiAlertTriangle className="mr-2 text-primary-500" />
            Anomalies par type (24h)
          </h3>
          <div className="h-72">
            {getAnomalyByType().length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getAnomalyByType()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#EF4444" name="Nombre" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <FiCheck className="text-4xl text-green-500 mx-auto mb-2" />
                  <p className="text-gray-500">Aucune anomalie detectee</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Status */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Statut du service</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Modeles charges</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                stats?.service?.modelsLoaded ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {stats?.service?.modelsLoaded ? 'Oui' : 'Non'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total verifications</span>
              <span className="font-medium">{stats?.service?.totalVerifications || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Seuil actuel</span>
              <span className="font-medium">{stats?.service?.threshold || 0.45}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cache utilisateurs</span>
              <span className="font-medium">{stats?.service?.registeredUsers || 0}</span>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Metriques de performance</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Taux de succes</span>
                <span className="font-medium">{stats?.service?.successRate || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${stats?.service?.successRate || 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Temps de traitement</span>
                <span className="font-medium">{Math.round(stats?.service?.avgProcessingTime || 0)}ms</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${Math.min(100, (stats?.service?.avgProcessingTime || 0) / 10)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Securite anti-spoof</span>
                <span className="font-medium">
                  {stats?.service?.totalVerifications > 0
                    ? Math.round(100 - (stats.service.spoofAttempts / stats.service.totalVerifications * 100))
                    : 100}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{
                    width: `${stats?.service?.totalVerifications > 0
                      ? 100 - (stats.service.spoofAttempts / stats.service.totalVerifications * 100)
                      : 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Statistiques rapides</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <FiCheck className="text-green-500 mx-auto mb-1" size={24} />
              <p className="text-2xl font-bold text-green-700">
                {stats?.service?.successfulVerifications || 0}
              </p>
              <p className="text-xs text-green-600">Succes</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <FiX className="text-yellow-500 mx-auto mb-1" size={24} />
              <p className="text-2xl font-bold text-yellow-700">
                {stats?.service?.failedVerifications || 0}
              </p>
              <p className="text-xs text-yellow-600">Echecs</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <FiAlertTriangle className="text-red-500 mx-auto mb-1" size={24} />
              <p className="text-2xl font-bold text-red-700">
                {stats?.service?.spoofAttempts || 0}
              </p>
              <p className="text-xs text-red-600">Spoofs</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <FiUsers className="text-blue-500 mx-auto mb-1" size={24} />
              <p className="text-2xl font-bold text-blue-700">
                {stats?.registeredUsers || 0}
              </p>
              <p className="text-xs text-blue-600">Enregistres</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Anomalies */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
          <FiEye className="mr-2 text-primary-500" />
          Anomalies recentes (24h)
        </h3>
        {anomalies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Type</th>
                  <th className="table-header">Utilisateur</th>
                  <th className="table-header">Severite</th>
                  <th className="table-header">Date/Heure</th>
                  <th className="table-header">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {anomalies.slice(0, 10).map((anomaly) => (
                  <tr key={anomaly.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <span className="font-medium">
                        {anomaly.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="table-cell">{anomaly.userId}</td>
                    <td className="table-cell">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityBadge(anomaly.severity)}`}>
                        {anomaly.severity}
                      </span>
                    </td>
                    <td className="table-cell text-gray-500">
                      {new Date(anomaly.timestamp).toLocaleString('fr-FR')}
                    </td>
                    <td className="table-cell text-sm text-gray-500">
                      {JSON.stringify(anomaly.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <FiShield className="text-4xl text-green-500 mx-auto mb-2" />
            <p className="text-gray-500">Aucune anomalie detectee dans les dernieres 24h</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceRecognitionDashboard;
