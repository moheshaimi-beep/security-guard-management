/**
 * Scheduler pour les tâches automatiques
 * - Mise à jour des statuts d'événements toutes les 5 minutes
 * - Garantit que les statuts sont toujours à jour en temps réel
 */

const cron = require('node-cron');
const { Event } = require('./models');
const { Op } = require('sequelize');
const { computeEventStatus, combineDateAndTime } = require('./utils/eventHelpers');

/**
 * Met à jour automatiquement les statuts des événements
 */
const updateEventStatuses = async () => {
  try {
    console.log('🔄 [CRON] Mise à jour automatique des statuts d\'événements...');

    const events = await Event.findAll({
      where: {
        deletedAt: null,
        status: {
          [Op.notIn]: ['cancelled', 'terminated']
        }
      }
    });

    let completed = 0;
    let activated = 0;

    for (const event of events) {
      const newStatus = computeEventStatus(event);

      // Mettre à jour si le statut a changé (completed, active, ou scheduled)
      if (newStatus !== event.status) {
        await event.update({ status: newStatus });
        console.log(`   ✅ "${event.name}" → ${newStatus}`);
        
        if (newStatus === 'completed') completed++;
        if (newStatus === 'active') activated++;
      }
    }

    console.log(`✅ [CRON] Terminé: ${completed} complétés, ${activated} activés`);
  } catch (error) {
    console.error('❌ [CRON] Erreur lors de la mise à jour des statuts:', error);
  }
};

/**
 * Démarre le scheduler
 */
const startScheduler = () => {
  // Exécution toutes les 5 minutes pour maintenir les statuts à jour
  cron.schedule('*/5 * * * *', async () => {
    await updateEventStatuses();
  });

  console.log('⏰ Scheduler démarré: mise à jour des statuts d\'événements toutes les 5 minutes');

  // Exécution immédiate au démarrage du serveur
  updateEventStatuses();
};

module.exports = { startScheduler, updateEventStatuses };
