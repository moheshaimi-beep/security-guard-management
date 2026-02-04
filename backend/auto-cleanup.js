/**
 * Script automatique de nettoyage des utilisateurs supprimés
 * À exécuter périodiquement (ex: tâche cron)
 */

const { checkUserSynchronization, forceHardDelete } = require('./check-user-sync');
const { User } = require('./src/models');
const { Op } = require('sequelize');

async function autoCleanup() {
  try {
    console.log('🧹 Début du nettoyage automatique...\n');

    // 1. État actuel
    const stats = await checkUserSynchronization();
    console.log(`📊 État avant nettoyage: ${stats.active} actifs, ${stats.deleted} supprimés\n`);

    if (stats.deleted === 0) {
      console.log('✅ Aucun utilisateur supprimé à nettoyer.');
      return;
    }

    // 2. Trouver les utilisateurs supprimés depuis plus de 30 jours
    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    
    const oldDeletedUsers = await User.findAll({
      where: {
        deletedAt: {
          [Op.ne]: null,
          [Op.lte]: thirtyDaysAgo
        }
      },
      paranoid: false,
      attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email', 'deletedAt']
    });

    if (oldDeletedUsers.length === 0) {
      console.log('✅ Aucun utilisateur supprimé depuis plus de 30 jours.');
      return;
    }

    console.log(`🗑️  ${oldDeletedUsers.length} utilisateur(s) à nettoyer définitivement:`);
    oldDeletedUsers.forEach((user, index) => {
      const daysSince = Math.floor((Date.now() - new Date(user.deletedAt).getTime()) / (24 * 60 * 60 * 1000));
      console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.employeeId}) - ${daysSince} jours`);
    });

    // 3. Confirmation en mode interactif
    if (process.argv.includes('--interactive')) {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        rl.question('\n❓ Confirmer le nettoyage définitif ? (oui/non): ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 'oui') {
        console.log('❌ Nettoyage annulé.');
        return;
      }
    }

    // 4. Supprimer définitivement
    let cleaned = 0;
    for (const user of oldDeletedUsers) {
      try {
        await user.destroy({ force: true });
        cleaned++;
        console.log(`✅ Nettoyé: ${user.firstName} ${user.lastName}`);
      } catch (error) {
        console.error(`❌ Erreur pour ${user.firstName} ${user.lastName}:`, error.message);
      }
    }

    // 5. État final
    console.log(`\n🎯 Nettoyage terminé: ${cleaned}/${oldDeletedUsers.length} utilisateurs nettoyés\n`);
    
    const finalStats = await checkUserSynchronization();
    console.log(`📊 État après nettoyage: ${finalStats.active} actifs, ${finalStats.deleted} supprimés\n`);

  } catch (error) {
    console.error('💥 Erreur lors du nettoyage automatique:', error.message);
    process.exit(1);
  }
}

// Script principal
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    console.log(`
🧹 Script de Nettoyage Automatique

Usage:
  node auto-cleanup.js                    - Nettoyage automatique (silencieux)
  node auto-cleanup.js --interactive      - Nettoyage avec confirmation
  node auto-cleanup.js --dry-run          - Prévisualisation uniquement
  node auto-cleanup.js --help             - Afficher cette aide

Exemples:
  node auto-cleanup.js --interactive      # Demander confirmation
  node auto-cleanup.js --dry-run          # Voir ce qui serait supprimé
    `);
    return;
  }

  if (args.includes('--dry-run')) {
    console.log('🔍 Mode prévisualisation - aucune suppression ne sera effectuée\n');
    
    const stats = await checkUserSynchronization();
    
    if (stats.deleted > 0) {
      const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
      const oldDeletedUsers = await User.findAll({
        where: {
          deletedAt: {
            [Op.ne]: null,
            [Op.lte]: thirtyDaysAgo
          }
        },
        paranoid: false,
        attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email', 'deletedAt']
      });

      if (oldDeletedUsers.length > 0) {
        console.log(`📋 ${oldDeletedUsers.length} utilisateur(s) seraient nettoyés:`);
        oldDeletedUsers.forEach((user, index) => {
          const daysSince = Math.floor((Date.now() - new Date(user.deletedAt).getTime()) / (24 * 60 * 60 * 1000));
          console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.employeeId}) - supprimé il y a ${daysSince} jours`);
        });
      } else {
        console.log('✅ Aucun utilisateur ne serait nettoyé (tous récents)');
      }
    } else {
      console.log('✅ Aucun utilisateur supprimé dans la base');
    }
    return;
  }

  await autoCleanup();
  console.log('✨ Nettoyage automatique terminé avec succès !');
  process.exit(0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Erreur fatale:', error.message);
    process.exit(1);
  });
}

module.exports = { autoCleanup };