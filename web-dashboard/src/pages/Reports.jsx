import React, { useState, useEffect } from 'react';
import {
  FiFileText, FiDownload, FiCalendar, FiFilter,
  FiUsers, FiClock, FiTrendingUp, FiBarChart2,
  FiPieChart, FiActivity, FiPrinter, FiMail, FiFile
} from 'react-icons/fi';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, LineChart, Line
} from 'recharts';
import { reportsAPI, usersAPI, eventsAPI, attendanceAPI } from '../services/api';
import { toast } from 'react-toastify';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import pdfExport from '../services/pdfExport';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState('attendance');
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedAgent, setSelectedAgent] = useState('');
  const [agents, setAgents] = useState([]);

  // Report data
  const [attendanceData, setAttendanceData] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [agentReport, setAgentReport] = useState(null);

  useEffect(() => {
    fetchAgents();
    fetchReports();
  }, [dateRange, selectedAgent]);

  const fetchAgents = async () => {
    try {
      const response = await usersAPI.getAll({ role: 'agent', limit: 100 });
      setAgents(response.data.data.users || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [dashboardRes, trendsRes] = await Promise.all([
        reportsAPI.getDashboard(),
        reportsAPI.getAttendanceTrends({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          days: 30
        })
      ]);

      setDashboardStats(dashboardRes.data.data);
      setAttendanceData(trendsRes.data.data || []);

      if (selectedAgent) {
        const agentRes = await reportsAPI.getAgentReport(selectedAgent, dateRange);
        setAgentReport(agentRes.data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      toast.info('Génération du PDF en cours...');

      // Récupérer les données de présences pour la période
      const attendanceRes = await attendanceAPI.getAll({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit: 500
      });

      const attendances = attendanceRes.data.data?.attendances || [];

      // Générer le PDF côté client
      const doc = pdfExport.exportAttendanceReport(attendances, {
        title: 'Rapport des Présences',
        dateRange: `${format(new Date(dateRange.startDate), 'dd/MM/yyyy')} - ${format(new Date(dateRange.endDate), 'dd/MM/yyyy')}`
      });

      // Télécharger
      pdfExport.downloadPDF(doc, `rapport-presences-${dateRange.startDate}-${dateRange.endDate}`);
      toast.success('PDF téléchargé avec succès');
    } catch (error) {
      console.error('Erreur PDF:', error);
      // Fallback sur l'API backend si disponible
      try {
        const response = await reportsAPI.downloadPDF(dateRange);
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `rapport-presences-${dateRange.startDate}-${dateRange.endDate}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('PDF téléchargé');
      } catch (backendError) {
        toast.error('Erreur lors de la génération du PDF');
      }
    }
  };

  const handleDownloadAgentsPDF = async () => {
    try {
      toast.info('Génération du PDF agents...');
      const agentsRes = await usersAPI.getAll({ limit: 200 });
      const agentsList = agentsRes.data.data?.users || [];

      const doc = pdfExport.exportAgentsReport(agentsList, {
        title: 'Liste des Agents'
      });

      pdfExport.downloadPDF(doc, `liste-agents-${format(new Date(), 'yyyy-MM-dd')}`);
      toast.success('PDF agents téléchargé');
    } catch (error) {
      toast.error('Erreur lors de la génération');
    }
  };

  const handleOpenPDFPreview = async () => {
    try {
      toast.info('Génération de l\'aperçu...');

      const attendanceRes = await attendanceAPI.getAll({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit: 500
      });

      const attendances = attendanceRes.data.data?.attendances || [];

      const doc = pdfExport.exportAttendanceReport(attendances, {
        title: 'Rapport des Présences',
        dateRange: `${format(new Date(dateRange.startDate), 'dd/MM/yyyy')} - ${format(new Date(dateRange.endDate), 'dd/MM/yyyy')}`
      });

      pdfExport.openPDF(doc);
    } catch (error) {
      toast.error('Erreur lors de la génération de l\'aperçu');
    }
  };

  const handleDownloadExcel = async () => {
    try {
      toast.info('Génération Excel en cours...');
      const response = await reportsAPI.downloadExcel(dateRange);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport-presences-${dateRange.startDate}-${dateRange.endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel téléchargé');
    } catch (error) {
      toast.error('Erreur lors de la génération Excel');
    }
  };

  const reportTypes = [
    { id: 'attendance', label: 'Présences', icon: FiClock },
    { id: 'performance', label: 'Performance', icon: FiTrendingUp },
    { id: 'events', label: 'Événements', icon: FiCalendar },
    { id: 'agents', label: 'Agents', icon: FiUsers }
  ];

  // Prepare chart data
  const attendancePieData = dashboardStats?.todayAttendance ? [
    { name: 'Présent', value: dashboardStats.todayAttendance.present || 0 },
    { name: 'Retard', value: dashboardStats.todayAttendance.late || 0 },
    { name: 'Absent', value: dashboardStats.todayAttendance.absent || 0 }
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FiFileText className="mr-3 text-primary-600" />
            Rapports
          </h1>
          <p className="text-gray-500">Analyses et statistiques détaillées</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleOpenPDFPreview} className="btn-secondary text-sm">
            <FiFile className="mr-1" /> Aperçu
          </button>
          <button onClick={handleDownloadPDF} className="btn-secondary text-sm">
            <FiDownload className="mr-1" /> PDF Présences
          </button>
          <button onClick={handleDownloadAgentsPDF} className="btn-secondary text-sm">
            <FiUsers className="mr-1" /> PDF Agents
          </button>
          <button onClick={handleDownloadExcel} className="btn-primary text-sm">
            <FiDownload className="mr-1" /> Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-400" />
            <span className="text-sm text-gray-600">Période:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="input"
            />
            <span className="text-gray-400">à</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="input"
            />
          </div>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="input w-48"
          >
            <option value="">Tous les agents</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.firstName} {agent.lastName}
              </option>
            ))}
          </select>
          <div className="flex-1" />
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {reportTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setActiveReport(type.id)}
                className={`flex items-center px-3 py-2 rounded-md text-sm ${
                  activeReport === type.id
                    ? 'bg-white shadow text-primary-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <type.icon className="mr-2" size={16} />
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Agents actifs</p>
                  <p className="text-3xl font-bold text-blue-700">
                    {dashboardStats?.overview?.activeAgents || 0}
                  </p>
                </div>
                <FiUsers className="text-blue-500" size={32} />
              </div>
            </div>
            <div className="card bg-gradient-to-br from-green-50 to-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Pointages ce mois</p>
                  <p className="text-3xl font-bold text-green-700">
                    {dashboardStats?.overview?.monthlyAttendances || 0}
                  </p>
                </div>
                <FiClock className="text-green-500" size={32} />
              </div>
            </div>
            <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Événements actifs</p>
                  <p className="text-3xl font-bold text-purple-700">
                    {dashboardStats?.overview?.activeEvents || 0}
                  </p>
                </div>
                <FiCalendar className="text-purple-500" size={32} />
              </div>
            </div>
            <div className="card bg-gradient-to-br from-orange-50 to-orange-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600">Taux de ponctualité</p>
                  <p className="text-3xl font-bold text-orange-700">
                    {dashboardStats?.punctualityRate || 0}%
                  </p>
                </div>
                <FiTrendingUp className="text-orange-500" size={32} />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance Trends */}
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <FiActivity className="mr-2 text-primary-500" />
                Tendance des présences
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => format(new Date(value), 'dd MMMM', { locale: fr })}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="present"
                      stackId="1"
                      stroke="#10B981"
                      fill="#10B981"
                      name="Présent"
                    />
                    <Area
                      type="monotone"
                      dataKey="late"
                      stackId="1"
                      stroke="#F59E0B"
                      fill="#F59E0B"
                      name="Retard"
                    />
                    <Area
                      type="monotone"
                      dataKey="absent"
                      stackId="1"
                      stroke="#EF4444"
                      fill="#EF4444"
                      name="Absent"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Today's Distribution */}
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <FiPieChart className="mr-2 text-primary-500" />
                Répartition des présences (aujourd'hui)
              </h3>
              <div className="h-72 flex items-center justify-center">
                {attendancePieData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attendancePieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {attendancePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500">Aucune donnée pour aujourd'hui</p>
                )}
              </div>
              <div className="flex justify-center space-x-6 mt-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                  <span className="text-sm text-gray-600">Présent</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2" />
                  <span className="text-sm text-gray-600">Retard</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                  <span className="text-sm text-gray-600">Absent</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Stats Table */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <FiBarChart2 className="mr-2 text-primary-500" />
                Statistiques détaillées
              </h3>
              <div className="flex gap-2">
                <button className="btn-secondary text-sm">
                  <FiPrinter className="mr-2" /> Imprimer
                </button>
                <button className="btn-secondary text-sm">
                  <FiMail className="mr-2" /> Envoyer par email
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Métrique</th>
                    <th className="table-header text-center">Ce jour</th>
                    <th className="table-header text-center">Cette semaine</th>
                    <th className="table-header text-center">Ce mois</th>
                    <th className="table-header text-center">Évolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="table-cell font-medium">Pointages totaux</td>
                    <td className="table-cell text-center">{dashboardStats?.overview?.todayAttendances || 0}</td>
                    <td className="table-cell text-center">{dashboardStats?.overview?.weeklyAttendances || 0}</td>
                    <td className="table-cell text-center">{dashboardStats?.overview?.monthlyAttendances || 0}</td>
                    <td className="table-cell text-center">
                      <span className="text-green-600">+12%</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="table-cell font-medium">Présents</td>
                    <td className="table-cell text-center text-green-600">
                      {dashboardStats?.todayAttendance?.present || 0}
                    </td>
                    <td className="table-cell text-center">-</td>
                    <td className="table-cell text-center">-</td>
                    <td className="table-cell text-center">
                      <span className="text-green-600">+5%</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="table-cell font-medium">Retards</td>
                    <td className="table-cell text-center text-yellow-600">
                      {dashboardStats?.todayAttendance?.late || 0}
                    </td>
                    <td className="table-cell text-center">-</td>
                    <td className="table-cell text-center">-</td>
                    <td className="table-cell text-center">
                      <span className="text-red-600">+2%</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="table-cell font-medium">Absences</td>
                    <td className="table-cell text-center text-red-600">
                      {dashboardStats?.todayAttendance?.absent || 0}
                    </td>
                    <td className="table-cell text-center">-</td>
                    <td className="table-cell text-center">-</td>
                    <td className="table-cell text-center">
                      <span className="text-green-600">-3%</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="table-cell font-medium">Incidents signalés</td>
                    <td className="table-cell text-center">{dashboardStats?.overview?.todayIncidents || 0}</td>
                    <td className="table-cell text-center">{dashboardStats?.overview?.weeklyIncidents || 0}</td>
                    <td className="table-cell text-center">{dashboardStats?.overview?.monthlyIncidents || 0}</td>
                    <td className="table-cell text-center">
                      <span className="text-green-600">-8%</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Activité récente</h3>
            <div className="space-y-3">
              {dashboardStats?.recentActivity?.slice(0, 10).map((activity, index) => (
                <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className={`p-2 rounded-full mr-3 ${
                    activity.action.includes('CHECK_IN') ? 'bg-green-100 text-green-600' :
                    activity.action.includes('CHECK_OUT') ? 'bg-blue-100 text-blue-600' :
                    activity.action.includes('INCIDENT') ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {activity.action.includes('CHECK') ? <FiClock size={16} /> :
                     activity.action.includes('INCIDENT') ? <FiActivity size={16} /> :
                     <FiActivity size={16} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{activity.description}</p>
                    <p className="text-xs text-gray-500">{activity.user}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {format(new Date(activity.timestamp), 'HH:mm', { locale: fr })}
                  </span>
                </div>
              ))}
              {(!dashboardStats?.recentActivity || dashboardStats.recentActivity.length === 0) && (
                <p className="text-center text-gray-500 py-4">Aucune activité récente</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
