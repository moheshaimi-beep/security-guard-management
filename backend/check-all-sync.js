/**
 * Script de vérification globale de synchronisation et détection de doublons
 * Vérifie: Users, Events, Zones, Assignments, Attendance
 */

const { User, Event, Zone, Assignment, Attendance } = require('./src/models');
const { Op } = require('sequelize');

async function checkAllEntitiesSynchronization() {
  try {
    console.log('🔍 Vérification globale de synchronisation et doublons...\n');
    
    const results = {
      users: await checkUsersSync(),
      events: await checkEventsSync(),
      zones: await checkZonesSync(), 
      assignments: await checkAssignmentsSync(),
      attendance: await checkAttendanceSync()
    };

    // Résumé global
    console.log('📊 RÉSUMÉ GLOBAL DE SYNCHRONISATION\n');
    Object.entries(results).forEach(([entity, stats]) => {
      console.log(`${getEntityIcon(entity)} ${entity.toUpperCase()}:`);
      console.log(`   Total: ${stats.total} | Actifs: ${stats.active} | Supprimés: ${stats.deleted} | Doublons: ${stats.duplicates || 0}`);
      if (stats.duplicates > 0) {
        console.log(`   ⚠️  ATTENTION: ${stats.duplicates} doublons détectés !`);
      }
    });

    return results;
  } catch (error) {
    console.error('❌ Erreur lors de la vérification globale:', error.message);
    throw error;
  }
}

function getEntityIcon(entity) {
  const icons = {
    users: '👥',
    events: '📅',
    zones: '🗺️',
    assignments: '📋',
    attendance: '⏰'
  };
  return icons[entity] || '📊';
}

async function checkUsersSync() {
  console.log('👥 UTILISATEURS');
  console.log('================');

  const total = await User.count({ paranoid: false });
  const active = await User.count({ paranoid: true });
  const deleted = await User.count({
    where: { deletedAt: { [Op.ne]: null } },
    paranoid: false
  });

  // Vérifier les doublons par email
  const duplicateEmails = await User.findAll({
    attributes: ['email'],
    group: ['email'],
    having: User.sequelize.literal('COUNT(*) > 1'),
    paranoid: false,
    raw: true
  });

  // Vérifier les doublons par CIN
  const duplicateCins = await User.findAll({
    attributes: ['cin'],
    where: { cin: { [Op.ne]: null } },
    group: ['cin'],
    having: User.sequelize.literal('COUNT(*) > 1'),
    paranoid: false,
    raw: true
  });

  // Vérifier les doublons par employeeId
  const duplicateEmployeeIds = await User.findAll({
    attributes: ['employeeId'],
    group: ['employeeId'],
    having: User.sequelize.literal('COUNT(*) > 1'),
    paranoid: false,
    raw: true
  });

  let duplicatesFound = 0;
  if (duplicateEmails.length > 0) {
    console.log(`⚠️  ${duplicateEmails.length} emails en doublon:`);
    for (const dup of duplicateEmails) {
      const users = await User.findAll({
        where: { email: dup.email },
        paranoid: false,
        attributes: ['id', 'firstName', 'lastName', 'email', 'deletedAt']
      });
      console.log(`   📧 ${dup.email}: ${users.length} utilisateurs`);
      duplicatesFound += users.length - 1;
    }
  }

  if (duplicateCins.length > 0) {
    console.log(`⚠️  ${duplicateCins.length} CIN en doublon:`);
    for (const dup of duplicateCins) {
      const users = await User.findAll({
        where: { cin: dup.cin },
        paranoid: false,
        attributes: ['id', 'firstName', 'lastName', 'cin', 'deletedAt']
      });
      console.log(`   🆔 ${dup.cin}: ${users.length} utilisateurs`);
      duplicatesFound += users.length - 1;
    }
  }

  if (duplicateEmployeeIds.length > 0) {
    console.log(`⚠️  ${duplicateEmployeeIds.length} ID Employé en doublon:`);
    for (const dup of duplicateEmployeeIds) {
      const users = await User.findAll({
        where: { employeeId: dup.employeeId },
        paranoid: false,
        attributes: ['id', 'firstName', 'lastName', 'employeeId', 'deletedAt']
      });
      console.log(`   🏢 ${dup.employeeId}: ${users.length} utilisateurs`);
      duplicatesFound += users.length - 1;
    }
  }

  console.log(`✅ Total: ${total} | Actifs: ${active} | Supprimés: ${deleted} | Doublons: ${duplicatesFound}\n`);
  
  return { total, active, deleted, duplicates: duplicatesFound };
}

async function checkEventsSync() {
  console.log('📅 ÉVÉNEMENTS');
  console.log('=============');

  const total = await Event.count({ paranoid: false });
  const active = await Event.count({ paranoid: true });
  const deleted = await Event.count({
    where: { deletedAt: { [Op.ne]: null } },
    paranoid: false
  });

  // Vérifier les doublons par nom et date
  const duplicateEvents = await Event.findAll({
    attributes: ['name', 'startDate'],
    group: ['name', 'startDate'],
    having: Event.sequelize.literal('COUNT(*) > 1'),
    paranoid: false,
    raw: true
  });

  let duplicatesFound = 0;
  if (duplicateEvents.length > 0) {
    console.log(`⚠️  ${duplicateEvents.length} événements potentiellement en doublon:`);
    for (const dup of duplicateEvents) {
      const events = await Event.findAll({
        where: { 
          name: dup.name,
          startDate: dup.startDate
        },
        paranoid: false,
        attributes: ['id', 'name', 'startDate', 'status', 'deletedAt']
      });
      console.log(`   📅 "${dup.name}" (${new Date(dup.startDate).toLocaleDateString()}): ${events.length} événements`);
      duplicatesFound += events.length - 1;
    }
  }

  // Vérifier les événements orphelins (créateur supprimé)
  const orphanEvents = await Event.count({
    include: [{
      model: User,
      as: 'creator',
      where: { deletedAt: { [Op.ne]: null } },
      required: true
    }],
    paranoid: true
  });

  if (orphanEvents > 0) {
    console.log(`⚠️  ${orphanEvents} événements orphelins (créateur supprimé)`);
  }

  console.log(`✅ Total: ${total} | Actifs: ${active} | Supprimés: ${deleted} | Doublons: ${duplicatesFound}\n`);
  
  return { total, active, deleted, duplicates: duplicatesFound, orphans: orphanEvents };
}

async function checkZonesSync() {
  console.log('🗺️  ZONES');
  console.log('=========');

  const total = await Zone.count({ paranoid: false });
  const active = await Zone.count({ paranoid: true });
  const deleted = await Zone.count({
    where: { deletedAt: { [Op.ne]: null } },
    paranoid: false
  });

  // Vérifier les doublons par nom et événement
  const duplicateZones = await Zone.findAll({
    attributes: ['name', 'eventId'],
    group: ['name', 'eventId'],
    having: Zone.sequelize.literal('COUNT(*) > 1'),
    paranoid: false,
    raw: true
  });

  let duplicatesFound = 0;
  if (duplicateZones.length > 0) {
    console.log(`⚠️  ${duplicateZones.length} zones en doublon:`);
    for (const dup of duplicateZones) {
      const zones = await Zone.findAll({
        where: { 
          name: dup.name,
          eventId: dup.eventId
        },
        paranoid: false,
        attributes: ['id', 'name', 'eventId', 'deletedAt']
      });
      console.log(`   🗺️  "${dup.name}" (Event ${dup.eventId}): ${zones.length} zones`);
      duplicatesFound += zones.length - 1;
    }
  }

  // Vérifier les zones orphelines (événement supprimé)
  const orphanZones = await Zone.count({
    include: [{
      model: Event,
      as: 'event',
      where: { deletedAt: { [Op.ne]: null } },
      required: true
    }],
    paranoid: true
  });

  if (orphanZones > 0) {
    console.log(`⚠️  ${orphanZones} zones orphelines (événement supprimé)`);
  }

  console.log(`✅ Total: ${total} | Actifs: ${active} | Supprimés: ${deleted} | Doublons: ${duplicatesFound}\n`);
  
  return { total, active, deleted, duplicates: duplicatesFound, orphans: orphanZones };
}

async function checkAssignmentsSync() {
  console.log('📋 AFFECTATIONS');
  console.log('===============');

  const total = await Assignment.count({ paranoid: false });
  const active = await Assignment.count({ paranoid: true });
  const deleted = await Assignment.count({
    where: { deletedAt: { [Op.ne]: null } },
    paranoid: false
  });

  // Vérifier les doublons par agent et événement
  const duplicateAssignments = await Assignment.findAll({
    attributes: ['agentId', 'eventId'],
    group: ['agentId', 'eventId'],
    having: Assignment.sequelize.literal('COUNT(*) > 1'),
    paranoid: false,
    raw: true
  });

  let duplicatesFound = 0;
  if (duplicateAssignments.length > 0) {
    console.log(`⚠️  ${duplicateAssignments.length} affectations en doublon:`);
    for (const dup of duplicateAssignments) {
      const assignments = await Assignment.findAll({
        where: { 
          agentId: dup.agentId,
          eventId: dup.eventId
        },
        paranoid: false,
        attributes: ['id', 'agentId', 'eventId', 'status', 'deletedAt'],
        include: [
          { model: User, as: 'agent', attributes: ['firstName', 'lastName'] },
          { model: Event, as: 'event', attributes: ['title'] }
        ]
      });
      const agent = assignments[0]?.agent;
      const event = assignments[0]?.event;
      console.log(`   📋 ${agent?.firstName} ${agent?.lastName} → "${event?.title}": ${assignments.length} affectations`);
      duplicatesFound += assignments.length - 1;
    }
  }

  // Vérifier les affectations orphelines
  const orphanAssignments = await Assignment.count({
    include: [
      {
        model: User,
        as: 'agent',
        where: { deletedAt: { [Op.ne]: null } },
        required: true
      }
    ],
    paranoid: true
  });

  if (orphanAssignments > 0) {
    console.log(`⚠️  ${orphanAssignments} affectations orphelines (agent supprimé)`);
  }

  console.log(`✅ Total: ${total} | Actifs: ${active} | Supprimés: ${deleted} | Doublons: ${duplicatesFound}\n`);
  
  return { total, active, deleted, duplicates: duplicatesFound, orphans: orphanAssignments };
}

async function checkAttendanceSync() {
  console.log('⏰ PRÉSENCES');
  console.log('============');

  const total = await Attendance.count();
  const active = total; // Pas de soft delete sur cette table
  const deleted = 0; // Pas de soft delete

  // Vérifier les doublons par agent, événement et date
  const duplicateAttendances = await Attendance.findAll({
    attributes: ['agentId', 'eventId', 'date'],
    group: ['agentId', 'eventId', 'date'],
    having: Attendance.sequelize.literal('COUNT(*) > 1'),
    raw: true
  });

  let duplicatesFound = 0;
  if (duplicateAttendances.length > 0) {
    console.log(`⚠️  ${duplicateAttendances.length} présences en doublon:`);
    for (const dup of duplicateAttendances) {
      const attendances = await Attendance.findAll({
        where: { 
          agentId: dup.agentId,
          eventId: dup.eventId,
          date: dup.date
        },
        attributes: ['id', 'agentId', 'eventId', 'date', 'checkInTime', 'checkOutTime'],
        include: [
          { model: User, as: 'agent', attributes: ['firstName', 'lastName'] },
          { model: Event, as: 'event', attributes: ['name'] }
        ]
      });
      const agent = attendances[0]?.agent;
      const event = attendances[0]?.event;
      console.log(`   ⏰ ${agent?.firstName} ${agent?.lastName} → "${event?.name}" (${new Date(dup.date).toLocaleDateString()}): ${attendances.length} pointages`);
      duplicatesFound += attendances.length - 1;
    }
  }

  // Vérifier les présences orphelines (agents supprimés)
  const orphanAttendances = await Attendance.count({
    include: [
      {
        model: User,
        as: 'agent',
        where: { deletedAt: { [Op.ne]: null } },
        required: true
      }
    ]
  });

  if (orphanAttendances > 0) {
    console.log(`⚠️  ${orphanAttendances} présences orphelines (agent supprimé)`);
  }

  console.log(`✅ Total: ${total} | Actifs: ${active} | Supprimés: ${deleted} | Doublons: ${duplicatesFound}\n`);
  
  return { total, active, deleted, duplicates: duplicatesFound, orphans: orphanAttendances };
}

async function cleanupDuplicates(entityType) {
  console.log(`🧹 Nettoyage des doublons pour: ${entityType.toUpperCase()}\n`);

  switch(entityType) {
    case 'users':
      return await cleanupUserDuplicates();
    case 'events': 
      return await cleanupEventDuplicates();
    case 'zones':
      return await cleanupZoneDuplicates();
    case 'assignments':
      return await cleanupAssignmentDuplicates();
    case 'attendance':
      return await cleanupAttendanceDuplicates();
    default:
      console.log('❌ Type d\'entité non reconnu');
      return 0;
  }
}

async function cleanupUserDuplicates() {
  let cleaned = 0;
  
  // Nettoyer les doublons d'email
  const duplicateEmails = await User.findAll({
    attributes: ['email'],
    group: ['email'],
    having: User.sequelize.literal('COUNT(*) > 1'),
    paranoid: false,
    raw: true
  });

  for (const dup of duplicateEmails) {
    const users = await User.findAll({
      where: { email: dup.email },
      paranoid: false,
      order: [['createdAt', 'ASC']]
    });

    // Garder le plus ancien, supprimer les autres
    for (let i = 1; i < users.length; i++) {
      await users[i].destroy({ force: true });
      cleaned++;
      console.log(`✅ Supprimé doublon: ${users[i].firstName} ${users[i].lastName} (${users[i].email})`);
    }
  }

  return cleaned;
}

async function cleanupAssignmentDuplicates() {
  let cleaned = 0;
  
  const duplicateAssignments = await Assignment.findAll({
    attributes: ['agentId', 'eventId'],
    group: ['agentId', 'eventId'],
    having: Assignment.sequelize.literal('COUNT(*) > 1'),
    paranoid: false,
    raw: true
  });

  for (const dup of duplicateAssignments) {
    const assignments = await Assignment.findAll({
      where: { 
        agentId: dup.agentId,
        eventId: dup.eventId
      },
      paranoid: false,
      order: [['createdAt', 'ASC']]
    });

    // Garder le plus ancien, supprimer les autres
    for (let i = 1; i < assignments.length; i++) {
      await assignments[i].destroy({ force: true });
      cleaned++;
      console.log(`✅ Supprimé doublon d'affectation: Agent ${dup.agentId} → Event ${dup.eventId}`);
    }
  }

  return cleaned;
}

async function cleanupAttendanceDuplicates() {
  let cleaned = 0;
  
  const duplicateAttendances = await Attendance.findAll({
    attributes: ['agentId', 'eventId', 'date'],
    group: ['agentId', 'eventId', 'date'],
    having: Attendance.sequelize.literal('COUNT(*) > 1'),
    raw: true
  });

  for (const dup of duplicateAttendances) {
    const attendances = await Attendance.findAll({
      where: { 
        agentId: dup.agentId,
        eventId: dup.eventId,
        date: dup.date
      },
      order: [['createdAt', 'ASC']]
    });

    // Garder le plus ancien, supprimer les autres (hard delete car pas de soft delete)
    for (let i = 1; i < attendances.length; i++) {
      await attendances[i].destroy();
      cleaned++;
      console.log(`✅ Supprimé doublon de présence: Agent ${dup.agentId} → Event ${dup.eventId} (${new Date(dup.date).toLocaleDateString()})`);
    }
  }

  return cleaned;
}

async function cleanupEventDuplicates() {
  let cleaned = 0;
  
  const duplicateEvents = await Event.findAll({
    attributes: ['title', 'startDate'],
    group: ['title', 'startDate'],
    having: Event.sequelize.literal('COUNT(*) > 1'),
    paranoid: false,
    raw: true
  });

  for (const dup of duplicateEvents) {
    const events = await Event.findAll({
      where: { 
        name: dup.name,
        startDate: dup.startDate
      },
      paranoid: false,
      order: [['createdAt', 'ASC']]
    });

    // Garder le plus ancien, supprimer les autres
    for (let i = 1; i < events.length; i++) {
      await events[i].destroy({ force: true });
      cleaned++;
      console.log(`✅ Supprimé doublon d'événement: "${dup.name}" (${new Date(dup.startDate).toLocaleDateString()})`);
    }
  }

  return cleaned;
}

async function cleanupZoneDuplicates() {
  let cleaned = 0;
  
  const duplicateZones = await Zone.findAll({
    attributes: ['name', 'eventId'],
    group: ['name', 'eventId'],
    having: Zone.sequelize.literal('COUNT(*) > 1'),
    paranoid: false,
    raw: true
  });

  for (const dup of duplicateZones) {
    const zones = await Zone.findAll({
      where: { 
        name: dup.name,
        eventId: dup.eventId
      },
      paranoid: false,
      order: [['createdAt', 'ASC']]
    });

    // Garder le plus ancien, supprimer les autres
    for (let i = 1; i < zones.length; i++) {
      await zones[i].destroy({ force: true });
      cleaned++;
      console.log(`✅ Supprimé doublon de zone: "${dup.name}" (Event ${dup.eventId})`);
    }
  }

  return cleaned;
}

// Script principal
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const entityType = args[1];

  try {
    switch (command) {
      case 'check':
        await checkAllEntitiesSynchronization();
        break;

      case 'clean':
        if (!entityType) {
          console.log('❌ Veuillez spécifier le type d\'entité à nettoyer');
          console.log('Usage: node check-all-sync.js clean <users|events|zones|assignments|attendance>');
          process.exit(1);
        }
        const cleaned = await cleanupDuplicates(entityType);
        console.log(`🎯 Nettoyage terminé: ${cleaned} doublons supprimés`);
        break;

      case 'clean-all':
        console.log('🧹 Nettoyage global de tous les doublons...\n');
        let totalCleaned = 0;
        const entities = ['users', 'events', 'zones', 'assignments', 'attendance'];
        
        for (const entity of entities) {
          const cleaned = await cleanupDuplicates(entity);
          totalCleaned += cleaned;
        }
        
        console.log(`🎯 Nettoyage global terminé: ${totalCleaned} doublons supprimés au total`);
        break;

      default:
        console.log(`
🔍 Script de Vérification Globale de Synchronisation

Usage:
  node check-all-sync.js check                           - Vérifier toutes les entités
  node check-all-sync.js clean <entity>                  - Nettoyer les doublons d'une entité
  node check-all-sync.js clean-all                       - Nettoyer tous les doublons

Entities: users, events, zones, assignments, attendance

Examples:
  node check-all-sync.js check
  node check-all-sync.js clean users
  node check-all-sync.js clean-all
        `);
    }
    
    console.log('\n✅ Vérification terminée !');
    process.exit(0);

  } catch (error) {
    console.error('💥 Erreur fatale :', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  checkAllEntitiesSynchronization,
  cleanupDuplicates
};