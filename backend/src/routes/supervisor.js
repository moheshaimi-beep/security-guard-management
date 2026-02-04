const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { User, Zone, Event, Assignment } = require('../models');
const { authenticate } = require('../middlewares/auth');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = file.fieldname === 'cinPhoto' 
      ? path.join(__dirname, '../../uploads/cin')
      : path.join(__dirname, '../../uploads/facial');
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seulement les images JPG, JPEG et PNG sont autorisées'));
    }
  }
});

/**
 * @route   GET /api/supervisor/check-cin/:cin
 * @desc    Check if CIN already exists
 * @access  Public (temporaire pour debug)
 */
router.get('/check-cin/:cin', async (req, res) => {
  try {
    const { cin } = req.params;
    
    if (!cin) {
      return res.status(400).json({
        success: false,
        message: 'CIN requis'
      });
    }

    // Vérifier si le CIN existe déjà
    const existingUser = await User.findOne({ 
      where: { cin: cin.toUpperCase() },
      attributes: ['id', 'firstName', 'lastName', 'employeeId', 'role', 'status']
    });

    if (existingUser) {
      return res.json({
        success: true,
        exists: true,
        message: `Ce CIN existe déjà`,
        user: {
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          employeeId: existingUser.employeeId,
          role: existingUser.role
        }
      });
    }

    return res.json({
      success: true,
      exists: false,
      message: 'CIN disponible'
    });

  } catch (error) {
    console.error('Error checking CIN:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du CIN'
    });
  }
});

/**
 * @route   POST /api/supervisor/create-agent
 * @desc    Create a new agent by supervisor (field recruitment)
 * @access  Private (Supervisor only)
 */
router.post('/create-agent', 
  authenticate,
  upload.fields([
    { name: 'cinPhoto', maxCount: 1 },
    { name: 'facialPhoto', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { 
        nom, 
        prenom, 
        telephone,
        cin,
        supervisorId, 
        faceDescriptor, 
        email, 
        selectedZones, 
        eventId, 
        autoAssign 
      } = req.body;
      const supervisorUserId = req.user.id;

      console.log('🚀 AGENT CREATION REQUEST RECEIVED:', {
        nom, prenom, telephone, cin, selectedZones, eventId, autoAssign,
        hasFiles: !!req.files,
        cinPhotoExists: !!(req.files?.cinPhoto),
        facialPhotoExists: !!(req.files?.facialPhoto),
        supervisorUserId
      });

      // Verify the requesting user is a supervisor
      const supervisor = await User.findByPk(supervisorUserId);
      if (!supervisor || supervisor.role !== 'supervisor') {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé. Seuls les responsables peuvent créer des agents.'
        });
      }

      // Vérifier que l'événement existe et que nous sommes dans la période autorisée
      if (eventId && autoAssign === 'true') {
        console.log('🕒 CHECKING EVENT VALIDATION for eventId:', eventId);
        
        try {
          const event = await Event.findByPk(eventId);
          
          if (event) {
            console.log('✅ Event found:', { id: event.id, name: event.name });
            const now = new Date();
            
            // Parser les dates correctement (éviter les problèmes de timezone)
            const startDateStr = event.startDate.toISOString().split('T')[0];
            const endDateStr = (event.endDate || event.startDate).toISOString().split('T')[0];
            
            let startDate, endDate;
            
            if (event.checkInTime) {
              const [hours, minutes, seconds] = event.checkInTime.split(':');
              startDate = new Date(`${startDateStr}T${hours}:${minutes}:${seconds || '00'}`);
            } else {
              startDate = new Date(`${startDateStr}T00:00:00`);
            }
            
            if (event.checkOutTime) {
              const [hours, minutes, seconds] = event.checkOutTime.split(':');
              
              // Si c'est minuit (00:00), c'est le lendemain
              if (hours === '00' && minutes === '00') {
                const nextDay = new Date(endDateStr);
                nextDay.setDate(nextDay.getDate() + 1);
                const nextDayStr = nextDay.toISOString().split('T')[0];
                endDate = new Date(`${nextDayStr}T${hours}:${minutes}:59`);
              } else {
                endDate = new Date(`${endDateStr}T${hours}:${minutes}:59`);
              }
            } else {
              endDate = new Date(`${endDateStr}T23:59:59`);
            }

            // Période autorisée : utiliser agentCreationBuffer de l'événement (30, 60, 90, ou 120 minutes avant)
            const bufferMinutes = event.agentCreationBuffer || 120; // Par défaut 2h si non défini
            const allowedStartTime = new Date(startDate.getTime() - (bufferMinutes * 60 * 1000));
            const allowedEndTime = endDate;

            console.log('⏰ TIME VALIDATION:', {
              now: now.toISOString(),
              allowedStart: allowedStartTime.toISOString(),
              allowedEnd: allowedEndTime.toISOString(),
              bufferMinutes,
              isValid: now >= allowedStartTime && now <= allowedEndTime
            });

            if (now < allowedStartTime || now > allowedEndTime) {
              const bufferLabel = bufferMinutes < 60 ? `${bufferMinutes} min` : `${bufferMinutes / 60}h`;
              console.log('❌ TIME VALIDATION FAILED');
              return res.status(403).json({
                success: false,
                message: `Création d'agent non autorisée en dehors de la période autorisée (${bufferLabel} avant le début jusqu'à la fin de l'événement)`
              });
            }
            
            console.log('✅ TIME VALIDATION PASSED');
          } else {
            console.log('⚠️ Event not found for ID:', eventId);
          }
        } catch (eventError) {
          console.error('❌ EVENT VALIDATION ERROR:', eventError);
          return res.status(500).json({
            success: false,
            message: 'Erreur lors de la validation de l\'événement',
            error: eventError.message
          });
        }
      }

      // Vérifier les zones sélectionnées
      let parsedSelectedZones = [];
      if (selectedZones) {
        try {
          parsedSelectedZones = JSON.parse(selectedZones);
          console.log('📍 ZONES VALIDATION:', { selectedZones, parsedSelectedZones });
        } catch (error) {
          console.error('❌ ZONES PARSING ERROR:', error);
          return res.status(400).json({
            success: false,
            message: 'Erreur lors du parsing des zones sélectionnées',
            error: error.message
          });
        }
      }

      if (parsedSelectedZones.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Veuillez sélectionner au moins une zone'
        });
      }

      // Validate required fields
      console.log('🔍 FIELD VALIDATION:', { nom, prenom, telephone, cin });
      if (!nom || !prenom || !telephone || !cin) {
        console.log('❌ REQUIRED FIELDS MISSING');
        return res.status(400).json({
          success: false,
          message: 'Nom, prénom, téléphone et CIN sont obligatoires'
        });
      }

      // Check if files were uploaded
      console.log('📁 FILE VALIDATION:', {
        hasReqFiles: !!req.files,
        hasCinPhoto: !!(req.files?.cinPhoto),
        hasFacialPhoto: !!(req.files?.facialPhoto)
      });
      
      if (!req.files || !req.files.cinPhoto || !req.files.facialPhoto) {
        console.log('❌ FILES MISSING');
        return res.status(400).json({
          success: false,
          message: 'Photo CIN et photo faciale sont obligatoires'
        });
      }

      // Vérifier si un agent avec ce CIN existe déjà
      const existingAgent = await User.findOne({ where: { cin: cin } });
      
      if (existingAgent) {
        console.log(`⚠️ Agent with CIN ${cin} already exists`);
        return res.status(409).json({
          success: false,
          message: `Le CIN ${cin} existe déjà dans le système. Cet agent est déjà enregistré.`,
          existingAgent: true,
          agentInfo: {
            firstName: existingAgent.firstName,
            lastName: existingAgent.lastName,
            employeeId: existingAgent.employeeId
          }
        });
      }

      // Check if phone number already exists (for new agents only)
      const existingPhone = await User.findOne({ where: { phone: telephone } });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'Ce numéro de téléphone est déjà utilisé'
        });
      }

      // Generate unique employeeId for the agent
      let employeeId;
      let isUnique = false;
      while (!isUnique) {
        employeeId = 'AGT' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
        const existing = await User.findOne({ where: { employeeId } });
        if (!existing) isUnique = true;
      }

      // Generate unique email if not provided
      let agentEmail = email || `${nom.toLowerCase()}.${prenom.toLowerCase()}@agent.securityguard.local`;
      const existingEmail = await User.findOne({ where: { email: agentEmail } });
      if (existingEmail) {
        agentEmail = `${nom.toLowerCase()}.${prenom.toLowerCase()}.${Date.now()}@agent.securityguard.local`;
      }

      // Parse face descriptor
      let parsedDescriptor = null;
      if (faceDescriptor) {
        try {
          parsedDescriptor = JSON.parse(faceDescriptor);
        } catch (error) {
          console.error('Error parsing face descriptor:', error);
        }
      }

      // Generate temporary password (will be sent via SMS in production)
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Get file paths with relative path for serving
      const cinPhotoPath = `/uploads/cin/${req.files.cinPhoto[0].filename}`;
      const facialPhotoPath = `/uploads/facial/${req.files.facialPhoto[0].filename}`;

      console.log('📄 PREPARED USER DATA:', {
        employeeId,
        firstName: prenom,
        lastName: nom,
        cin,
        email: agentEmail,
        phone: telephone,
        role: 'agent',
        supervisorId: supervisorUserId,
        createdByUserId: supervisorUserId,
        createdByType: 'supervisor',
        profilePhoto: facialPhotoPath,
        status: 'active',
        hasFacialVector: !!parsedDescriptor,
        descriptorLength: parsedDescriptor ? parsedDescriptor.length : 0
      });

      // Create the new agent
      console.log('👤 CREATING USER...');
      let newAgent;
      try {
        newAgent = await User.create({
          employeeId,
          firstName: prenom,  // Map prenom to firstName
          lastName: nom,      // Map nom to lastName
          cin: cin,           // Add CIN field
          email: agentEmail,
          password: hashedPassword,
          phone: telephone,
          role: 'agent',
          supervisorId: supervisorUserId,  // UUID du responsable créateur
          createdByUserId: supervisorUserId,  // ID du responsable créateur
          createdByType: 'supervisor',         // Type de créateur
          profilePhoto: facialPhotoPath, // Store facial photo as profile photo
          facialVector: parsedDescriptor ? JSON.stringify(parsedDescriptor) : null,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('✅ USER CREATED SUCCESSFULLY:', newAgent.id);
      } catch (userCreationError) {
        console.error('❌ USER CREATION ERROR:', userCreationError);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la création de l\'utilisateur',
          error: userCreationError.message,
          details: userCreationError.errors || []
        });
      }

      // Log the creation
      console.log(`✅ Agent created by supervisor ${supervisor.prenom} ${supervisor.nom}:`, {
        agentId: newAgent.id,
        agentName: `${newAgent.firstName} ${newAgent.lastName}`,
        supervisorId: supervisor.id,
        supervisorName: `${supervisor.prenom} ${supervisor.nom}`
      });

      // Créer les assignations aux zones si spécifié
      console.log('🗺️ CREATING ASSIGNMENTS...');
      const assignedZonesData = [];
      
      if (parsedSelectedZones.length > 0) {
        console.log(`📍 Creating ${parsedSelectedZones.length} assignments for zones:`, parsedSelectedZones);
        
        for (const zoneId of parsedSelectedZones) {
          try {
            console.log(`🔗 Creating assignment for zone: ${zoneId}`);
            const assignment = await Assignment.create({
              agentId: newAgent.id,
              eventId: eventId || null,
              zoneId: zoneId,
              role: 'primary',
              status: autoAssign === 'true' ? 'confirmed' : 'pending',
              assignedBy: supervisorUserId,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            console.log(`✅ Assignment created: ${assignment.id}`);
            
            // Récupérer les détails de la zone
            const zone = await Zone.findByPk(zoneId);
            if (zone) {
              assignedZonesData.push({
                id: zone.id,
                name: zone.name,
                description: zone.description,
                color: zone.color
              });
            }
            
            console.log(`✅ Agent ${newAgent.firstName} ${newAgent.lastName} assigned to zone ${zoneId}`);
          } catch (assignmentError) {
            console.error(`❌ Error assigning agent to zone ${zoneId}:`, assignmentError);
          }
        }
      } else {
        console.log('⚠️ No zones selected for assignment');
      }

      // Récupérer les détails de l'événement si fourni
      let eventData = null;
      if (eventId) {
        const event = await Event.findByPk(eventId);
        if (event) {
          eventData = {
            id: event.id,
            name: event.name,
            location: event.location,
            startDate: event.startDate,
            endDate: event.endDate
          };
        }
      }

      // In production, send SMS with credentials
      // await sendSMS(telephone, `Bienvenue! Votre mot de passe temporaire: ${tempPassword}`);

      // Create notification for supervisor's action history
      const { Notification } = require('../models');
      try {
        await Notification.create({
          userId: supervisorUserId,
          type: 'system', // Utiliser 'system' au lieu de 'success'
          title: '👤 Agent créé',
          message: `Vous avez créé l'agent ${newAgent.firstName} ${newAgent.lastName} et l'avez assigné à ${parsedSelectedZones.length} zone(s).`,
          channel: 'in_app',
          status: 'sent',
          metadata: JSON.stringify({
            actionType: 'agent_creation',
            agentId: newAgent.id,
            agentName: `${newAgent.firstName} ${newAgent.lastName}`,
            zonesCount: parsedSelectedZones.length,
            eventId: eventId
          })
        });
        console.log('✅ Notification created for supervisor action history');
      } catch (notifError) {
        console.error('⚠️ Error creating notification:', notifError);
      }

      res.status(201).json({
        success: true,
        message: parsedSelectedZones.length > 0 ? 
          `Agent créé avec succès et assigné à ${parsedSelectedZones.length} zone(s)` : 
          'Agent créé avec succès',
        agent: {
          id: newAgent.id,
          employeeId: newAgent.employeeId,
          nom: newAgent.lastName,
          prenom: newAgent.firstName,
          firstName: newAgent.firstName,
          lastName: newAgent.lastName,
          cin: newAgent.cin,
          telephone: newAgent.phone,
          phone: newAgent.phone,
          email: newAgent.email,
          role: newAgent.role,
          supervisorId: newAgent.supervisorId,
          photo: newAgent.profilePhoto,
          profilePhoto: newAgent.profilePhoto,
          cinPhoto: cinPhotoPath,
          zones: assignedZonesData,
          event: eventData,
          createdByType: 'supervisor',
          createdBy: {
            id: supervisor.id,
            name: `${supervisor.prenom} ${supervisor.nom}`,
            role: supervisor.role
          },
          tempPassword // In production, don't return this, send via SMS instead
        }
      });

    } catch (error) {
      console.error('Error creating agent:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de l\'agent',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/supervisor/agents
 * @desc    Get all agents created by the supervisor
 * @access  Private (Supervisor only)
 */
router.get('/agents', authenticate, async (req, res) => {
  try {
    const supervisorUserId = req.user.id;

    // Verify the requesting user is a supervisor
    const supervisor = await User.findByPk(supervisorUserId);
    if (!supervisor || supervisor.role !== 'supervisor') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seuls les responsables peuvent voir cette liste.'
      });
    }

    // Get all agents created by this supervisor
    const agents = await User.findAll({
      where: {
        supervisorId: supervisorUserId,
        role: 'agent'
      },
      attributes: [
        'id', 'employeeId', 'firstName', 'lastName', 'phone', 'email',
        'profilePhoto', 'status', 'createdAt', 'updatedAt'
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: agents.length,
      agents: agents.map(agent => ({
        id: agent.id,
        employeeId: agent.employeeId,
        nom: agent.lastName,
        prenom: agent.firstName,
        firstName: agent.firstName,
        lastName: agent.lastName,
        telephone: agent.phone,
        phone: agent.phone,
        email: agent.email,
        photo: agent.profilePhoto,
        profilePhoto: agent.profilePhoto,
        isActive: agent.status === 'active',
        status: agent.status,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching supervisor agents:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des agents',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/supervisor/agents/:id
 * @desc    Get details of a specific agent created by supervisor
 * @access  Private (Supervisor only)
 */
router.get('/agents/:id', authenticate, async (req, res) => {
  try {
    const supervisorUserId = req.user.id;
    const agentId = req.params.id;

    // Verify the requesting user is a supervisor
    const supervisor = await User.findByPk(supervisorUserId);
    if (!supervisor || supervisor.role !== 'supervisor') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    // Get agent details
    const agent = await User.findOne({
      where: {
        id: agentId,
        supervisorId: supervisorUserId,
        role: 'agent'
      },
      attributes: [
        'id', 'employeeId', 'firstName', 'lastName', 'phone', 'email',
        'profilePhoto', 'address', 'city', 'postalCode',
        'dateOfBirth', 'status', 'createdAt', 'updatedAt'
      ]
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent non trouvé ou non autorisé'
      });
    }

    res.json({
      success: true,
      agent: {
        id: agent.id,
        employeeId: agent.employeeId,
        nom: agent.lastName,
        prenom: agent.firstName,
        firstName: agent.firstName,
        lastName: agent.lastName,
        telephone: agent.phone,
        phone: agent.phone,
        email: agent.email,
        photo: agent.profilePhoto,
        profilePhoto: agent.profilePhoto,
        adresse: agent.address,
        ville: agent.city,
        codePostal: agent.postalCode,
        dateNaissance: agent.dateOfBirth,
        isActive: agent.status === 'active',
        status: agent.status,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt
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
 * @route   GET /api/supervisor/managed-zones
 * @desc    Get all zones managed by the supervisor
 * @access  Private (Supervisor only)
 */
router.get('/managed-zones', authenticate, async (req, res) => {
  try {
    const supervisorUserId = req.user.id;

    // Verify the requesting user is a supervisor
    const supervisor = await User.findByPk(supervisorUserId);
    if (!supervisor || supervisor.role !== 'supervisor') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seuls les responsables peuvent accéder à cette ressource.'
      });
    }
    
    console.log(`🔍 Fetching zones for supervisor ID: ${supervisorUserId}`);
    
    // Récupérer les zones gérées par ce superviseur
    // Utiliser une requête brute SQL pour chercher dans le JSON (supporte à la fois les strings et les arrays JSON)
    const managedZones = await Zone.sequelize.query(`
      SELECT * FROM zones 
      WHERE deletedAt IS NULL 
      AND supervisors LIKE '%${supervisorUserId}%'
      ORDER BY name ASC
    `, {
      type: Zone.sequelize.QueryTypes.SELECT
    });

    console.log(`✅ Found ${managedZones.length} zones for supervisor`);
    if (managedZones.length > 0) {
      console.log('Zones:', managedZones.map(z => z.name).join(', '));
    }

    res.json({
      success: true,
      zones: managedZones
    });

  } catch (error) {
    console.error('Error fetching managed zones:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des zones gérées',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/supervisor/managed-events
 * @desc    Get all events that the supervisor manages (via managed zones)
 * @access  Private (Supervisor only)
 */
router.get('/managed-events', authenticate, async (req, res) => {
  try {
    const supervisorUserId = req.user.id;

    // Verify the requesting user is a supervisor
    const supervisor = await User.findByPk(supervisorUserId);
    if (!supervisor || supervisor.role !== 'supervisor') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seuls les responsables peuvent accéder à cette ressource.'
      });
    }
    
    console.log(`🔍 Fetching events for supervisor ID: ${supervisorUserId}`);
    
    // Récupérer les événements via les zones gérées
    // Les événements restent affichés jusqu'à 2h après leur fin (pour permettre les check-out en retard)
    const managedEvents = await Zone.sequelize.query(`
      SELECT DISTINCT 
        e.*,
        (SELECT COUNT(*) FROM zones z WHERE z.eventId = e.id AND z.deletedAt IS NULL AND z.supervisors LIKE '%${supervisorUserId}%') as managedZonesCount,
        CASE
          WHEN CONCAT(DATE(e.endDate), ' ', IFNULL(e.checkOutTime, '23:59:59')) < NOW() THEN 'completed'
          WHEN DATE_SUB(
            CONCAT(DATE(e.startDate), ' ', IFNULL(e.checkInTime, '00:00:00')), 
            INTERVAL IFNULL(e.agentCreationBuffer, 120) MINUTE
          ) <= NOW() 
            AND CONCAT(DATE(e.endDate), ' ', IFNULL(e.checkOutTime, '23:59:59')) >= NOW() THEN 'active'
          WHEN DATE_SUB(
            CONCAT(DATE(e.startDate), ' ', IFNULL(e.checkInTime, '00:00:00')), 
            INTERVAL IFNULL(e.agentCreationBuffer, 120) MINUTE
          ) > NOW() THEN 'scheduled'
          ELSE e.status
        END as computedStatus
      FROM events e
      INNER JOIN zones z ON e.id = z.eventId
      WHERE e.deletedAt IS NULL 
        AND z.deletedAt IS NULL
        AND z.supervisors LIKE '%${supervisorUserId}%'
        AND DATE_ADD(
          CONCAT(DATE(e.endDate), ' ', IFNULL(e.checkOutTime, '23:59:59')), 
          INTERVAL 2 HOUR
        ) >= NOW()
        AND e.status NOT IN ('cancelled', 'terminated')
      ORDER BY e.startDate ASC
    `, {
      type: Zone.sequelize.QueryTypes.SELECT
    });

    console.log(`✅ Found ${managedEvents.length} events for supervisor`);
    if (managedEvents.length > 0) {
      console.log('Events:', managedEvents.map(e => e.name).join(', '));
    }

    // Charger les zones pour chaque événement
    for (const event of managedEvents) {
      const zones = await Zone.sequelize.query(`
        SELECT id, name, description, capacity, color
        FROM zones
        WHERE eventId = ?
          AND deletedAt IS NULL
          AND supervisors LIKE ?
      `, {
        replacements: [event.id, `%${supervisorUserId}%`],
        type: Zone.sequelize.QueryTypes.SELECT
      });
      event.zones = zones;
    }

    res.json({
      success: true,
      events: managedEvents
    });

  } catch (error) {
    console.error('Error fetching managed events:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des événements gérés',
      error: error.message
    });
  }
});

module.exports = router;
