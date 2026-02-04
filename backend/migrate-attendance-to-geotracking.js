/**
 * Script de migration : Copier les positions GPS des pointages (attendance)
 * vers la table GeoTracking pour le suivi en temps réel sur la carte
 */

const { Attendance, GeoTracking, sequelize } = require('./src/models');
const { Op } = require('sequelize');

async function migrateAttendanceToGeoTracking() {
  try {
    console.log('🚀 Démarrage de la migration des positions GPS...\n');

    // Récupérer tous les pointages avec coordonnées GPS
    const attendances = await Attendance.findAll({
      where: {
        checkInLatitude: { [Op.ne]: null },
        checkInLongitude: { [Op.ne]: null },
        checkInTime: { [Op.ne]: null }
      },
      order: [['checkInTime', 'DESC']],
      attributes: [
        'id',
        'agentId',
        'eventId',
        'checkInLatitude',
        'checkInLongitude',
        'checkInTime',
        'isWithinGeofence',
        'distanceFromLocation'
      ]
    });

    console.log(`📊 ${attendances.length} pointage(s) trouvé(s) avec coordonnées GPS\n`);

    if (attendances.length === 0) {
      console.log('⚠️ Aucun pointage avec GPS à migrer');
      return;
    }

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const attendance of attendances) {
      try {
        // Vérifier si une entrée existe déjà pour cet agent/événement/temps
        const existing = await GeoTracking.findOne({
          where: {
            userId: attendance.agentId,
            eventId: attendance.eventId,
            recordedAt: attendance.checkInTime
          }
        });

        if (existing) {
          console.log(`⏭️  Position déjà existante pour agent ${attendance.agentId} à ${attendance.checkInTime}`);
          skipped++;
          continue;
        }

        // Créer l'entrée GeoTracking
        await GeoTracking.create({
          userId: attendance.agentId,
          eventId: attendance.eventId,
          latitude: parseFloat(attendance.checkInLatitude),
          longitude: parseFloat(attendance.checkInLongitude),
          isWithinGeofence: attendance.isWithinGeofence !== null ? attendance.isWithinGeofence : true,
          distanceFromEvent: attendance.distanceFromLocation,
          recordedAt: attendance.checkInTime,
          createdAt: attendance.checkInTime
        });

        migrated++;
        console.log(`✅ Position migrée pour agent ${attendance.agentId} - Événement ${attendance.eventId}`);
        console.log(`   GPS: (${attendance.checkInLatitude}, ${attendance.checkInLongitude})`);
        console.log(`   Zone: ${attendance.isWithinGeofence ? 'Dans zone' : 'Hors zone'} - Distance: ${attendance.distanceFromLocation}m\n`);

      } catch (err) {
        errors++;
        console.error(`❌ Erreur pour attendance ${attendance.id}:`, err.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 RÉSUMÉ DE LA MIGRATION:');
    console.log('='.repeat(60));
    console.log(`✅ Positions migrées:  ${migrated}`);
    console.log(`⏭️  Positions ignorées:  ${skipped}`);
    console.log(`❌ Erreurs:            ${errors}`);
    console.log(`📊 Total traité:       ${attendances.length}`);
    console.log('='.repeat(60) + '\n');

    // Afficher les dernières positions créées
    if (migrated > 0) {
      const recentPositions = await GeoTracking.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [{
          model: require('./src/models').User,
          as: 'user',
          attributes: ['id', 'employeeId', 'firstName', 'lastName']
        }]
      });

      console.log('📍 Dernières positions dans GeoTracking:');
      console.log('='.repeat(60));
      recentPositions.forEach((pos, idx) => {
        console.log(`${idx + 1}. Agent: ${pos.user?.firstName} ${pos.user?.lastName} (${pos.user?.employeeId})`);
        console.log(`   GPS: (${pos.latitude}, ${pos.longitude})`);
        console.log(`   Date: ${pos.recordedAt}`);
        console.log(`   Zone: ${pos.isWithinGeofence ? '✅ Dans zone' : '⚠️ Hors zone'}\n`);
      });
    }

  } catch (error) {
    console.error('💥 Erreur fatale:', error);
    throw error;
  } finally {
    await sequelize.close();
    console.log('🔒 Connexion fermée');
  }
}

// Exécuter la migration
migrateAttendanceToGeoTracking()
  .then(() => {
    console.log('✅ Migration terminée avec succès!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Migration échouée:', error);
    process.exit(1);
  });
