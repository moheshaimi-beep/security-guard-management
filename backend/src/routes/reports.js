const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middlewares/auth');
const { uuidParam, validate, paginationQuery } = require('../middlewares/validator');

// All routes require authentication
router.use(authenticate);

// Dashboard (accessible to all authenticated users, with role-based data)
router.get('/dashboard', reportController.getDashboardStats);
router.get('/attendance-trends', reportController.getAttendanceTrends);

// Reports (admin/supervisor only)
router.get('/attendance/pdf', authorize('admin', 'supervisor'), reportController.generateAttendancePDF);
router.get('/attendance/excel', authorize('admin', 'supervisor'), reportController.generateAttendanceExcel);
router.get('/agent/:agentId', authorize('admin', 'supervisor'), uuidParam('agentId'), validate, reportController.generateAgentReport);

// Activity logs (admin only)
router.get('/activity-logs', authorize('admin'), paginationQuery, validate, reportController.getActivityLogs);

module.exports = router;
