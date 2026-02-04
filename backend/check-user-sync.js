/**
 * Script de diagnostic et correction de la synchronisation des utilisateurs
 * Ce script vérifie les utilisateurs supprimés et leur état dans l'interface web
 */

const { User } = require('./src/models');
const { Op } = require('sequelize');

async function checkUserSynchronization() {
  try {
    console.log('🔍 Vérification de la synchronisation des utilisateurs...\n');

    // 1. Compter tous les utilisateurs (incluant supprimés)
    const totalUsers = await User.count({ paranoid: false });
    console.log(`📊 Total utilisateurs dans la base : ${totalUsers}`);

    // 2. Compter les utilisateurs actifs
    const activeUsers = await User.count({ paranoid: true });
    console.log(`✅ Utilisateurs actifs : ${activeUsers}`);

    // 3. Compter les utilisateurs supprimés
    const deletedUsers = await User.count({
      where: { deletedAt: { [Op.ne]: null } },
      paranoid: false
    });
    console.log(`❌ Utilisateurs supprimés : ${deletedUsers}\n`);

    if (deletedUsers > 0) {
      console.log('🗑️  Détail des utilisateurs supprimés :');
      const deletedList = await User.findAll({
        where: { deletedAt: { [Op.ne]: null } },
        paranoid: false,
        attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email', 'deletedAt'],
        order: [['deletedAt', 'DESC']]
      });

      deletedList.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.employeeId})`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Supprimé le: ${user.deletedAt}`);
        console.log(`      ID: ${user.id}\n`);
      });
    }

    // 4. Vérifier les utilisateurs récemment supprimés (dernières 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentlyDeleted = await User.count({
      where: { 
        deletedAt: { 
          [Op.ne]: null,
          [Op.gte]: oneDayAgo 
        } 
      },
      paranoid: false
    });

    console.log(`⏰ Utilisateurs supprimés dans les dernières 24h : ${recentlyDeleted}`);

    return {
      total: totalUsers,
      active: activeUsers,
      deleted: deletedUsers,
      recentlyDeleted
    };

  } catch (error) {
    console.error('❌ Erreur lors de la vérification :', error.message);
    throw error;
  }
}

async function forceHardDelete(userId) {
  try {
    console.log(`🔧 Suppression définitive de l'utilisateur ${userId}...`);

    const user = await User.findByPk(userId, { paranoid: false });
    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return false;
    }

    console.log(`👤 Utilisateur trouvé : ${user.firstName} ${user.lastName} (${user.employeeId})`);
    
    if (!user.deletedAt) {
      console.log('⚠️  Cet utilisateur n\'est pas marqué comme supprimé');
      return false;
    }

    // Suppression définitive
    await user.destroy({ force: true });
    console.log('✅ Utilisateur supprimé définitivement de la base de données');
    return true;

  } catch (error) {
    console.error('❌ Erreur lors de la suppression définitive :', error.message);
    throw error;
  }
}

async function restoreUser(userId) {
  try {
    console.log(`🔄 Restauration de l'utilisateur ${userId}...`);

    const user = await User.findByPk(userId, { paranoid: false });
    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return false;
    }

    if (!user.deletedAt) {
      console.log('⚠️  Cet utilisateur n\'est pas supprimé');
      return false;
    }

    // Restauration
    await user.restore();
    console.log(`✅ Utilisateur ${user.firstName} ${user.lastName} restauré`);
    return true;

  } catch (error) {
    console.error('❌ Erreur lors de la restauration :', error.message);
    throw error;
  }
}

// Script principal
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const userId = args[1];

  try {
    switch (command) {
      case 'check':
        await checkUserSynchronization();
        break;

      case 'hard-delete':
        if (!userId) {
          console.log('❌ Veuillez fournir l\'ID de l\'utilisateur à supprimer définitivement');
          process.exit(1);
        }
        await forceHardDelete(userId);
        break;

      case 'restore':
        if (!userId) {
          console.log('❌ Veuillez fournir l\'ID de l\'utilisateur à restaurer');
          process.exit(1);
        }
        await restoreUser(userId);
        break;

      default:
        console.log(`
🛠️  Script de synchronisation des utilisateurs

Usage:
  node check-user-sync.js check                    - Vérifier l'état de synchronisation
  node check-user-sync.js hard-delete <userId>     - Supprimer définitivement un utilisateur
  node check-user-sync.js restore <userId>         - Restaurer un utilisateur supprimé

Examples:
  node check-user-sync.js check
  node check-user-sync.js hard-delete 12345-abcd-6789-efgh
  node check-user-sync.js restore 12345-abcd-6789-efgh
        `);
    }
    
    console.log('\n🎯 Synchronisation terminée !');
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
  checkUserSynchronization,
  forceHardDelete,
  restoreUser
};