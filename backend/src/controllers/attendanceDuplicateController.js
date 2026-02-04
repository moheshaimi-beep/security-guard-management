/**
 * Contrôleur pour éviter les doubles pointages entre /checkin et /checkinout
 * Ajoute la logique de détection et de traçabilité des pointages
 */

const { Attendance, User, Event, Assignment } = require('../models');
const { Op } = require('sequelize');
const { logActivity } = require('../middlewares/activityLogger');

// Vérifier s'il existe déjà un pointage pour agent/date
async function checkExistingAttendance(agentId, eventId, date) {
  const existing = await Attendance.findOne({
    where: {
      agentId,
      eventId,
      date: date || new Date().toISOString().split('T')[0]
    },
    include: [
      { model: User, as: 'agent', attributes: ['firstName', 'lastName', 'cin'] },
      { model: Event, as: 'event', attributes: ['name'] },
      { model: User, as: 'checkedInByUser', attributes: ['firstName', 'lastName', 'role'], required: false }
    ]
  });

  return existing;
}

// Déterminer qui fait le pointage
function getCheckInSource(req) {
  // Si c'est un admin qui fait le pointage pour quelqu'un d'autre
  if (req.body.agentId && req.body.agentId !== req.user.id) {
    return {
      source: 'admin',
      checkedInBy: req.user.id,
      checkedInByType: req.user.role
    };
  }

  // Si c'est un superviseur qui fait le pointage
  if (req.user.role === 'supervisor') {
    return {
      source: 'supervisor', 
      checkedInBy: req.user.id,
      checkedInByType: 'supervisor'
    };
  }

  // Si c'est l'agent lui-même
  return {
    source: 'self',
    checkedInBy: req.user.id,
    checkedInByType: req.user.role
  };
}

// Check-in avec détection de doublon amélioré
exports.checkInWithDuplicateDetection = async (req, res) => {
  try {
    const {
      eventId,
      agentId: requestedAgentId,
      latitude,
      longitude,
      checkInPhoto,
      checkInMethod = 'facial',
      facialVerified = false,
      facialMatchScore = 0,
      isWithinGeofence = true,
      distanceFromLocation = 0,
      notes
    } = req.body;

    // Déterminer l'agent concerné
    const targetAgentId = requestedAgentId || req.user.id;
    const checkInSource = getCheckInSource(req);

    // Vérifier si un pointage existe déjà
    const existingAttendance = await checkExistingAttendance(targetAgentId, eventId);
    
    if (existingAttendance) {
      const sourceMessage = getSourceMessage(existingAttendance);
      
      return res.status(409).json({
        success: false,
        message: 'Pointage déjà effectué',
        error: 'DUPLICATE_ATTENDANCE',
        data: {
          existingAttendance: {
            id: existingAttendance.id,
            checkInTime: existingAttendance.checkInTime,
            agent: existingAttendance.agent,
            event: existingAttendance.event,
            source: existingAttendance.checkedInByType || 'unknown',
            checkedInBy: existingAttendance.checkedInByUser,
            message: sourceMessage
          }
        }
      });
    }

    // Vérifier que l'agent est affecté à cet événement
    const assignment = await Assignment.findOne({
      where: {
        agentId: targetAgentId,
        eventId,
        status: 'confirmed'
      }
    });

    if (!assignment) {
      return res.status(403).json({
        success: false,
        message: 'Agent non affecté à cet événement'
      });
    }

    // Récupérer l'événement
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    // Créer le pointage avec information de source
    const attendanceData = {
      agentId: targetAgentId,
      eventId,
      date: new Date().toISOString().split('T')[0],
      checkInTime: new Date(),
      checkInLatitude: latitude,
      checkInLongitude: longitude,
      checkInPhoto,
      checkInMethod,
      facialVerified,
      facialMatchScore,
      isWithinGeofence,
      distanceFromLocation,
      status: isWithinGeofence ? 'present' : 'present', // On peut ajouter d'autres statuts
      notes,
      // Traçabilité
      checkedInBy: checkInSource.checkedInBy,
      checkedInByType: checkInSource.checkedInByType,
      checkInSource: checkInSource.source
    };

    const attendance = await Attendance.create(attendanceData);

    // Logger l'activité
    const targetUser = await User.findByPk(targetAgentId, {
      attributes: ['firstName', 'lastName', 'cin']
    });

    await logActivity({
      userId: req.user.id,
      action: 'CHECK_IN',
      entityType: 'attendance',
      entityId: attendance.id,
      description: `Pointage d'entrée ${checkInSource.source === 'self' ? 'effectué' : 'enregistré par admin'} pour ${targetUser.firstName} ${targetUser.lastName}`,
      metadata: {
        eventName: event.name,
        source: checkInSource.source,
        method: checkInMethod,
        facialVerified,
        isWithinGeofence
      },
      req
    });

    res.status(201).json({
      success: true,
      message: getSuccessMessage(checkInSource.source, targetUser),
      data: {
        attendance,
        event: {
          name: event.name,
          location: event.location
        },
        source: checkInSource.source,
        checkedInBy: checkInSource.checkedInByType
      }
    });

  } catch (error) {
    console.error('❌ CHECK-IN ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du pointage'
    });
  }
};

// Récupérer les pointages avec information de source
exports.getAttendanceWithSource = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      eventId,
      agentId,
      source // 'self', 'admin', 'supervisor'
    } = req.query;

    const where = {};
    
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    }
    if (eventId) where.eventId = eventId;
    if (agentId) where.agentId = agentId;
    if (source) where.checkInSource = source;

    const { count, rows: attendances } = await Attendance.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'firstName', 'lastName', 'cin', 'profilePhoto']
        },
        {
          model: Event, 
          as: 'event',
          attributes: ['id', 'name', 'location', 'startDate', 'endDate']
        },
        {
          model: User,
          as: 'checkedInByUser',
          attributes: ['id', 'firstName', 'lastName', 'role'],
          required: false
        }
      ],
      order: [['checkInTime', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Enrichir avec information de source
    const enrichedAttendances = attendances.map(attendance => ({
      ...attendance.toJSON(),
      sourceInfo: {
        source: attendance.checkInSource || 'unknown',
        checkedInBy: attendance.checkedInByUser,
        message: getSourceMessage(attendance)
      }
    }));

    res.json({
      success: true,
      data: {
        attendances: enrichedAttendances,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        },
        stats: {
          total: count,
          bySelf: attendances.filter(a => a.checkInSource === 'self').length,
          byAdmin: attendances.filter(a => a.checkInSource === 'admin').length,
          bySupervisor: attendances.filter(a => a.checkInSource === 'supervisor').length
        }
      }
    });

  } catch (error) {
    console.error('❌ GET ATTENDANCE ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des pointages'
    });
  }
};

// Vérifier le statut de pointage avant action
exports.checkAttendanceStatus = async (req, res) => {
  try {
    const { agentId, eventId } = req.query;
    const targetAgentId = agentId || req.user.id;

    const existingAttendance = await checkExistingAttendance(targetAgentId, eventId);
    
    if (existingAttendance) {
      return res.json({
        success: true,
        hasAttendance: true,
        data: {
          attendance: existingAttendance,
          sourceInfo: {
            source: existingAttendance.checkInSource || 'unknown',
            checkedInBy: existingAttendance.checkedInByUser,
            message: getSourceMessage(existingAttendance)
          }
        }
      });
    }

    res.json({
      success: true,
      hasAttendance: false,
      data: null
    });

  } catch (error) {
    console.error('❌ CHECK STATUS ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du statut'
    });
  }
};

// Utilitaires pour les messages
function getSourceMessage(attendance) {
  switch (attendance.checkInSource || attendance.checkedInByType) {
    case 'self':
      return `Pointage effectué par l'agent via son téléphone`;
    case 'admin':
      const adminName = attendance.checkedInByUser ? 
        `${attendance.checkedInByUser.firstName} ${attendance.checkedInByUser.lastName}` : 'Administrateur';
      return `Pointage effectué par l'administrateur ${adminName}`;
    case 'supervisor':
      const supervisorName = attendance.checkedInByUser ?
        `${attendance.checkedInByUser.firstName} ${attendance.checkedInByUser.lastName}` : 'Responsable';
      return `Pointage effectué par le responsable ${supervisorName}`;
    default:
      return 'Source de pointage inconnue';
  }
}

function getSuccessMessage(source, targetUser) {
  switch (source) {
    case 'self':
      return 'Pointage enregistré avec succès';
    case 'admin':
      return `Pointage enregistré pour ${targetUser.firstName} ${targetUser.lastName}`;
    case 'supervisor':
      return `Pointage superviseur enregistré pour ${targetUser.firstName} ${targetUser.lastName}`;
    default:
      return 'Pointage enregistré';
  }
}

module.exports = {
  checkInWithDuplicateDetection: exports.checkInWithDuplicateDetection,
  getAttendanceWithSource: exports.getAttendanceWithSource,
  checkAttendanceStatus: exports.checkAttendanceStatus,
  checkExistingAttendance
};