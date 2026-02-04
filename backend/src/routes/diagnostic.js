const express = require('express');
const router = express.Router();
const { User, Event, Assignment, Attendance } = require('../models');
const { Op } = require('sequelize');

// Diagnostic endpoint - No auth required
router.get('/check-system', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Count records
    const userCount = await User.count();
    const eventCount = await Event.count();
    const assignmentCount = await Assignment.count();
    const attendanceCount = await Attendance.count();
    
    // Get today's events
    const todayEvents = await Event.findAll({
      where: {
        startDate: { [Op.lte]: today },
        endDate: { [Op.gte]: today }
      }
    });
    
    // Get today's assignments
    const todayAssignments = await Assignment.findAll({
      where: {
        status: 'confirmed'
      },
      include: [{
        model: Event,
        as: 'event',
        where: {
          startDate: { [Op.lte]: today },
          endDate: { [Op.gte]: today }
        }
      }]
    });
    
    // Get today's attendance
    const todayAttendance = await Attendance.findAll({
      where: {
        date: today
      }
    });
    
    res.json({
      success: true,
      data: {
        database: {
          users: userCount,
          events: eventCount,
          assignments: assignmentCount,
          attendance: attendanceCount
        },
        today: {
          date: today,
          activeEvents: todayEvents.length,
          confirmedAssignments: todayAssignments.length,
          attendanceRecords: todayAttendance.length,
          events: todayEvents.map(e => ({ id: e.id, name: e.name, status: e.status })),
          assignments: todayAssignments.map(a => ({ agentId: a.agentId, eventId: a.eventId, status: a.status }))
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Diagnostic error',
      error: error.message
    });
  }
});

module.exports = router;
