/**
 * Script de nettoyage global automatisé
 * Nettoie toutes les entités supprimées depuis plus de X jours
 */

const { User, Event, Zone, Assignment, Attendance } = require('./src/models');
const { Op } = require('sequelize');

async function globalAutoCleanup(daysOld = 30) {
  try {
    console.log(`🧹 Nettoyage global automatique (>${daysOld} jours)...\n`);
    
    const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
    let totalCleaned = 0;

    // 1. Nettoyer les utilisateurs supprimés
    const oldUsers = await User.findAll({
      where: {
        deletedAt: {
          [Op.ne]: null,
          [Op.lte]: cutoffDate
        }
      },
      paranoid: false
    });

    console.log(`👥 UTILISATEURS: ${oldUsers.length} à nettoyer`);
    for (const user of oldUsers) {
      try {
        // Nettoyer les affectations associées
        await Assignment.destroy({
          where: { agentId: user.id },
          force: true
        });

        // Nettoyer les présences associées (hard delete car pas de soft delete)
        await Attendance.destroy({
          where: { agentId: user.id }
        });

        // Supprimer l'utilisateur
        await user.destroy({ force: true });
        totalCleaned++;
        console.log(`   ✅ ${user.firstName} ${user.lastName} (${user.employeeId})`);
      } catch (error) {
        console.log(`   ❌ Erreur: ${user.firstName} ${user.lastName} - ${error.message}`);
      }
    }

    // 2. Nettoyer les événements supprimés
    const oldEvents = await Event.findAll({
      where: {
        deletedAt: {
          [Op.ne]: null,
          [Op.lte]: cutoffDate
        }
      },
      paranoid: false
    });

    console.log(`\n📅 ÉVÉNEMENTS: ${oldEvents.length} à nettoyer`);
    for (const event of oldEvents) {
      try {
        // Nettoyer les zones associées
        await Zone.destroy({
          where: { eventId: event.id },
          force: true
        });

        // Nettoyer les affectations associées
        await Assignment.destroy({
          where: { eventId: event.id },
          force: true
        });

        // Nettoyer les présences associées
        await Attendance.destroy({
          where: { eventId: event.id }
        });

        // Supprimer l'événement
        await event.destroy({ force: true });
        totalCleaned++;
        console.log(`   ✅ ${event.name} (${new Date(event.startDate).toLocaleDateString()})`);
      } catch (error) {
        console.log(`   ❌ Erreur: ${event.name} - ${error.message}`);
      }
    }

    // 3. Nettoyer les zones supprimées
    const oldZones = await Zone.findAll({
      where: {
        deletedAt: {
          [Op.ne]: null,
          [Op.lte]: cutoffDate
        }
      },
      paranoid: false
    });

    console.log(`\n🗺️  ZONES: ${oldZones.length} à nettoyer`);
    for (const zone of oldZones) {
      try {
        await zone.destroy({ force: true });
        totalCleaned++;
        console.log(`   ✅ ${zone.name} (Event ${zone.eventId})`);
      } catch (error) {
        console.log(`   ❌ Erreur: ${zone.name} - ${error.message}`);
      }
    }

    // 4. Nettoyer les affectations supprimées
    const oldAssignments = await Assignment.findAll({
      where: {
        deletedAt: {
          [Op.ne]: null,
          [Op.lte]: cutoffDate
        }
      },
      paranoid: false,
      include: [
        { model: User, as: 'agent', attributes: ['firstName', 'lastName'], paranoid: false },
        { model: Event, as: 'event', attributes: ['name'], paranoid: false }
      ]
    });

    console.log(`\n📋 AFFECTATIONS: ${oldAssignments.length} à nettoyer`);
    for (const assignment of oldAssignments) {
      try {
        await assignment.destroy({ force: true });
        totalCleaned++;
        const agent = assignment.agent || { firstName: 'Agent', lastName: 'Supprimé' };
        const event = assignment.event || { name: 'Événement Supprimé' };
        console.log(`   ✅ ${agent.firstName} ${agent.lastName} → ${event.name}`);
      } catch (error) {
        console.log(`   ❌ Erreur: Affectation ${assignment.id} - ${error.message}`);
      }
    }

    console.log(`\n🎯 NETTOYAGE TERMINÉ: ${totalCleaned} éléments supprimés définitivement`);
    
    return totalCleaned;

  } catch (error) {
    console.error('💥 Erreur lors du nettoyage global:', error.message);
    throw error;
  }
}

async function cleanupOrphanedRecords() {
  try {
    console.log('🔗 Nettoyage des enregistrements orphelins...\n');
    let totalCleaned = 0;

    // 1. Nettoyer les présences orphelines (agent supprimé)
    const orphanedAttendances = await Attendance.findAll({
      include: [{
        model: User,
        as: 'agent',
        where: { deletedAt: { [Op.ne]: null } },
        required: true,
        paranoid: false
      }]
    });

    console.log(`⏰ PRÉSENCES ORPHELINES: ${orphanedAttendances.length} à nettoyer`);
    for (const attendance of orphanedAttendances) {
      try {
        await attendance.destroy();
        totalCleaned++;
        console.log(`   ✅ Présence supprimée (agent inexistant)`);
      } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
      }
    }

    // 2. Nettoyer les affectations avec agents supprimés
    const orphanedAssignments = await Assignment.count({
      include: [{
        model: User,
        as: 'agent',
        where: { deletedAt: { [Op.ne]: null } },
        required: true,
        paranoid: false
      }],
      paranoid: true
    });

    if (orphanedAssignments > 0) {
      console.log(`\n📋 AFFECTATIONS ORPHELINES: ${orphanedAssignments} détectées (agents supprimés)`);
      console.log('   💡 Ces affectations seront nettoyées lors du nettoyage global des utilisateurs');
    }

    // 3. Nettoyer les zones avec événements supprimés
    const orphanedZones = await Zone.count({
      include: [{
        model: Event,
        as: 'event',
        where: { deletedAt: { [Op.ne]: null } },
        required: true,
        paranoid: false
      }],
      paranoid: true
    });

    if (orphanedZones > 0) {
      console.log(`\n🗺️  ZONES ORPHELINES: ${orphanedZones} détectées (événements supprimés)`);
      console.log('   💡 Ces zones seront nettoyées lors du nettoyage global des événements');
    }

    console.log(`\n🎯 NETTOYAGE ORPHELINS TERMINÉ: ${totalCleaned} éléments supprimés`);
    return totalCleaned;

  } catch (error) {
    console.error('💥 Erreur lors du nettoyage des orphelins:', error.message);
    throw error;
  }
}

async function optimizeDatabase() {
  try {
    console.log('⚡ Optimisation de la base de données...\n');

    const { sequelize } = require('./src/models');
    
    // Optimiser les tables principales
    const tables = ['users', 'events', 'zones', 'assignments', 'attendance'];
    
    for (const table of tables) {
      try {
        await sequelize.query(`OPTIMIZE TABLE \`${table}\``);
        console.log(`✅ Table ${table} optimisée`);
      } catch (error) {
        console.log(`⚠️  Erreur optimisation ${table}: ${error.message}`);
      }
    }

    // Analyser les tables pour des statistiques précises
    for (const table of tables) {
      try {
        await sequelize.query(`ANALYZE TABLE \`${table}\``);
        console.log(`📊 Table ${table} analysée`);
      } catch (error) {
        console.log(`⚠️  Erreur analyse ${table}: ${error.message}`);
      }
    }

    console.log('\n⚡ Optimisation terminée !');
    return true;

  } catch (error) {
    console.error('💥 Erreur lors de l\'optimisation:', error.message);
    return false;
  }
}

// Script principal
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const daysOld = parseInt(args[1]) || 30;

  try {
    switch (command) {
      case 'cleanup':
        const cleaned = await globalAutoCleanup(daysOld);
        console.log(`\n✨ Nettoyage terminé: ${cleaned} éléments supprimés`);
        break;

      case 'orphans':
        const orphansCleaned = await cleanupOrphanedRecords();
        console.log(`\n✨ Orphelins nettoyés: ${orphansCleaned} éléments`);
        break;

      case 'optimize':
        const optimized = await optimizeDatabase();
        if (optimized) {
          console.log('\n✨ Base de données optimisée !');
        }
        break;

      case 'full':
        console.log('🚀 NETTOYAGE COMPLET EN COURS...\n');
        
        // 1. Nettoyage global
        const fullCleaned = await globalAutoCleanup(daysOld);
        
        // 2. Nettoyage orphelins
        const fullOrphans = await cleanupOrphanedRecords();
        
        // 3. Optimisation
        await optimizeDatabase();
        
        console.log(`\n🎯 NETTOYAGE COMPLET TERMINÉ:`);
        console.log(`   📦 ${fullCleaned} éléments anciens supprimés`);
        console.log(`   🔗 ${fullOrphans} orphelins supprimés`);
        console.log(`   ⚡ Base de données optimisée`);
        break;

      default:
        console.log(`
🧹 Script de Nettoyage Global Automatisé

Usage:
  node global-cleanup.js cleanup [days]     - Nettoyer les éléments supprimés (défaut: 30 jours)
  node global-cleanup.js orphans           - Nettoyer les enregistrements orphelins
  node global-cleanup.js optimize          - Optimiser la base de données
  node global-cleanup.js full [days]       - Nettoyage complet (tout + optimisation)

Examples:
  node global-cleanup.js cleanup 7         # Nettoyer > 7 jours
  node global-cleanup.js full              # Nettoyage complet (30 jours)
  node global-cleanup.js orphans           # Orphelins seulement
        `);
    }
    
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
  globalAutoCleanup,
  cleanupOrphanedRecords,
  optimizeDatabase
};