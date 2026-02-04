const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { authenticate, authorize } = require('../middlewares/auth');
const { assignmentValidation, validate, uuidParam, paginationQuery } = require('../middlewares/validator');

// All routes require authentication
router.use(authenticate);

// Agent routes
router.get('/my-assignments', assignmentController.getMyAssignments);
router.post('/:id/respond', uuidParam(), validate, assignmentController.respondToAssignment);

// Get assignments with filters
router.get('/', paginationQuery, validate, assignmentController.getAssignments);

// Get assignment by ID
router.get('/:id', uuidParam(), validate, assignmentController.getAssignmentById);

// Admin/Supervisor routes
router.post('/', 
  (req, res, next) => {
    console.log('🔵 POST /api/assignments request received:', {
      body: req.body,
      headers: {
        authorization: req.headers.authorization ? 'Bearer ...' : 'none',
        contentType: req.headers['content-type']
      },
      user: req.user ? { id: req.user.id, role: req.user.role } : 'not authenticated yet'
    });
    next();
  },
  authorize('admin', 'supervisor'), 
  assignmentValidation.create, 
  validate, 
  assignmentController.createAssignment);
router.post('/bulk', authorize('admin', 'supervisor'), assignmentController.createBulkAssignments);
router.post('/bulk-confirm', authorize('admin', 'supervisor'), assignmentController.bulkConfirmByEvent);
router.put('/:id', authorize('admin', 'supervisor'), uuidParam(), assignmentValidation.update, validate, assignmentController.updateAssignment);
router.delete('/:id', authorize('admin', 'supervisor'), uuidParam(), validate, assignmentController.deleteAssignment);

module.exports = router;
