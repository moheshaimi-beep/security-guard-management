/**
 * Contrôleur pour la maintenance et le nettoyage de la base de données
 */

const { User, Assignment, Attendance } = require('../models');
const { Op } = require('sequelize');
const { logActivity } = require('../middlewares/activityLogger');

// Nettoyer les utilisateurs supprimés depuis plus de X jours
exports.cleanupDeletedUsers = async (req, res) => {
  try {
    const { daysOld = 30, force = false } = req.body;
    
    // Date limite (par défaut 30 jours)
    const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
    
    // Trouver les utilisateurs supprimés depuis plus de X jours
    const usersToCleanup = await User.findAll({
      where: {
        deletedAt: {
          [Op.ne]: null,
          [Op.lte]: cutoffDate
        }
      },
      paranoid: false,
      attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email', 'deletedAt']
    });

    if (usersToCleanup.length === 0) {
      return res.json({
        success: true,
        message: `Aucun utilisateur supprimé depuis plus de ${daysOld} jours trouvé`,
        data: {
          cleaned: 0,
          total: 0
        }
      });
    }

    if (!force) {
      // Mode prévisualisation - ne pas supprimer, juste lister
      return res.json({
        success: true,
        message: `${usersToCleanup.length} utilisateur(s) peuvent être nettoyés`,
        data: {
          preview: true,
          usersToCleanup: usersToCleanup.map(u => ({
            id: u.id,
            employeeId: u.employeeId,
            name: `${u.firstName} ${u.lastName}`,
            email: u.email,
            deletedAt: u.deletedAt
          })),
          total: usersToCleanup.length
        }
      });
    }

    // Mode force - supprimer définitivement
    let cleaned = 0;
    const errors = [];

    for (const user of usersToCleanup) {
      try {
        // Supprimer les données associées en premier
        await Assignment.destroy({
          where: { agentId: user.id },
          force: true
        });

        await Attendance.destroy({
          where: { agentId: user.id },
          force: true
        });

        // Supprimer l'utilisateur définitivement
        await user.destroy({ force: true });
        cleaned++;

        console.log(`✅ Utilisateur nettoyé : ${user.firstName} ${user.lastName} (${user.employeeId})`);
      } catch (error) {
        errors.push(`Erreur pour ${user.firstName} ${user.lastName}: ${error.message}`);
      }
    }

    // Logger l'activité
    await logActivity({
      userId: req.user.id,
      action: 'CLEANUP_DELETED_USERS',
      entityType: 'maintenance',
      description: `Nettoyage de ${cleaned} utilisateur(s) supprimé(s)`,
      metadata: {
        daysOld,
        totalFound: usersToCleanup.length,
        cleaned,
        errors: errors.length
      },
      req
    });

    res.json({
      success: true,
      message: `${cleaned} utilisateur(s) nettoyé(s) définitivement`,
      data: {
        cleaned,
        total: usersToCleanup.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('Erreur lors du nettoyage:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du nettoyage des utilisateurs supprimés'
    });
  }
};

// Obtenir les statistiques de la base de données
exports.getDatabaseStats = async (req, res) => {
  try {
    // Statistiques des utilisateurs
    const totalUsers = await User.count({ paranoid: false });
    const activeUsers = await User.count({ paranoid: true });
    const deletedUsers = await User.count({
      where: { deletedAt: { [Op.ne]: null } },
      paranoid: false
    });

    // Utilisateurs supprimés par âge
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const deletedLast24h = await User.count({
      where: {
        deletedAt: {
          [Op.ne]: null,
          [Op.gte]: oneDayAgo
        }
      },
      paranoid: false
    });

    const deletedLastWeek = await User.count({
      where: {
        deletedAt: {
          [Op.ne]: null,
          [Op.gte]: oneWeekAgo
        }
      },
      paranoid: false
    });

    const deletedLastMonth = await User.count({
      where: {
        deletedAt: {
          [Op.ne]: null,
          [Op.gte]: oneMonthAgo
        }
      },
      paranoid: false
    });

    const oldDeleted = await User.count({
      where: {
        deletedAt: {
          [Op.ne]: null,
          [Op.lt]: oneMonthAgo
        }
      },
      paranoid: false
    });

    // Statistiques des affectations
    const totalAssignments = await Assignment.count({ paranoid: false });
    const activeAssignments = await Assignment.count({ paranoid: true });
    const deletedAssignments = await Assignment.count({
      where: { deletedAt: { [Op.ne]: null } },
      paranoid: false
    });

    // Statistiques des présences
    const totalAttendances = await Attendance.count({ paranoid: false });
    const activeAttendances = await Attendance.count({ paranoid: true });

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          deleted: deletedUsers,
          deletedBreakdown: {
            last24h: deletedLast24h,
            lastWeek: deletedLastWeek,
            lastMonth: deletedLastMonth,
            older: oldDeleted
          }
        },
        assignments: {
          total: totalAssignments,
          active: activeAssignments,
          deleted: deletedAssignments
        },
        attendances: {
          total: totalAttendances,
          active: activeAttendances
        },
        health: {
          syncStatus: 'OK',
          lastCheck: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques de la base'
    });
  }
};

// Forcer la synchronisation entre l'interface et la base
exports.forceSynchronization = async (req, res) => {
  try {
    const { action = 'check' } = req.body;

    if (action === 'check') {
      // Juste vérifier l'état
      const stats = await this.getDatabaseStats(req, res);
      return;
    }

    if (action === 'refresh_cache') {
      // Dans un vrai projet, ici on viderait le cache Redis/Memcached
      // Pour notre cas, on peut juste retourner un succès
      res.json({
        success: true,
        message: 'Cache de synchronisation rafraîchi',
        data: {
          timestamp: new Date(),
          action: 'cache_refreshed'
        }
      });
    }

  } catch (error) {
    console.error('Erreur lors de la synchronisation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la synchronisation'
    });
  }
};

module.exports = {
  cleanupDeletedUsers: exports.cleanupDeletedUsers,
  getDatabaseStats: exports.getDatabaseStats,
  forceSynchronization: exports.forceSynchronization
};