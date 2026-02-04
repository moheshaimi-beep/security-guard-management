const { Attendance, Assignment, Event, User, Zone, GeoTracking } = require('../models');
const { Op } = require('sequelize');
const { logActivity } = require('../middlewares/activityLogger');
const geoService = require('../services/geoService');
const notificationService = require('../services/notificationService');

// Get device info (IP address and device info)
exports.getDeviceInfo = async (req, res) => {
  try {
    // Get IP address from request headers
    let ipAddress = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress || 
                   req.connection.socket?.remoteAddress ||
                   'Unknown';
    
    // If x-forwarded-for has multiple IPs, take the first one
    if (ipAddress.includes(',')) {
      ipAddress = ipAddress.split(',')[0].trim();
    }
    
    // Convert IPv6 localhost to more readable format
    if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') {
      ipAddress = '127.0.0.1 (localhost)';
    }
    
    // Clean IPv6 mapped IPv4 addresses
    if (ipAddress.startsWith('::ffff:')) {
      ipAddress = ipAddress.replace('::ffff:', '');
    }

    // Get device info from user agent
    const userAgent = req.headers['user-agent'] || '';
    let deviceName = 'Unknown';
    
    if (userAgent.includes('Windows')) deviceName = 'Windows PC';
    else if (userAgent.includes('Mac')) deviceName = 'Mac';
    else if (userAgent.includes('Android')) deviceName = 'Android Device';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) deviceName = 'iOS Device';
    else if (userAgent.includes('Linux')) deviceName = 'Linux';
    
    console.log('📱 Device Info Request:', { ipAddress, deviceName });

    res.json({
      success: true,
      data: {
        ipAddress,
        deviceName,
        userAgent
      }
    });
  } catch (error) {
    console.error('Device info error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des informations d\'appareil'
    });
  }
};

// Check-in
exports.checkIn = async (req, res) => {
  try {
    const {
      eventId,
      latitude,
      longitude,
      checkInPhoto,
      checkInMethod = 'facial',
      facialMatchScore,
      // Alternative fields from CheckIn page
      accuracy,
      facialVerified,
      facialVerifiedAt,
      deviceFingerprint,
      deviceInfo,
      // NEW: Allow admin/supervisor to check in for an agent
      agentId: requestedAgentId
    } = req.body;

    console.log('✅ CHECK-IN REQUEST RECEIVED:', {
      eventId,
      latitude,
      longitude,
      checkInMethod,
      facialMatchScore,
      facialVerified,
      photoLength: checkInPhoto ? checkInPhoto.length : 0,
      connectedUser: req.user?.id,
      connectedUserRole: req.user?.role,
      requestedAgentId
    });

    // Validate required fields
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID est requis'
      });
    }

    // Validate GPS coordinates - allow 0 values but not null/undefined
    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Position GPS est requise'
      });
    }
    
    // Check for valid numeric values (but don't reassign, just validate)
    const numLat = parseFloat(latitude);
    const numLng = parseFloat(longitude);
    if (isNaN(numLat) || isNaN(numLng)) {
      return res.status(400).json({
        success: false,
        message: 'Coordonnées GPS invalides'
      });
    }

    // Note: checkInPhoto is now optional since CheckIn page doesn't send it
    // Warn if photo is too large
    if (checkInPhoto && checkInPhoto.length > 2000000) {
      console.warn('⚠️ CHECK-IN PHOTO IS VERY LARGE:', checkInPhoto.length, 'bytes');
    }

    // Determine the actual agent ID:
    // - If admin/supervisor is making a check-in for someone else (requestedAgentId provided)
    // - Otherwise use the connected user's ID
    let agentId = req.user.id;
    let checkedInBy = null;

    if (requestedAgentId && (req.user.role === 'admin' || req.user.role === 'supervisor')) {
      // Admin/Supervisor is checking in for another agent
      agentId = requestedAgentId;
      checkedInBy = req.user.id;
      console.log(`👤 ${req.user.role.toUpperCase()} ${req.user.id} is checking in for agent ${agentId}`);
    } else if (requestedAgentId && req.user.role !== 'admin' && req.user.role !== 'supervisor') {
      // Regular agent trying to check in for someone else - not allowed
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission de pointer pour un autre agent'
      });
    }
    const today = new Date().toISOString().split('T')[0];

    // Check if agent is assigned to this event
    console.log('🔍 Checking assignment for:', {
      agentId,
      eventId,
      today,
      userId: req.user.id,
      userRole: req.user.role
    });

    // Find assignment for this agent and event
    const assignment = await Assignment.findOne({
      where: {
        agentId: agentId,
        eventId,
        status: 'confirmed'
      }
    });

    console.log('📋 Assignment found:', assignment ? 'YES' : 'NO', assignment);

    if (!assignment) {
      // Log all assignments for debugging
      const allAssignments = await Assignment.findAll({
        where: { agentId },
        include: [{ model: Event, as: 'event' }]
      });
      console.log(`📋 All assignments for agent ${agentId}:`, allAssignments.length);
      allAssignments.forEach(a => {
        console.log(`  - Event: ${a.event?.name || a.eventId}, Status: ${a.status}`);
      });

      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas affecté à cet événement ou l\'affectation n\'est pas confirmée'
      });
    }

    // Get event details
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    // Check if event is active today
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);
    const todayDate = new Date(today);

    if (todayDate < eventStart || todayDate > eventEnd) {
      return res.status(400).json({
        success: false,
        message: 'L\'événement n\'est pas actif aujourd\'hui'
      });
    }

    // Check for existing attendance
    let attendance = await Attendance.findOne({
      where: { agentId, eventId, date: today }
    });

    if (attendance && attendance.checkInTime) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà pointé pour cet événement aujourd\'hui',
        data: attendance
      });
    }

    // Check geofence
    let isWithinGeofence = null;
    let distanceFromLocation = null;

    if (latitude && longitude && event.latitude && event.longitude) {
      const geoCheck = geoService.checkGeofence(latitude, longitude, event);
      isWithinGeofence = geoCheck.isWithinGeofence;
      distanceFromLocation = geoCheck.distance;

      // Optional: Block check-in if outside geofence
      // if (!isWithinGeofence) {
      //   return res.status(400).json({
      //     success: false,
      //     message: geoCheck.message
      //   });
      // }
    }

    // Determine status (present or late)
    const now = new Date();
    const [checkInHour, checkInMinute] = event.checkInTime.split(':');
    const expectedCheckIn = new Date(today);
    expectedCheckIn.setHours(parseInt(checkInHour), parseInt(checkInMinute), 0, 0);

    const lateThreshold = event.lateThreshold || 15;
    const lateTime = new Date(expectedCheckIn.getTime() + lateThreshold * 60000);

    const status = now > lateTime ? 'late' : 'present';

    // Normalize facialMatchScore to ensure it's between 0-1
    let normalizedScore = facialMatchScore;
    if (facialMatchScore && facialMatchScore > 1) {
      normalizedScore = facialMatchScore / 100;
    }

    // Create or update attendance
    if (attendance) {
      attendance.checkInTime = now;
      attendance.checkInLatitude = latitude;
      attendance.checkInLongitude = longitude;
      attendance.checkInPhoto = checkInPhoto;
      attendance.checkInMethod = checkInMethod;
      attendance.checkInDeviceName = deviceInfo?.deviceName || null;
      attendance.checkInDeviceIP = deviceInfo?.ipAddress || null;
      attendance.checkInDeviceMAC = deviceInfo?.macAddress || null;
      attendance.checkedInBy = checkedInBy; // Track if admin/supervisor performed the check-in
      attendance.facialMatchScore = normalizedScore;
      attendance.facialVerified = facialVerified || (normalizedScore && normalizedScore >= 0.5);
      if (facialVerified || (normalizedScore && normalizedScore >= 0.5)) {
        attendance.facialVerifiedAt = now;
      }
      attendance.status = status;
      attendance.isWithinGeofence = isWithinGeofence;
      attendance.distanceFromLocation = distanceFromLocation;
    } else {
      const isFacialVerified = facialVerified || (normalizedScore && normalizedScore >= 0.5);
      attendance = await Attendance.create({
        agentId,
        eventId,
        date: today,
        checkInTime: now,
        checkInLatitude: latitude,
        checkInLongitude: longitude,
        checkInPhoto,
        checkInMethod,
        checkInDeviceName: deviceInfo?.deviceName || null,
        checkInDeviceIP: deviceInfo?.ipAddress || null,
        checkInDeviceMAC: deviceInfo?.macAddress || null,
        checkedInBy, // Track if admin/supervisor performed the check-in
        facialMatchScore: normalizedScore,
        facialVerified: isFacialVerified,
        facialVerifiedAt: isFacialVerified ? now : null,
        status,
        isWithinGeofence,
        distanceFromLocation
      });
    }

    await attendance.save();

    console.log('✅ CHECK-IN SAVED TO DATABASE:', {
      attendanceId: attendance.id,
      checkInTime: attendance.checkInTime,
      facialMatchScore: attendance.facialMatchScore,
      checkInMethod: attendance.checkInMethod,
      status: attendance.status
    });

    // Enregistrer la position GPS dans GeoTracking pour le suivi en temps réel
    if (latitude && longitude) {
      try {
        await GeoTracking.create({
          userId: agentId,
          eventId: eventId,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          accuracy: deviceInfo?.accuracy ? parseFloat(deviceInfo.accuracy) : null,
          batteryLevel: deviceInfo?.batteryLevel ? parseInt(deviceInfo.batteryLevel) : null,
          isWithinGeofence: isWithinGeofence !== null ? isWithinGeofence : true,
          distanceFromEvent: distanceFromLocation ? parseFloat(distanceFromLocation) : null,
          recordedAt: now,
          createdAt: now
        });
        console.log('📍 Position GPS enregistrée dans GeoTracking pour le suivi en temps réel');
      } catch (geoError) {
        console.error('⚠️ Erreur lors de l\'enregistrement de la position GPS:', geoError.message);
        console.error('Stack:', geoError.stack);
        // Ne pas bloquer le check-in si l'enregistrement GPS échoue
      }
    }

    // If late, notify supervisors
    if (status === 'late') {
      const supervisors = await User.findAll({
        where: { role: { [Op.in]: ['supervisor', 'admin'] }, status: 'active' }
      });
      try {
        await notificationService.notifyLateAlert(req.user, event, supervisors);
      } catch (err) {
        console.error('Late notification error:', err);
      }
    }

    await logActivity({
      userId: agentId,
      action: 'CHECK_IN',
      entityType: 'attendance',
      entityId: attendance.id,
      description: `Pointage d'entrée pour "${event.name}"`,
      newValues: {
        status,
        time: now,
        isWithinGeofence,
        distanceFromLocation
      },
      req
    });

    res.status(201).json({
      success: true,
      message: status === 'late' ? 'Pointage enregistré (Retard)' : 'Pointage enregistré',
      data: {
        attendance,
        event: {
          name: event.name,
          location: event.location,
          checkOutTime: event.checkOutTime
        },
        geoStatus: {
          isWithinGeofence,
          distance: distanceFromLocation,
          message: isWithinGeofence === false
            ? `Hors zone (${distanceFromLocation}m)`
            : 'Dans la zone'
        }
      }
    });
  } catch (error) {
    console.error('❌ CHECK-IN ERROR:', {
      message: error.message,
      code: error.code,
      sql: error.sql,
      stack: error.stack,
      details: error.errors ? error.errors.map(e => e.message) : []
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors du pointage',
      error: error.message,
      details: error.errors ? error.errors.map(e => e.message) : []
    });
  }
};

// Check-out
exports.checkOut = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      checkOutPhoto,
      checkOutMethod = 'facial',
      notes
    } = req.body;

    const agentId = req.user.id;
    const attendanceId = req.params.id;

    const attendance = await Attendance.findOne({
      where: { id: attendanceId, agentId },
      include: [{ model: Event, as: 'event' }]
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Pointage d\'entrée non trouvé'
      });
    }

    if (!attendance.checkInTime) {
      return res.status(400).json({
        success: false,
        message: 'Vous devez d\'abord pointer votre entrée'
      });
    }

    if (attendance.checkOutTime) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà pointé votre sortie'
      });
    }

    const now = new Date();

    // Check for early departure
    const [checkOutHour, checkOutMinute] = attendance.event.checkOutTime.split(':');
    const expectedCheckOut = new Date(attendance.date);
    expectedCheckOut.setHours(parseInt(checkOutHour), parseInt(checkOutMinute), 0, 0);

    if (now < expectedCheckOut) {
      attendance.status = 'early_departure';
    }

    attendance.checkOutTime = now;
    attendance.checkOutLatitude = latitude;
    attendance.checkOutLongitude = longitude;
    attendance.checkOutPhoto = checkOutPhoto;
    attendance.checkOutMethod = checkOutMethod;
    if (notes) attendance.notes = notes;

    // Calculate total hours
    const checkIn = new Date(attendance.checkInTime);
    const hours = (now - checkIn) / (1000 * 60 * 60);
    attendance.totalHours = Math.round(hours * 100) / 100;

    // Check geofence for checkout
    if (latitude && longitude && attendance.event.latitude && attendance.event.longitude) {
      const geoCheck = geoService.checkGeofence(latitude, longitude, attendance.event);
      attendance.checkOutLatitude = latitude;
      attendance.checkOutLongitude = longitude;
    }

    await attendance.save();

    await logActivity({
      userId: agentId,
      action: 'CHECK_OUT',
      entityType: 'attendance',
      entityId: attendance.id,
      description: `Pointage de sortie pour "${attendance.event.name}"`,
      newValues: {
        checkOutTime: now,
        totalHours: attendance.totalHours
      },
      req
    });

    res.json({
      success: true,
      message: 'Pointage de sortie enregistré',
      data: {
        attendance,
        summary: {
          checkIn: attendance.checkInTime,
          checkOut: attendance.checkOutTime,
          totalHours: attendance.totalHours,
          status: attendance.status
        }
      }
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du pointage de sortie'
    });
  }
};

// Get attendance records
exports.getAttendances = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      eventId,
      agentId,
      status,
      startDate,
      endDate,
      sortBy = 'date',
      sortOrder = 'DESC'
    } = req.query;

    const where = {};
    
    // If user is an agent, only show their attendance
    if (req.user.role === 'agent') {
      where.agentId = req.user.id;
    } else if (agentId) {
      // If admin/supervisor and they specified agentId, use it
      where.agentId = agentId;
    }
    
    if (eventId) where.eventId = eventId;
    if (status) where.status = status;
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    }

    const { count, rows } = await Attendance.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'employeeId', 'firstName', 'lastName', 'phone', 'profilePhoto']
        },
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'location', 'checkInTime', 'checkOutTime']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Fetch zone assignments for each attendance
    for (const attendance of rows) {
      if (attendance.agentId && attendance.eventId) {
        const assignment = await Assignment.findOne({
          where: {
            agentId: attendance.agentId,
            eventId: attendance.eventId,
            status: 'confirmed'
          },
          include: [{
            model: Zone,
            as: 'zone',
            attributes: ['id', 'name', 'color', 'description']
          }]
        });
        
        if (assignment) {
          attendance.dataValues.assignment = assignment;
        }
      }
    }

    res.json({
      success: true,
      data: {
        attendances: rows,
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
      message: 'Erreur lors de la récupération des présences'
    });
  }
};

// Get attendance by ID
exports.getAttendanceById = async (req, res) => {
  try {
    const attendance = await Attendance.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'agent',
          attributes: { exclude: ['password', 'refreshToken', 'facialVector'] }
        },
        {
          model: Event,
          as: 'event'
        }
      ]
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Présence non trouvée'
      });
    }

    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la présence'
    });
  }
};

// Get my attendance (for agents)
exports.getMyAttendance = async (req, res) => {
  try {
    const { startDate, endDate, eventId } = req.query;
    const where = { agentId: req.user.id };

    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    }
    if (eventId) where.eventId = eventId;

    const attendances = await Attendance.findAll({
      where,
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'location', 'checkInTime', 'checkOutTime']
        }
      ],
      order: [['date', 'DESC']]
    });

    res.json({
      success: true,
      data: attendances
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de vos présences'
    });
  }
};

// Get today's attendance status for agent
exports.getTodayStatus = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const attendances = await Attendance.findAll({
      where: {
        agentId: req.user.id,
        date: today
      },
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'location', 'checkInTime', 'checkOutTime']
        }
      ]
    });

    // Get today's assignments
    const assignments = await Assignment.findAll({
      where: {
        agentId: req.user.id,
        status: 'confirmed'
      },
      include: [
        {
          model: Event,
          as: 'event',
          where: {
            startDate: { [Op.lte]: today },
            endDate: { [Op.gte]: today },
            status: { [Op.in]: ['scheduled', 'active'] }
          }
        }
      ]
    });

    const todayEvents = assignments.map(a => ({
      eventId: a.event.id,
      eventName: a.event.name,
      location: a.event.location,
      checkInTime: a.event.checkInTime,
      checkOutTime: a.event.checkOutTime,
      attendance: attendances.find(att => att.eventId === a.event.id) || null
    }));

    res.json({
      success: true,
      data: {
        date: today,
        events: todayEvents
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut du jour'
    });
  }
};

// Manual attendance update (admin/supervisor)
exports.updateAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findByPk(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Présence non trouvée'
      });
    }

    const oldValues = attendance.toJSON();
    const { status, notes, checkInTime, checkOutTime } = req.body;

    if (status) attendance.status = status;
    if (notes !== undefined) attendance.notes = notes;
    if (checkInTime) attendance.checkInTime = checkInTime;
    if (checkOutTime) attendance.checkOutTime = checkOutTime;

    attendance.verifiedBy = req.user.id;
    attendance.verifiedAt = new Date();

    await attendance.save();

    await logActivity({
      userId: req.user.id,
      action: 'UPDATE_ATTENDANCE',
      entityType: 'attendance',
      entityId: attendance.id,
      description: 'Présence mise à jour manuellement',
      oldValues,
      newValues: attendance.toJSON(),
      req
    });

    res.json({
      success: true,
      message: 'Présence mise à jour',
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la présence'
    });
  }
};

// Mark absent (for supervisors/admins)
exports.markAbsent = async (req, res) => {
  try {
    const { agentId, eventId, date, notes } = req.body;

    // Check for existing attendance
    let attendance = await Attendance.findOne({
      where: { agentId, eventId, date }
    });

    if (attendance) {
      return res.status(400).json({
        success: false,
        message: 'Un enregistrement existe déjà pour cette date'
      });
    }

    attendance = await Attendance.create({
      agentId,
      eventId,
      date,
      status: 'absent',
      notes,
      verifiedBy: req.user.id,
      verifiedAt: new Date()
    });

    // Notify supervisors about absence
    const agent = await User.findByPk(agentId);
    const event = await Event.findByPk(eventId);
    const supervisors = await User.findAll({
      where: { role: { [Op.in]: ['supervisor', 'admin'] }, status: 'active' }
    });

    try {
      await notificationService.notifyAbsenceAlert(agent, event, supervisors);
    } catch (err) {
      console.error('Absence notification error:', err);
    }

    await logActivity({
      userId: req.user.id,
      action: 'MARK_ABSENT',
      entityType: 'attendance',
      entityId: attendance.id,
      description: `Agent marqué absent`,
      newValues: attendance.toJSON(),
      req
    });

    res.status(201).json({
      success: true,
      message: 'Absence enregistrée',
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement de l\'absence'
    });
  }
};

// Get attendance statistics
exports.getAttendanceStats = async (req, res) => {
  try {
    const { startDate, endDate, eventId, agentId } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    }
    if (eventId) where.eventId = eventId;
    if (agentId) where.agentId = agentId;

    const attendances = await Attendance.findAll({ where });

    const stats = {
      total: attendances.length,
      present: attendances.filter(a => a.status === 'present').length,
      late: attendances.filter(a => a.status === 'late').length,
      absent: attendances.filter(a => a.status === 'absent').length,
      excused: attendances.filter(a => a.status === 'excused').length,
      earlyDeparture: attendances.filter(a => a.status === 'early_departure').length,
      totalHours: attendances.reduce((sum, a) => sum + (parseFloat(a.totalHours) || 0), 0),
      withinGeofence: attendances.filter(a => a.isWithinGeofence === true).length,
      outsideGeofence: attendances.filter(a => a.isWithinGeofence === false).length,
      facialVerified: attendances.filter(a => a.facialVerified === true).length,
      facialNotVerified: attendances.filter(a => a.facialVerified === false || !a.facialVerified).length
    };

    stats.attendanceRate = stats.total > 0
      ? Math.round(((stats.present + stats.late) / stats.total) * 100)
      : 0;

    stats.punctualityRate = (stats.present + stats.late) > 0
      ? Math.round((stats.present / (stats.present + stats.late)) * 100)
      : 0;

    stats.facialVerificationRate = stats.total > 0
      ? Math.round((stats.facialVerified / stats.total) * 100)
      : 0;

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};

// Real-time geolocation update
exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // Find active attendance for today
    const attendance = await Attendance.findOne({
      where: {
        agentId: req.user.id,
        date: today,
        checkInTime: { [Op.not]: null },
        checkOutTime: null
      },
      include: [{ model: Event, as: 'event' }]
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Aucun pointage actif trouvé'
      });
    }

    // Check geofence
    const geoCheck = geoService.checkGeofence(latitude, longitude, attendance.event);

    // Emit location update via Socket.IO if configured
    const io = req.app.get('io');
    if (io) {
      io.to(`event-${attendance.eventId}`).emit('agent-location', {
        agentId: req.user.id,
        agentName: `${req.user.firstName} ${req.user.lastName}`,
        latitude,
        longitude,
        isWithinGeofence: geoCheck.isWithinGeofence,
        distance: geoCheck.distance,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      data: {
        isWithinGeofence: geoCheck.isWithinGeofence,
        distance: geoCheck.distance,
        message: geoCheck.message
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la position'
    });
  }
};
