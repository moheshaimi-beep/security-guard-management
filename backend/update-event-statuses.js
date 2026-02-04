/**
 * Script pour mettre à jour automatiquement les statuts des événements
 * Exécution: node update-event-statuses.js
 */

const { Event } = require('./src/models');
const { Op } = require('sequelize');

const updateEventStatuses = async () => {
  try {
    console.log('🔄 Mise à jour des statuts des événements...\n');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Récupérer tous les événements non annulés/terminés
    const events = await Event.findAll({
      where: {
        deletedAt: null,
        status: {
          [Op.notIn]: ['cancelled', 'terminated']
        }
      }
    });

    let updatedCount = 0;

    for (const event of events) {
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      let newStatus = null;

      // Événement passé -> completed
      if (endDate < today && event.status !== 'completed') {
        newStatus = 'completed';
      }
      // Événement en cours -> active
      else if (startDate <= today && endDate >= today && event.status !== 'active') {
        newStatus = 'active';
      }
      // Événement futur -> scheduled
      else if (startDate > today && event.status !== 'scheduled') {
        newStatus = 'scheduled';
      }

      if (newStatus) {
        await event.update({ status: newStatus });
        console.log(`✅ "${event.name}": ${event.status} → ${newStatus}`);
        updatedCount++;
      } else {
        console.log(`ℹ️  "${event.name}": ${event.status} (pas de changement)`);
      }
    }

    console.log(`\n✅ Terminé! ${updatedCount} événement(s) mis à jour sur ${events.length} total`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

updateEventStatuses();
