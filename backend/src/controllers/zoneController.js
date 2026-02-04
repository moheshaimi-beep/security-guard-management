const { Zone, Event, Assignment, User } = require('../models');
const { Op } = require('sequelize');
const { logActivity } = require('../middlewares/activityLogger');

// Get all zones for an event
exports.getZonesByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    const zones = await Zone.findAll({
      where: { eventId },
      include: [
        {
          model: Assignment,
          as: 'assignments',
          include: [
            {
              model: User,
              as: 'agent',
              attributes: ['id', 'employeeId', 'firstName', 'lastName', 'role', 'profilePhoto']
            }
          ]
        }
      ],
      order: [['order', 'ASC'], ['name', 'ASC']]
    });

    // Add statistics for each zone
    const zonesWithStats = zones.map(zone => {
      const zoneData = zone.toJSON();
      const assignments = zoneData.assignments || [];
      const agents = assignments.filter(a => a.role !== 'supervisor');
      const supervisors = assignments.filter(a => a.role === 'supervisor');

      return {
        ...zoneData,
        stats: {
          assignedAgents: agents.length,
          requiredAgents: zoneData.requiredAgents,
          assignedSupervisors: supervisors.length,
          requiredSupervisors: zoneData.requiredSupervisors,
          isFilled: agents.length >= zoneData.requiredAgents,
          confirmedCount: assignments.filter(a => a.status === 'confirmed').length,
          pendingCount: assignments.filter(a => a.status === 'pending').length
        }
      };
    });

    res.json({
      success: true,
      data: zonesWithStats
    });
  } catch (error) {
    console.error('Get zones error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des zones'
    });
  }
};

// Get single zone
exports.getZoneById = async (req, res) => {
  try {
    const zone = await Zone.findByPk(req.params.id, {
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'location', 'startDate', 'endDate']
        },
        {
          model: Assignment,
          as: 'assignments',
          include: [
            {
              model: User,
              as: 'agent',
              attributes: ['id', 'employeeId', 'firstName', 'lastName', 'role', 'phone', 'profilePhoto']
            }
          ]
        }
      ]
    });

    if (!zone) {
      return res.status(404).json({
        success: false,
        message: 'Zone non trouvée'
      });
    }

    res.json({
      success: true,
      data: zone
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la zone'
    });
  }
};

// Create zone
exports.createZone = async (req, res) => {
  try {
    const { eventId, name, description, color, capacity, requiredAgents, requiredSupervisors, priority, latitude, longitude, geoRadius, instructions, order } = req.body;

    // Verify event exists
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    // Check for duplicate zone name in same event
    const existingZone = await Zone.findOne({
      where: { eventId, name }
    });

    if (existingZone) {
      return res.status(400).json({
        success: false,
        message: 'Une zone avec ce nom existe déjà pour cet événement'
      });
    }

    const zone = await Zone.create({
      eventId,
      name,
      description,
      color: color || '#3B82F6',
      capacity,
      requiredAgents: requiredAgents || 1,
      requiredSupervisors: requiredSupervisors || 0,
      priority: priority || 'medium',
      latitude,
      longitude,
      geoRadius: geoRadius || 50,
      instructions,
      order: order || 0
    });

    await logActivity({
      userId: req.user.id,
      action: 'CREATE_ZONE',
      entityType: 'zone',
      entityId: zone.id,
      description: `Zone "${name}" créée pour l'événement "${event.name}"`,
      newValues: zone.toJSON(),
      req
    });

    res.status(201).json({
      success: true,
      message: 'Zone créée avec succès',
      data: zone
    });
  } catch (error) {
    console.error('Create zone error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la zone'
    });
  }
};

// Create multiple zones at once
exports.createBulkZones = async (req, res) => {
  try {
    const { eventId, zones } = req.body;

    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    const results = { created: [], failed: [] };

    for (let i = 0; i < zones.length; i++) {
      const zoneData = zones[i];
      try {
        const existingZone = await Zone.findOne({
          where: { eventId, name: zoneData.name }
        });

        if (existingZone) {
          results.failed.push({ name: zoneData.name, reason: 'Zone avec ce nom existe déjà' });
          continue;
        }

        const zone = await Zone.create({
          eventId,
          name: zoneData.name,
          description: zoneData.description,
          color: zoneData.color || '#3B82F6',
          capacity: zoneData.capacity,
          requiredAgents: zoneData.requiredAgents || 1,
          requiredSupervisors: zoneData.requiredSupervisors || 0,
          priority: zoneData.priority || 'medium',
          instructions: zoneData.instructions,
          order: zoneData.order || i
        });

        results.created.push(zone);
      } catch (err) {
        results.failed.push({ name: zoneData.name, reason: err.message });
      }
    }

    await logActivity({
      userId: req.user.id,
      action: 'BULK_CREATE_ZONES',
      entityType: 'zone',
      description: `${results.created.length} zones créées pour "${event.name}"`,
      newValues: results,
      req
    });

    res.status(201).json({
      success: true,
      message: `${results.created.length} zone(s) créée(s), ${results.failed.length} échec(s)`,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création des zones'
    });
  }
};

// Update zone
exports.updateZone = async (req, res) => {
  try {
    const zone = await Zone.findByPk(req.params.id);

    if (!zone) {
      return res.status(404).json({
        success: false,
        message: 'Zone non trouvée'
      });
    }

    const oldValues = zone.toJSON();
    const { name, description, color, capacity, requiredAgents, requiredSupervisors, priority, latitude, longitude, geoRadius, instructions, isActive, order } = req.body;

    // Check for duplicate name if name is being changed
    if (name && name !== zone.name) {
      const existingZone = await Zone.findOne({
        where: {
          eventId: zone.eventId,
          name,
          id: { [Op.ne]: zone.id }
        }
      });

      if (existingZone) {
        return res.status(400).json({
          success: false,
          message: 'Une zone avec ce nom existe déjà pour cet événement'
        });
      }
    }

    await zone.update({
      name: name !== undefined ? name : zone.name,
      description: description !== undefined ? description : zone.description,
      color: color !== undefined ? color : zone.color,
      capacity: capacity !== undefined ? capacity : zone.capacity,
      requiredAgents: requiredAgents !== undefined ? requiredAgents : zone.requiredAgents,
      requiredSupervisors: requiredSupervisors !== undefined ? requiredSupervisors : zone.requiredSupervisors,
      priority: priority !== undefined ? priority : zone.priority,
      latitude: latitude !== undefined ? latitude : zone.latitude,
      longitude: longitude !== undefined ? longitude : zone.longitude,
      geoRadius: geoRadius !== undefined ? geoRadius : zone.geoRadius,
      instructions: instructions !== undefined ? instructions : zone.instructions,
      isActive: isActive !== undefined ? isActive : zone.isActive,
      order: order !== undefined ? order : zone.order
    });

    await logActivity({
      userId: req.user.id,
      action: 'UPDATE_ZONE',
      entityType: 'zone',
      entityId: zone.id,
      description: `Zone "${zone.name}" mise à jour`,
      oldValues,
      newValues: zone.toJSON(),
      req
    });

    res.json({
      success: true,
      message: 'Zone mise à jour',
      data: zone
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la zone'
    });
  }
};

// Delete zone
exports.deleteZone = async (req, res) => {
  try {
    const zone = await Zone.findByPk(req.params.id, {
      include: [{ model: Event, as: 'event' }]
    });

    if (!zone) {
      return res.status(404).json({
        success: false,
        message: 'Zone non trouvée'
      });
    }

    // Check if zone has active assignments
    const activeAssignments = await Assignment.count({
      where: {
        zoneId: zone.id,
        status: { [Op.notIn]: ['cancelled', 'declined'] }
      }
    });

    if (activeAssignments > 0) {
      return res.status(400).json({
        success: false,
        message: `Cette zone a ${activeAssignments} affectation(s) active(s). Veuillez les supprimer d'abord.`
      });
    }

    const zoneName = zone.name;
    await zone.destroy();

    await logActivity({
      userId: req.user.id,
      action: 'DELETE_ZONE',
      entityType: 'zone',
      entityId: req.params.id,
      description: `Zone "${zoneName}" supprimée`,
      oldValues: zone.toJSON(),
      req
    });

    res.json({
      success: true,
      message: 'Zone supprimée'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la zone'
    });
  }
};

// Get zone statistics for an event
exports.getEventZoneStats = async (req, res) => {
  try {
    const { eventId } = req.params;

    const zones = await Zone.findAll({
      where: { eventId },
      include: [
        {
          model: Assignment,
          as: 'assignments',
          where: { status: { [Op.notIn]: ['cancelled', 'declined'] } },
          required: false
        }
      ]
    });

    const stats = {
      totalZones: zones.length,
      totalRequiredAgents: zones.reduce((sum, z) => sum + z.requiredAgents, 0),
      totalAssignedAgents: 0,
      totalRequiredSupervisors: zones.reduce((sum, z) => sum + z.requiredSupervisors, 0),
      totalAssignedSupervisors: 0,
      filledZones: 0,
      underfilledZones: 0,
      zones: []
    };

    zones.forEach(zone => {
      const assignments = zone.assignments || [];
      const agents = assignments.filter(a => a.role !== 'supervisor').length;
      const supervisors = assignments.filter(a => a.role === 'supervisor').length;

      stats.totalAssignedAgents += agents;
      stats.totalAssignedSupervisors += supervisors;

      const isFilled = agents >= zone.requiredAgents;
      if (isFilled) {
        stats.filledZones++;
      } else {
        stats.underfilledZones++;
      }

      stats.zones.push({
        id: zone.id,
        name: zone.name,
        color: zone.color,
        priority: zone.priority,
        requiredAgents: zone.requiredAgents,
        assignedAgents: agents,
        requiredSupervisors: zone.requiredSupervisors,
        assignedSupervisors: supervisors,
        isFilled,
        fillPercentage: zone.requiredAgents > 0 ? Math.round((agents / zone.requiredAgents) * 100) : 100
      });
    });

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
