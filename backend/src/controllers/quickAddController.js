/**
 * Controleur d'Ajout Rapide d'Agents
 * Permet aux responsables d'ajouter rapidement des agents sur le terrain
 */

const { User, Event, Assignment, UserDocument, LivenessLog, FraudAttempt } = require('../models');
const { Op } = require('sequelize');
const { logActivity } = require('../middlewares/activityLogger');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

/**
 * Generer un ID employe unique
 */
const generateEmployeeId = async (role) => {
  const prefixes = {
    agent: 'AGT',
    supervisor: 'RES',
    admin: 'ADM'
  };

  const prefix = prefixes[role] || 'AGT';

  const lastUser = await User.findOne({
    where: {
      employeeId: { [Op.like]: `${prefix}%` }
    },
    order: [['employeeId', 'DESC']],
    paranoid: false
  });

  let nextNumber = 1;
  if (lastUser && lastUser.employeeId) {
    const match = lastUser.employeeId.match(/\d+$/);
    if (match) {
      nextNumber = parseInt(match[0], 10) + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(5, '0')}`;
};

/**
 * Generer un mot de passe temporaire
 */
const generateTemporaryPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

/**
 * Ajout rapide d'un agent par le responsable
 */
exports.quickAddAgent = async (req, res) => {
  try {
    const {
      cin,
      firstName,
      lastName,
      phone,
      eventId,
      facialVector,
      facialPhoto,
      documentPhoto,
      notes
    } = req.body;

    const supervisorId = req.user.id;

    // Verifier que l'utilisateur est superviseur ou admin
    if (!['supervisor', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Seuls les responsables peuvent ajouter des agents rapidement'
      });
    }

    // Verifier que l'evenement existe et est actif
    if (eventId) {
      const event = await Event.findByPk(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Evenement non trouve'
        });
      }
      if (!['scheduled', 'active'].includes(event.status)) {
        return res.status(400).json({
          success: false,
          message: 'L\'evenement n\'est pas actif'
        });
      }
    }

    // Verifier si le CIN existe deja
    if (cin) {
      const existingUser = await User.findOne({
        where: { cin: cin.toUpperCase().trim() },
        paranoid: false
      });

      if (existingUser) {
        // Si l'utilisateur existe deja, l'assigner a l'evenement
        if (eventId && !existingUser.deletedAt) {
          const existingAssignment = await Assignment.findOne({
            where: { agentId: existingUser.id, eventId }
          });

          if (!existingAssignment) {
            await Assignment.create({
              agentId: existingUser.id,
              eventId,
              assignedBy: supervisorId,
              status: 'confirmed',
              notes: `Assigne rapidement par ${req.user.firstName} ${req.user.lastName}`
            });
          }

          return res.json({
            success: true,
            message: 'Agent existant assigne a l\'evenement',
            data: {
              agent: existingUser.toJSON(),
              isExisting: true,
              assigned: true
            }
          });
        }

        return res.status(400).json({
          success: false,
          message: 'Un agent avec ce CIN existe deja',
          existingAgent: {
            id: existingUser.id,
            name: `${existingUser.firstName} ${existingUser.lastName}`,
            status: existingUser.status
          }
        });
      }
    }

    // Generer l'ID employe et le mot de passe temporaire
    const employeeId = await generateEmployeeId('agent');
    const temporaryPassword = cin ? cin.toUpperCase().trim() : generateTemporaryPassword();

    // Creer l'agent
    const agent = await User.create({
      employeeId,
      cin: cin ? cin.toUpperCase().trim() : null,
      firstName,
      lastName,
      email: `${employeeId.toLowerCase()}@temp.securityguard.com`, // Email temporaire
      password: temporaryPassword,
      phone,
      role: 'agent',
      status: 'active',
      supervisorId,
      profilePhoto: facialPhoto || null,

      // Marquer comme temporaire et cree par responsable
      isTemporary: true,
      createdByType: 'supervisor',
      createdByUserId: supervisorId
    });

    // Sauvegarder le vecteur facial si fourni
    if (facialVector && Array.isArray(facialVector)) {
      agent.setEncryptedFacialVector(facialVector);
      await agent.save();
    }

    // Sauvegarder le document CIN si fourni
    if (documentPhoto) {
      await UserDocument.create({
        userId: agent.id,
        documentType: 'cin_recto',
        originalFilename: `CIN_${cin || 'QUICK'}_${Date.now()}.jpg`,
        storedFilename: `${uuidv4()}.jpg`,
        filePath: '/uploads/documents/',
        fileSize: documentPhoto.length,
        mimeType: 'image/jpeg',
        fileExtension: 'jpg',
        fileContent: documentPhoto,
        description: `CIN capture lors de l'ajout rapide par ${req.user.firstName} ${req.user.lastName}`,
        isRequired: false,
        uploadedBy: supervisorId
      });
    }

    // Assigner a l'evenement si specifie
    let assignment = null;
    if (eventId) {
      assignment = await Assignment.create({
        agentId: agent.id,
        eventId,
        assignedBy: supervisorId,
        status: 'confirmed',
        confirmedAt: new Date(),
        notes: notes || `Ajout rapide par ${req.user.firstName} ${req.user.lastName}`
      });
    }

    // Log de l'activite
    await logActivity({
      userId: supervisorId,
      action: 'QUICK_ADD_AGENT',
      entityType: 'user',
      entityId: agent.id,
      description: `Agent ${firstName} ${lastName} ajoute rapidement par ${req.user.firstName} ${req.user.lastName}`,
      newValues: {
        agentId: agent.id,
        employeeId,
        eventId,
        isTemporary: true
      },
      req
    });

    // Notifier les admins
    const io = req.app.get('io');
    if (io) {
      io.to('role:admin').emit('agent:quick-add', {
        agent: {
          id: agent.id,
          employeeId,
          name: `${firstName} ${lastName}`,
          cin
        },
        addedBy: {
          id: supervisorId,
          name: `${req.user.firstName} ${req.user.lastName}`
        },
        eventId,
        timestamp: new Date()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Agent ajoute avec succes',
      data: {
        agent: agent.toJSON(),
        temporaryPassword: cin ? `Le mot de passe est le CIN: ${cin.toUpperCase()}` : temporaryPassword,
        employeeId,
        assignment: assignment ? {
          id: assignment.id,
          eventId,
          status: 'confirmed'
        } : null,
        requiresValidation: true,
        validationMessage: 'Cet agent temporaire doit etre valide par un administrateur'
      }
    });

  } catch (error) {
    console.error('Quick add agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout de l\'agent',
      error: error.message
    });
  }
};

/**
 * Obtenir les agents en attente de validation
 */
exports.getPendingAgents = async (req, res) => {
  try {
    // Admin seulement
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acces reserve aux administrateurs'
      });
    }

    const agents = await User.findAll({
      where: {
        isTemporary: true,
        validatedBy: null
      },
      include: [
        {
          model: User,
          as: 'supervisor',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: UserDocument,
          as: 'documents',
          attributes: ['id', 'documentType', 'originalFilename', 'createdAt']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Enrichir avec les infos du createur
    const enriched = await Promise.all(agents.map(async (agent) => {
      let createdBy = null;
      if (agent.createdByUserId) {
        createdBy = await User.findByPk(agent.createdByUserId, {
          attributes: ['id', 'firstName', 'lastName', 'role']
        });
      }

      return {
        ...agent.toJSON(),
        createdBy
      };
    }));

    res.json({
      success: true,
      data: enriched
    });

  } catch (error) {
    console.error('Get pending agents error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
};

/**
 * Valider un agent temporaire
 */
exports.validateAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { action, notes, email } = req.body;

    // Admin seulement
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acces reserve aux administrateurs'
      });
    }

    const agent = await User.findByPk(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent non trouve'
      });
    }

    if (!agent.isTemporary) {
      return res.status(400).json({
        success: false,
        message: 'Cet agent n\'est pas temporaire'
      });
    }

    if (action === 'approve') {
      // Approuver l'agent
      const updateData = {
        isTemporary: false,
        validatedBy: req.user.id,
        validatedAt: new Date()
      };

      // Mettre a jour l'email si fourni
      if (email) {
        const emailExists = await User.findOne({ where: { email, id: { [Op.ne]: agentId } } });
        if (emailExists) {
          return res.status(400).json({
            success: false,
            message: 'Cet email est deja utilise'
          });
        }
        updateData.email = email;
      }

      await agent.update(updateData);

      await logActivity({
        userId: req.user.id,
        action: 'VALIDATE_AGENT',
        entityType: 'user',
        entityId: agentId,
        description: `Agent ${agent.firstName} ${agent.lastName} valide`,
        req
      });

      res.json({
        success: true,
        message: 'Agent valide avec succes',
        data: agent.toJSON()
      });

    } else if (action === 'reject') {
      // Rejeter et supprimer l'agent
      await logActivity({
        userId: req.user.id,
        action: 'REJECT_AGENT',
        entityType: 'user',
        entityId: agentId,
        description: `Agent ${agent.firstName} ${agent.lastName} rejete: ${notes}`,
        req
      });

      // Supprimer les assignments
      await Assignment.destroy({ where: { agentId } });

      // Soft delete
      await agent.destroy();

      res.json({
        success: true,
        message: 'Agent rejete et supprime'
      });

    } else {
      return res.status(400).json({
        success: false,
        message: 'Action invalide. Utilisez "approve" ou "reject"'
      });
    }

  } catch (error) {
    console.error('Validate agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
};

/**
 * Statistiques des agents par type de creation
 */
exports.getAgentStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acces reserve aux administrateurs'
      });
    }

    const stats = {
      total: await User.count({ where: { role: 'agent' } }),
      byCreationType: {
        admin: await User.count({ where: { role: 'agent', createdByType: 'admin' } }),
        supervisor: await User.count({ where: { role: 'agent', createdByType: 'supervisor' } }),
        selfRegistration: await User.count({ where: { role: 'agent', createdByType: 'self_registration' } })
      },
      temporary: await User.count({ where: { role: 'agent', isTemporary: true } }),
      pendingValidation: await User.count({ where: { role: 'agent', isTemporary: true, validatedBy: null } }),
      active: await User.count({ where: { role: 'agent', status: 'active' } }),
      inactive: await User.count({ where: { role: 'agent', status: 'inactive' } }),
      suspended: await User.count({ where: { role: 'agent', status: 'suspended' } })
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get agent stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
};
