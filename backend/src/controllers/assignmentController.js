const { Assignment, Event, User, Zone } = require('../models');
const { Op } = require('sequelize');
const { logActivity } = require('../middlewares/activityLogger');
const notificationService = require('../services/notificationService');
const { assignSupervisorToZone, removeSupervisorFromZone } = require('../utils/supervisorZoneManager');

// Get all assignments with filters
exports.getAssignments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      eventId,
      agentId,
      zoneId,
      status,
      role,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const where = {};
    if (eventId) where.eventId = eventId;
    if (agentId) where.agentId = agentId;
    if (zoneId) where.zoneId = zoneId;
    if (status) where.status = status;
    if (role) where.role = role;

    console.log('🔍 ASSIGNMENT QUERY PARAMS:', { where, page, limit, sortBy, sortOrder });

    const { count, rows } = await Assignment.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'employeeId', 'firstName', 'lastName', 'phone', 'profilePhoto', 'role', 'cin']
        },
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'location', 'startDate', 'endDate', 'checkInTime', 'supervisorId'],
          include: [
            {
              model: User,
              as: 'supervisor',
              attributes: ['id', 'firstName', 'lastName', 'cin', 'phone', 'profilePhoto']
            }
          ]
        },
        {
          model: User,
          as: 'assignedByUser',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Zone,
          as: 'zone',
          attributes: ['id', 'name', 'color', 'priority', 'supervisors']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      subQuery: false
    });

    console.log('✅ ASSIGNMENTS QUERY RESULT:', {
      count,
      rowsLength: rows?.length,
      filters: { eventId, agentId, zoneId, status, role }
    });

    // Enrichir chaque assignment avec le superviseur de sa zone
    const enrichedRows = await Promise.all(rows.map(async (assignment) => {
      const assignmentJSON = assignment.toJSON();
      
      // Si l'assignment a une zone avec des supervisors
      if (assignmentJSON.zone && assignmentJSON.zone.supervisors) {
        try {
          const supervisorIds = typeof assignmentJSON.zone.supervisors === 'string' 
            ? JSON.parse(assignmentJSON.zone.supervisors) 
            : assignmentJSON.zone.supervisors;
          
          // Si c'est un array, prendre le premier superviseur
          const supervisorId = Array.isArray(supervisorIds) ? supervisorIds[0] : supervisorIds;
          
          if (supervisorId) {
            const supervisor = await User.findByPk(supervisorId, {
              attributes: ['id', 'employeeId', 'firstName', 'lastName', 'phone', 'profilePhoto', 'role', 'cin']
            });
            
            if (supervisor) {
              assignmentJSON.supervisor = supervisor;
            }
          }
        } catch (err) {
          console.warn('⚠️ Erreur parsing supervisors pour zone:', assignmentJSON.zone.id, err);
        }
      }
      
      return assignmentJSON;
    }));

    res.json({
      success: true,
      data: {
        assignments: enrichedRows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('❌ Get assignments error:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des affectations',
      error: error.message
    });
  }
};

// Get assignment by ID
exports.getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'agent',
          attributes: { exclude: ['password', 'refreshToken', 'facialVector'] }
        },
        {
          model: Event,
          as: 'event'
        },
        {
          model: User,
          as: 'assignedByUser',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Affectation non trouvée'
      });
    }

    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'affectation'
    });
  }
};

// Create assignment
exports.createAssignment = async (req, res) => {
  try {
    const { agentId, eventId, zoneId, role, notes } = req.body;
    
    console.log('� ========== ASSIGNMENT CREATION START ==========');
    console.log('📨 Assignment creation request received:', {
      body: req.body,
      keys: Object.keys(req.body),
      agentId,
      eventId,
      zoneId,
      role,
      notes,
      agentIdType: typeof agentId,
      eventIdType: typeof eventId,
      zoneIdType: typeof zoneId,
      userId: req.user?.id,
      userRole: req.user?.role
    });

    // Verify authenticated user is available
    if (!req.user || !req.user.id) {
      console.error('❌ Authentication issue: req.user or req.user.id is missing', {
        hasReqUser: !!req.user,
        userId: req.user?.id
      });
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié ou session invalide'
      });
    }

    // Check if user exists and is active
    console.log('🔍 Checking if user exists:', agentId);
    const user = await User.findByPk(agentId);
    if (!user) {
      console.error('❌ User not found:', agentId);
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    console.log('✅ User found:', { id: user.id, name: `${user.firstName} ${user.lastName}`, role: user.role });

    // Validate role compatibility:
    // - If assignment role is 'supervisor', user must be supervisor or admin
    // - If assignment role is 'primary' or 'backup', user must be agent
    const assignmentRole = role || 'primary';
    console.log('🔍 Validating role compatibility. Assignment role:', assignmentRole, 'User role:', user.role);
    if (assignmentRole === 'supervisor') {
      if (!['supervisor', 'admin'].includes(user.role)) {
        console.error('❌ Role mismatch: supervisor role requires supervisor/admin user');
        return res.status(400).json({
          success: false,
          message: 'Seul un superviseur ou admin peut être affecté comme responsable'
        });
      }
    } else {
      if (user.role !== 'agent') {
        console.error('❌ Role mismatch: agent assignment requires agent user');
        return res.status(400).json({
          success: false,
          message: 'Seul un agent peut être affecté avec ce rôle'
        });
      }
    }

    if (user.status !== 'active') {
      console.error('❌ User not active:', user.status);
      return res.status(400).json({
        success: false,
        message: 'L\'utilisateur n\'est pas actif'
      });
    }

    // Check if event exists
    console.log('🔍 Checking if event exists:', eventId);
    const event = await Event.findByPk(eventId);
    if (!event) {
      console.error('❌ Event not found:', eventId);
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }
    console.log('✅ Event found:', { id: event.id, name: event.name });

    // Check if zone exists and belongs to the event (if provided)
    let zone = null;
    if (zoneId) {
      console.log('🔍 Checking if zone exists:', zoneId);
      zone = await Zone.findOne({
        where: { id: zoneId, eventId }
      });
      if (!zone) {
        console.error('❌ Zone not found or does not belong to event:', { zoneId, eventId });
        return res.status(404).json({
          success: false,
          message: 'Zone non trouvée ou n\'appartient pas à cet événement'
        });
      }
      console.log('✅ Zone found:', { id: zone.id, name: zone.name });
    }

    // Check for existing assignment INCLUDING soft-deleted ones
    // This prevents MySQL unique constraint violations on (agentId, eventId, zoneId)
    console.log('🔍 Checking for existing assignment...');
    const whereClause = {
      agentId,
      eventId
    };
    
    // Add zoneId to where clause if provided, otherwise check for null
    if (zoneId) {
      whereClause.zoneId = zoneId;
    } else {
      whereClause.zoneId = null;
    }
    
    const existingAssignment = await Assignment.findOne({
      where: whereClause,
      include: [{
        model: Zone,
        as: 'zone',
        attributes: ['id', 'name']
      }],
      paranoid: false // IMPORTANT: Include soft-deleted records to avoid unique constraint violations
    });

    if (existingAssignment) {
      console.log('⚠️ Existing assignment found:', {
        id: existingAssignment.id,
        status: existingAssignment.status,
        deletedAt: existingAssignment.deletedAt
      });
      // If the assignment was soft-deleted, restore it instead of creating a new one
      if (existingAssignment.deletedAt !== null) {
        console.log('🔄 Restoring soft-deleted assignment...');
        await existingAssignment.restore();
        existingAssignment.status = 'pending';
        existingAssignment.zoneId = zoneId || null;
        existingAssignment.role = assignmentRole;
        existingAssignment.notes = notes;
        existingAssignment.assignedBy = req.user?.id || req.userId;
        existingAssignment.confirmedAt = null;
        existingAssignment.notificationSent = false;
        existingAssignment.notificationSentAt = null;
        await existingAssignment.save();

        // Si c'est un superviseur assigné à une zone, l'ajouter automatiquement aux superviseurs de la zone
        if (user.role === 'supervisor' && zoneId) {
          await assignSupervisorToZone({
            supervisorId: agentId,
            zoneId: zoneId,
            Zone
          });
        }

        const zoneInfo = zone ? ` (Zone: ${zone.name})` : '';
        await logActivity({
          userId: req.user?.id || req.userId,
          action: 'RESTORE_ASSIGNMENT',
          entityType: 'assignment',
          entityId: existingAssignment.id,
          description: `${user.role === 'agent' ? 'Agent' : 'Responsable'} ${user.firstName} ${user.lastName} réaffecté à "${event.name}"${zoneInfo} (restauré)`,
          newValues: existingAssignment.toJSON(),
          req
        });

        // Send notification for the restored assignment
        try {
          await notificationService.notifyAssignment(existingAssignment, event, user);
          existingAssignment.notificationSent = true;
          existingAssignment.notificationSentAt = new Date();
          await existingAssignment.save();
        } catch (notifError) {
          console.error('Failed to send notification for restored assignment:', notifError);
        }

        // Fetch full assignment with relations
        const fullAssignment = await Assignment.findByPk(existingAssignment.id, {
          include: [
            {
              model: User,
              as: 'agent',
              attributes: ['id', 'employeeId', 'firstName', 'lastName', 'phone']
            },
            {
              model: Event,
              as: 'event',
              attributes: ['id', 'name', 'location', 'startDate']
            },
            {
              model: Zone,
              as: 'zone',
              attributes: ['id', 'name', 'color', 'priority']
            }
          ]
        });

        return res.status(200).json({
          success: true,
          message: 'Affectation restaurée avec succès',
          data: fullAssignment
        });
      }

      // If the existing assignment is cancelled or declined, allow re-assignment by updating it
      if (existingAssignment.status === 'cancelled' || existingAssignment.status === 'declined') {
        existingAssignment.status = 'pending';
        existingAssignment.zoneId = zoneId || null;
        existingAssignment.role = assignmentRole;
        existingAssignment.notes = notes;
        existingAssignment.assignedBy = req.user?.id || req.userId;
        existingAssignment.confirmedAt = null;
        await existingAssignment.save();

        // Si c'est un superviseur assigné à une zone, l'ajouter automatiquement aux superviseurs de la zone
        if (user.role === 'supervisor' && zoneId) {
          await assignSupervisorToZone({
            supervisorId: agentId,
            zoneId: zoneId,
            Zone
          });
        }

        const zoneInfo = zone ? ` (Zone: ${zone.name})` : '';
        await logActivity({
          userId: req.user?.id || req.userId,
          action: 'REASSIGN_ASSIGNMENT',
          entityType: 'assignment',
          entityId: existingAssignment.id,
          description: `${user.role === 'agent' ? 'Agent' : 'Responsable'} ${user.firstName} ${user.lastName} réaffecté à "${event.name}"${zoneInfo}`,
          newValues: existingAssignment.toJSON(),
          req
        });

        // Fetch full assignment with relations
        const fullAssignment = await Assignment.findByPk(existingAssignment.id, {
          include: [
            {
              model: User,
              as: 'agent',
              attributes: ['id', 'employeeId', 'firstName', 'lastName', 'phone']
            },
            {
              model: Event,
              as: 'event',
              attributes: ['id', 'name', 'location', 'startDate']
            },
            {
              model: Zone,
              as: 'zone',
              attributes: ['id', 'name', 'color', 'priority']
            }
          ]
        });

        return res.status(200).json({
          success: true,
          message: 'Affectation mise à jour avec succès',
          data: fullAssignment
        });
      }

      // If the assignment is pending or confirmed, reject the request
      console.log('⚠️ Existing assignment found with active status:', {
        assignmentId: existingAssignment.id,
        status: existingAssignment.status,
        agentId: existingAssignment.agentId,
        eventId: existingAssignment.eventId,
        zoneId: existingAssignment.zoneId,
        role: existingAssignment.role
      });
      const zoneInfo = existingAssignment.zone ? ` (Zone: ${existingAssignment.zone.name})` : '';
      const statusText = existingAssignment.status === 'pending' ? 'en attente' : 'confirmée';
      return res.status(400).json({
        success: false,
        message: `Cet utilisateur est déjà affecté à cet événement${zoneInfo} (statut: ${statusText}). Veuillez d'abord modifier ou annuler l'affectation existante.`
      });
    }

    const assignment = await Assignment.create({
      agentId,
      eventId,
      zoneId: zoneId || null,
      assignedBy: req.user?.id || req.userId,
      role: assignmentRole,
      notes,
      status: 'pending'
    });

    // Si c'est un superviseur assigné à une zone, l'ajouter automatiquement aux superviseurs de la zone
    if (user.role === 'supervisor' && zoneId) {
      await assignSupervisorToZone({
        supervisorId: agentId,
        zoneId: zoneId,
        Zone
      });
    }

    // Send notification to user
    try {
      await notificationService.notifyAssignment(assignment, event, user);
      assignment.notificationSent = true;
      assignment.notificationSentAt = new Date();
      await assignment.save();
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    const zoneInfo = zone ? ` (Zone: ${zone.name})` : '';
    await logActivity({
      userId: req.user?.id || req.userId,
      action: 'CREATE_ASSIGNMENT',
      entityType: 'assignment',
      entityId: assignment.id,
      description: `${user.role === 'agent' ? 'Agent' : 'Responsable'} ${user.firstName} ${user.lastName} affecté à "${event.name}"${zoneInfo}`,
      newValues: assignment.toJSON(),
      req
    });

    // Fetch full assignment with relations
    const fullAssignment = await Assignment.findByPk(assignment.id, {
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'employeeId', 'firstName', 'lastName', 'phone']
        },
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'location', 'startDate']
        },
        {
          model: Zone,
          as: 'zone',
          attributes: ['id', 'name', 'color', 'priority']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Affectation créée avec succès',
      data: fullAssignment
    });
  } catch (error) {
    console.error('Create assignment error:', error);
    
    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        details: error.errors?.map(e => ({
          field: e.path,
          message: e.message,
          type: e.type
        }))
      });
    }
    
    // Handle foreign key constraint errors
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Référence invalide: ' + (error.fields ? error.fields.join(', ') : 'Clé étrangère'),
        details: {
          table: error.table,
          fields: error.fields
        }
      });
    }
    
    // Handle unique constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Cet utilisateur est déjà affecté à cet événement',
        details: error.errors?.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'affectation',
      error: error.message,
      details: error.errors ? error.errors.map(e => ({ field: e.path, message: e.message })) : null
    });
  }
};

// Bulk create assignments
exports.createBulkAssignments = async (req, res) => {
  try {
    const { eventId, agentIds, zoneId, role } = req.body;

    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    // Validate zone if provided
    let zone = null;
    if (zoneId) {
      zone = await Zone.findOne({
        where: { id: zoneId, eventId }
      });
      if (!zone) {
        return res.status(404).json({
          success: false,
          message: 'Zone non trouvée ou n\'appartient pas à cet événement'
        });
      }
    }

    const results = { created: [], failed: [] };

    for (const agentId of agentIds) {
      try {
        const agent = await User.findByPk(agentId);
        if (!agent || agent.role !== 'agent' || agent.status !== 'active') {
          results.failed.push({ agentId, reason: 'Agent invalide ou inactif' });
          continue;
        }

        const existingWhere = {
          agentId,
          eventId,
          status: { [Op.notIn]: ['cancelled', 'declined'] }
        };
        if (zoneId) {
          existingWhere.zoneId = zoneId;
        }

        const existing = await Assignment.findOne({
          where: existingWhere
        });

        if (existing) {
          results.failed.push({ agentId, reason: zoneId ? 'Déjà affecté à cette zone' : 'Déjà affecté' });
          continue;
        }

        const assignment = await Assignment.create({
          agentId,
          eventId,
          zoneId: zoneId || null,
          assignedBy: req.user?.id || req.userId,
          role: role || 'primary',
          status: 'pending'
        });

        // Send notification
        try {
          await notificationService.notifyAssignment(assignment, event, agent);
          assignment.notificationSent = true;
          assignment.notificationSentAt = new Date();
          await assignment.save();
        } catch (notifError) {
          console.error('Notification error:', notifError);
        }

        results.created.push({
          id: assignment.id,
          agentId,
          agentName: `${agent.firstName} ${agent.lastName}`
        });
      } catch (err) {
        results.failed.push({ agentId, reason: err.message });
      }
    }

    await logActivity({
      userId: req.user?.id || req.userId,
      action: 'BULK_CREATE_ASSIGNMENTS',
      entityType: 'assignment',
      description: `${results.created.length} affectations créées pour "${event.name}"`,
      newValues: results,
      req
    });

    res.status(201).json({
      success: true,
      message: `${results.created.length} affectation(s) créée(s), ${results.failed.length} échec(s)`,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création des affectations'
    });
  }
};

// Update assignment
exports.updateAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Affectation non trouvée'
      });
    }

    const oldValues = assignment.toJSON();
    const { status, role, notes } = req.body;

    if (status) {
      assignment.status = status;
      if (status === 'confirmed') {
        assignment.confirmedAt = new Date();
      }
    }
    if (role) assignment.role = role;
    if (notes !== undefined) assignment.notes = notes;

    await assignment.save();

    await logActivity({
      userId: req.user?.id || req.userId,
      action: 'UPDATE_ASSIGNMENT',
      entityType: 'assignment',
      entityId: assignment.id,
      description: `Affectation mise à jour`,
      oldValues,
      newValues: assignment.toJSON(),
      req
    });

    res.json({
      success: true,
      message: 'Affectation mise à jour',
      data: assignment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de l\'affectation'
    });
  }
};

// Agent confirms/declines assignment
exports.respondToAssignment = async (req, res) => {
  try {
    const { response } = req.body; // 'confirmed' or 'declined'

    if (!['confirmed', 'declined'].includes(response)) {
      return res.status(400).json({
        success: false,
        message: 'Réponse invalide'
      });
    }

    const assignment = await Assignment.findOne({
      where: {
        id: req.params.id,
        agentId: req.user?.id || req.userId
      },
      include: [{ model: Event, as: 'event' }]
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Affectation non trouvée'
      });
    }

    if (assignment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cette affectation a déjà été traitée'
      });
    }

    assignment.status = response;
    if (response === 'confirmed') {
      assignment.confirmedAt = new Date();
    }
    await assignment.save();

    await logActivity({
      userId: req.user?.id || req.userId,
      action: response === 'confirmed' ? 'CONFIRM_ASSIGNMENT' : 'DECLINE_ASSIGNMENT',
      entityType: 'assignment',
      entityId: assignment.id,
      description: `Affectation ${response === 'confirmed' ? 'confirmée' : 'refusée'}`,
      req
    });

    res.json({
      success: true,
      message: response === 'confirmed' ? 'Affectation confirmée' : 'Affectation refusée',
      data: assignment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réponse à l\'affectation'
    });
  }
};

// Delete assignment
exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id, {
      include: [
        { model: User, as: 'agent' },
        { model: Event, as: 'event' }
      ]
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Affectation non trouvée'
      });
    }

    await assignment.destroy();

    await logActivity({
      userId: req.user?.id || req.userId,
      action: 'DELETE_ASSIGNMENT',
      entityType: 'assignment',
      entityId: assignment.id,
      description: `Affectation de ${assignment.agent.firstName} ${assignment.agent.lastName} supprimée`,
      oldValues: assignment.toJSON(),
      req
    });

    res.json({
      success: true,
      message: 'Affectation supprimée'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'affectation'
    });
  }
};

// Get my assignments (for agents)
exports.getMyAssignments = async (req, res) => {
  try {
    const { status, upcoming, today, checkInReady } = req.query;
    const userId = req.user?.id || req.userId;

    console.log('🔍 getMyAssignments called:', {
      userId,
      status,
      upcoming,
      today,
      checkInReady,
      userObject: req.user ? { id: req.user.id, role: req.user.role } : 'NO USER'
    });

    const where = { agentId: userId };

    if (status) where.status = status;

    const eventWhere = {};
    const now = new Date();

    if (upcoming === 'true') {
      eventWhere.endDate = { [Op.gte]: now };
    }
    if (today === 'true') {
      // Filter events for check-in: today OR starting within 2 hours
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Also include events starting within next 2 hours
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      // Events that are today OR start within next 2 hours
      eventWhere[Op.or] = [
        { startDate: { [Op.between]: [todayStart, todayEnd] } },  // Today
        { startDate: { [Op.between]: [now, twoHoursLater] } }      // Starting soon (within 2h)
      ];
    }

    console.log('📋 Assignment WHERE clause:', where);
    console.log('📅 Event WHERE clause:', eventWhere);

    // Use sequelize: false to avoid subquery issues
    const assignments = await Assignment.findAll({
      where,
      include: [
        {
          model: Event,
          as: 'event',
          where: Object.keys(eventWhere).length > 0 ? eventWhere : undefined,
          required: Object.keys(eventWhere).length > 0 ? true : false  // Inner join only when filtering
        }
      ],
      order: [['createdAt', 'DESC']]
      // REMOVED: subQuery: false (this was causing issues with conditional where on include)
    });

    console.log('✅ Assignments found:', assignments.length);
    if (assignments.length > 0) {
      assignments.forEach((a, i) => {
        console.log(`  Assignment ${i + 1}:`, {
          id: a.id,
          agentId: a.agentId,
          status: a.status,
          eventId: a.eventId,
          eventName: a.event?.name,
          eventStart: a.event?.startDate
        });
      });
    }

    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Get my assignments error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de vos affectations'
    });
  }
};

// Bulk confirm assignments by event
exports.bulkConfirmByEvent = async (req, res) => {
  try {
    const { eventId, role, confirmAgents = true, confirmSupervisors = true } = req.body;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'L\'ID de l\'événement est requis'
      });
    }

    const where = {
      eventId,
      status: 'pending'
    };

    // Filter by role if specified
    if (role) {
      where.role = role;
    } else {
      // Apply role filters based on flags
      const roles = [];
      if (confirmAgents) roles.push('primary', 'backup');
      if (confirmSupervisors) roles.push('supervisor');
      
      if (roles.length > 0) {
        where.role = { [Op.in]: roles };
      }
    }

    console.log('🔄 Bulk confirm assignments:', { where, confirmAgents, confirmSupervisors });

    const assignments = await Assignment.findAll({
      where,
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'firstName', 'lastName', 'employeeId']
        },
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name']
        }
      ]
    });

    if (assignments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aucune affectation en attente trouvée pour cet événement'
      });
    }

    const confirmedAt = new Date();
    const updatedCount = await Assignment.update(
      {
        status: 'confirmed',
        confirmedAt
      },
      { where }
    );

    // Log activity for bulk confirmation
    await logActivity({
      userId: req.user?.id || req.userId,
      action: 'BULK_CONFIRM_ASSIGNMENTS',
      entityType: 'assignment',
      entityId: eventId,
      description: `Confirmation en masse de ${assignments.length} affectation(s) pour l'événement`,
      metadata: {
        eventId,
        count: assignments.length,
        role: role || 'all',
        confirmAgents,
        confirmSupervisors,
        assignmentIds: assignments.map(a => a.id)
      },
      req
    });

    // Send notifications to confirmed agents/supervisors
    const notificationPromises = assignments.map(assignment => {
      return notificationService.sendNotification(
        assignment.agentId,
        'assignment_confirmed',
        {
          title: 'Affectation confirmée',
          message: `Votre affectation pour "${assignment.event?.name}" a été confirmée`,
          eventId: assignment.eventId,
          assignmentId: assignment.id
        }
      ).catch(err => console.error('Error sending notification:', err));
    });

    await Promise.all(notificationPromises);

    res.json({
      success: true,
      message: `${assignments.length} affectation(s) confirmée(s) avec succès`,
      data: {
        confirmedCount: assignments.length,
        assignments: assignments.map(a => ({
          id: a.id,
          agent: a.agent,
          role: a.role,
          event: a.event
        }))
      }
    });
  } catch (error) {
    console.error('Bulk confirm assignments error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la confirmation en masse des affectations',
      error: error.message
    });
  }
};
