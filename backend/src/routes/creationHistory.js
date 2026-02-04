const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { User, Assignment, Event, Zone, Attendance } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs').promises;
const path = require('path');

/**
 * @route   GET /api/creation-history/agents
 * @desc    Get centralized history of all agent creations with creator details
 * @access  Private (Admin, Supervisor, Responsable)
 */
router.get('/agents', authenticate, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    
    // Build query based on user role
    let whereClause = {
      role: 'agent'
    };
    
    // If supervisor/responsable, only show agents they created
    if (role === 'responsable' || role === 'supervisor') {
      whereClause.createdByUserId = userId;
    }

    // Get agents with creator information and assignments
    const agents = await User.findAll({
      where: whereClause,
      attributes: [
        'id', 
        'employeeId', 
        'firstName', 
        'lastName', 
        'phone', 
        'email',
        'cin',
        'profilePhoto', 
        'status',
        'createdByType',
        'createdByUserId',
        'isTemporary',
        'validatedBy',
        'supervisorId',
        'createdAt', 
        'updatedAt'
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Get creator info and assignments separately to avoid association issues
    const formattedAgentsPromises = agents.map(async (agent) => {
      // Get creator
      let creator = null;
      if (agent.createdByUserId) {
        creator = await User.findByPk(agent.createdByUserId, {
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        });
      }
      
      // Get assignments with events
      const assignments = await Assignment.findAll({
        where: { agentId: agent.id },
        include: [
          {
            model: Event,
            as: 'event',
            attributes: ['id', 'name', 'startDate', 'endDate', 'location']
          },
          {
            model: Zone,
            as: 'zone',
            attributes: ['id', 'name']
          }
        ]
      });
      
      return {
        ...agent.toJSON(),
        creator,
        assignments
      };
    });
    
    const agentsWithDetails = await Promise.all(formattedAgentsPromises);

    // Convertir les photos en base64 pour faciliter l'export Excel
    const agentsWithBase64Photos = await Promise.all(agentsWithDetails.map(async (agent) => {
      let photoBase64 = agent.profilePhoto;
      
      // Si c'est un chemin de fichier, le convertir en base64
      if (agent.profilePhoto && !agent.profilePhoto.startsWith('data:image/')) {
        try {
          const photoPath = path.join(__dirname, '../../', agent.profilePhoto);
          
          // Vérifier que le fichier existe avant d'essayer de le lire
          const fs = require('fs');
          if (fs.existsSync(photoPath)) {
            const imageBuffer = await fs.readFile(photoPath);
            const base64Image = imageBuffer.toString('base64');
            const extension = path.extname(agent.profilePhoto).toLowerCase();
            const mimeType = extension === '.png' ? 'image/png' : 'image/jpeg';
            photoBase64 = `data:${mimeType};base64,${base64Image}`;
          } else {
            // Le fichier n'existe pas, conserver le chemin original
            console.log(`Photo non trouvée pour l'agent ${agent.id}: ${photoPath}`);
            photoBase64 = agent.profilePhoto;
          }
        } catch (error) {
          console.error(`Erreur lors de la conversion de la photo pour l'agent ${agent.id}:`, error.message);
          // Garder le chemin original en cas d'erreur
          photoBase64 = agent.profilePhoto;
        }
      }
      
      return {
        ...agent,
        profilePhoto: photoBase64
      };
    }));

    // Format response
    const formattedAgents = agentsWithBase64Photos.map(agent => ({
      id: agent.id,
      employeeId: agent.employeeId,
      cin: agent.cin,
      fullName: `${agent.firstName} ${agent.lastName}`,
      firstName: agent.firstName,
      lastName: agent.lastName,
      phone: agent.phone,
      email: agent.email,
      profilePhoto: agent.profilePhoto,
      status: agent.status,
      isTemporary: agent.isTemporary,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      creation: {
        type: agent.createdByType,
        createdBy: agent.creator ? {
          id: agent.creator.id,
          name: `${agent.creator.firstName} ${agent.creator.lastName}`,
          email: agent.creator.email,
          role: agent.creator.role
        } : null
      },
      events: agent.assignments.map(a => ({
        id: a.event?.id,
        name: a.event?.name,
        startDate: a.event?.startDate,
        endDate: a.event?.endDate,
        location: a.event?.location,
        zone: a.zone ? { id: a.zone.id, name: a.zone.name } : null
      }))
    }));

    // Statistics
    const stats = {
      total: formattedAgents.length,
      byCreationType: {
        admin: formattedAgents.filter(a => a.creation.type === 'admin').length,
        supervisor: formattedAgents.filter(a => a.creation.type === 'supervisor').length,
        self_registration: formattedAgents.filter(a => a.creation.type === 'self_registration').length
      },
      byStatus: {
        active: formattedAgents.filter(a => a.status === 'active').length,
        inactive: formattedAgents.filter(a => a.status === 'inactive').length,
        suspended: formattedAgents.filter(a => a.status === 'suspended').length
      },
      temporary: formattedAgents.filter(a => a.isTemporary).length,
      validated: formattedAgents.filter(a => a.creation.validatedBy !== null).length
    };

    res.json({
      success: true,
      count: formattedAgents.length,
      stats,
      agents: formattedAgents
    });

  } catch (error) {
    console.error('Error fetching creation history:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique des créations',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/creation-history/agents/:id
 * @desc    Get detailed creation history for a specific agent
 * @access  Private (Admin, Supervisor, Responsable)
 */
router.get('/agents/:id', authenticate, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    const agentId = req.params.id;
    
    // Build query based on user role
    let whereClause = {
      id: agentId,
      role: 'agent'
    };
    
    // If supervisor/responsable, only show agents they created
    if (role === 'responsable' || role === 'supervisor') {
      whereClause.createdByUserId = userId;
    }

    // Get agent with detailed creator information
    const agent = await User.findOne({
      where: whereClause,
      attributes: [
        'id', 
        'employeeId', 
        'firstName', 
        'lastName', 
        'phone', 
        'email',
        'profilePhoto',
        'facialVector',
        'status',
        'createdByType',
        'createdByUserId',
        'isTemporary',
        'validatedBy',
        'supervisorId',
        'address',
        'cin',
        'dateOfBirth',
        'createdAt', 
        'updatedAt'
      ]
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent non trouvé ou accès non autorisé'
      });
    }

    // Get agent's assignments with event and zone details
    const assignments = await Assignment.findAll({
      where: { agentId: agent.id },
      include: [
        { model: Event, as: 'event', attributes: ['id', 'name', 'startDate', 'endDate', 'location'] },
        { model: Zone, as: 'zone', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Get agent's attendance
    const attendanceRecords = await Attendance.findAll({
      where: { agentId: agent.id },
      order: [['date', 'DESC']],
      limit: 10
    });

    // Get creator, validator, and supervisor manually
    let creator = null;
    let validator = null;
    let supervisor = null;

    if (agent.createdByUserId) {
      creator = await User.findByPk(agent.createdByUserId, {
        attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'phone']
      });
    }

    if (agent.validatedBy) {
      validator = await User.findByPk(agent.validatedBy, {
        attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'phone']
      });
    }

    if (agent.supervisorId) {
      supervisor = await User.findByPk(agent.supervisorId, {
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
      });
    }

    res.json({
      success: true,
      agent: {
        id: agent.id,
        employeeId: agent.employeeId,
        fullName: `${agent.firstName} ${agent.lastName}`,
        firstName: agent.firstName,
        lastName: agent.lastName,
        phone: agent.phone,
        email: agent.email,
        cin: agent.cin,
        profilePhoto: agent.profilePhoto,
        hasFacialVector: !!agent.facialVector,
        status: agent.status,
        isTemporary: agent.isTemporary,
        address: agent.address,
        dateOfBirth: agent.dateOfBirth,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        creation: {
          type: agent.createdByType,
          createdBy: creator ? {
            id: creator.id,
            name: `${creator.firstName} ${creator.lastName}`,
            email: creator.email,
            role: creator.role,
            phone: creator.phone
          } : null,
          validatedBy: validator ? {
            id: validator.id,
            name: `${validator.firstName} ${validator.lastName}`,
            email: validator.email,
            role: validator.role,
            phone: validator.phone
          } : null
        },
        supervisor: supervisor ? {
          id: supervisor.id,
          name: `${supervisor.firstName} ${supervisor.lastName}`,
          phone: supervisor.phone,
          email: supervisor.email
        } : null,
        assignments: assignments.map(a => ({
          id: a.id,
          eventId: a.eventId,
          eventName: a.event?.name,
          zoneId: a.zoneId,
          zoneName: a.zone?.name,
          status: a.status,
          assignedAt: a.assignedAt,
          createdAt: a.createdAt
        })),
        recentAttendance: attendanceRecords.map(a => ({
          id: a.id,
          date: a.date,
          checkedIn: a.checkedIn,
          checkedOut: a.checkedOut,
          checkInTime: a.checkInTime,
          checkOutTime: a.checkOutTime,
          status: a.status
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching agent details:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des détails de l\'agent',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/creation-history/stats
 * @desc    Get global statistics about agent creations
 * @access  Private (Admin only)
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux administrateurs'
      });
    }

    // Get all agents with creator info
    const agents = await User.findAll({
      where: { role: 'agent' },
      attributes: ['id', 'createdByType', 'createdByUserId', 'isTemporary', 'validatedBy', 'status', 'createdAt'],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'role'],
          required: false
        }
      ]
    });

    // Calculate statistics
    const stats = {
      total: agents.length,
      byCreationType: {
        admin: agents.filter(a => a.createdByType === 'admin').length,
        supervisor: agents.filter(a => a.createdByType === 'supervisor').length,
        self_registration: agents.filter(a => a.createdByType === 'self_registration').length
      },
      byStatus: {
        active: agents.filter(a => a.status === 'active').length,
        inactive: agents.filter(a => a.status === 'inactive').length,
        suspended: agents.filter(a => a.status === 'suspended').length
      },
      temporary: agents.filter(a => a.isTemporary).length,
      validated: agents.filter(a => a.validatedBy !== null).length,
      byCreator: {}
    };

    // Group by creator
    agents.forEach(agent => {
      if (agent.creator) {
        const creatorKey = `${agent.creator.firstName} ${agent.creator.lastName} (${agent.creator.role})`;
        if (!stats.byCreator[creatorKey]) {
          stats.byCreator[creatorKey] = 0;
        }
        stats.byCreator[creatorKey]++;
      }
    });

    // Get creation timeline (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentCreations = agents.filter(a => new Date(a.createdAt) >= thirtyDaysAgo);
    
    const timeline = {};
    recentCreations.forEach(agent => {
      const date = new Date(agent.createdAt).toISOString().split('T')[0];
      if (!timeline[date]) {
        timeline[date] = 0;
      }
      timeline[date]++;
    });

    res.json({
      success: true,
      stats: {
        ...stats,
        timeline,
        last30Days: recentCreations.length
      }
    });

  } catch (error) {
    console.error('Error fetching creation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

module.exports = router;
