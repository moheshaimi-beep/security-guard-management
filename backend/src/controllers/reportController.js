const reportService = require('../services/reportService');
const { ActivityLog, User } = require('../models');
const { Op } = require('sequelize');

// Generate attendance PDF report
exports.generateAttendancePDF = async (req, res) => {
  try {
    const { startDate, endDate, eventId, agentId } = req.query;

    const pdfBuffer = await reportService.generateAttendancePDF({
      startDate,
      endDate,
      eventId,
      agentId
    });

    const filename = `rapport-presence-${startDate || 'all'}-${endDate || 'all'}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du rapport PDF'
    });
  }
};

// Generate attendance Excel report
exports.generateAttendanceExcel = async (req, res) => {
  try {
    const { startDate, endDate, eventId, agentId } = req.query;

    const excelBuffer = await reportService.generateAttendanceExcel({
      startDate,
      endDate,
      eventId,
      agentId
    });

    const filename = `rapport-presence-${startDate || 'all'}-${endDate || 'all'}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);

    res.send(excelBuffer);
  } catch (error) {
    console.error('Excel generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du rapport Excel'
    });
  }
};

// Generate agent performance report
exports.generateAgentReport = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { startDate, endDate, format = 'json' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Les dates de début et de fin sont requises'
      });
    }

    const report = await reportService.generateAgentReport(agentId, startDate, endDate);

    if (format === 'pdf') {
      const pdfBuffer = await reportService.generateAttendancePDF({
        startDate,
        endDate,
        agentId
      });

      const filename = `rapport-agent-${report.agent.employeeId}-${startDate}-${endDate}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(pdfBuffer);
    }

    if (format === 'excel') {
      const excelBuffer = await reportService.generateAttendanceExcel({
        startDate,
        endDate,
        agentId
      });

      const filename = `rapport-agent-${report.agent.employeeId}-${startDate}-${endDate}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(excelBuffer);
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Agent report error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du rapport agent'
    });
  }
};

// Get activity logs
exports.getActivityLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      entityType,
      startDate,
      endDate,
      status
    } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (action) where.action = { [Op.like]: `%${action}%` };
    if (entityType) where.entityType = entityType;
    if (status) where.status = status;
    if (startDate && endDate) {
      where.createdAt = { [Op.between]: [startDate, endDate] };
    }

    const { count, rows } = await ActivityLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        logs: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des logs'
    });
  }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const { Attendance, Event, Assignment, User } = require('../models');
    const today = new Date().toISOString().split('T')[0];

    // Get counts
    const [
      totalAgents,
      activeAgents,
      totalEvents,
      activeEvents,
      todayAttendances,
      pendingAssignments
    ] = await Promise.all([
      User.count({ where: { role: 'agent' } }),
      User.count({ where: { role: 'agent', status: 'active' } }),
      Event.count(),
      Event.count({ where: { status: { [Op.in]: ['scheduled', 'active'] } } }),
      Attendance.count({ where: { date: today } }),
      Assignment.count({ where: { status: 'pending' } })
    ]);

    // Get today's attendance breakdown
    const todayStats = await Attendance.findAll({
      where: { date: today },
      attributes: ['status']
    });

    const attendanceBreakdown = {
      present: todayStats.filter(a => a.status === 'present').length,
      late: todayStats.filter(a => a.status === 'late').length,
      absent: todayStats.filter(a => a.status === 'absent').length
    };

    // Get recent activity
    const recentActivity = await ActivityLog.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalAgents,
          activeAgents,
          totalEvents,
          activeEvents,
          todayAttendances,
          pendingAssignments
        },
        todayAttendance: attendanceBreakdown,
        recentActivity: recentActivity.map(log => ({
          id: log.id,
          action: log.action,
          description: log.description,
          user: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
          timestamp: log.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};

// Get attendance trends
exports.getAttendanceTrends = async (req, res) => {
  try {
    const { Attendance } = require('../models');
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const attendances = await Attendance.findAll({
      where: {
        date: { [Op.gte]: startDate.toISOString().split('T')[0] }
      },
      attributes: ['date', 'status']
    });

    // Group by date
    const trendData = {};
    attendances.forEach(att => {
      const date = att.date;
      if (!trendData[date]) {
        trendData[date] = { date, present: 0, late: 0, absent: 0, total: 0 };
      }
      trendData[date][att.status]++;
      trendData[date].total++;
    });

    const trends = Object.values(trendData).sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tendances'
    });
  }
};
