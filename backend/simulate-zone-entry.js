const { sequelize } = require('./src/models');
const { QueryTypes } = require('sequelize');

async function simulateZoneEntry() {
  try {
    console.log('🧪 Simulation d\'entrée dans la zone...\n');

    // 1. Récupérer l'événement "far vs wac"
    const [event] = await sequelize.query(
      `SELECT id, name, latitude, longitude, geoRadius 
       FROM events 
       WHERE name LIKE '%far%wac%' 
       ORDER BY createdAt DESC 
       LIMIT 1`,
      { type: QueryTypes.SELECT }
    );

    if (!event) {
      console.log('❌ Événement "far vs wac" non trouvé');
      process.exit(1);
    }

    console.log(`✅ Événement trouvé: ${event.name}`);
    console.log(`   GPS: (${event.latitude}, ${event.longitude})`);
    console.log(`   Rayon: ${event.geoRadius || 100}m\n`);

    // 2. Récupérer l'agent "tata titi"
    const [assignment] = await sequelize.query(
      `SELECT a.*, u.firstName, u.lastName 
       FROM assignments a
       JOIN users u ON a.agentId = u.id
       WHERE a.eventId = :eventId 
       AND a.status = 'confirmed'
       LIMIT 1`,
      { 
        replacements: { eventId: event.id },
        type: QueryTypes.SELECT 
      }
    );

    if (!assignment) {
      console.log('❌ Aucun agent assigné à cet événement');
      process.exit(1);
    }

    console.log(`✅ Agent trouvé: ${assignment.firstName} ${assignment.lastName}`);
    console.log(`   Agent ID: ${assignment.agentId}\n`);

    // 3. Créer une position DANS la zone (exactement au centre)
    const latitude = parseFloat(event.latitude);
    const longitude = parseFloat(event.longitude);

    console.log(`🎯 Position DANS la zone:`);
    console.log(`   GPS: (${latitude}, ${longitude})`);
    console.log(`   Distance: 0m`);
    console.log(`   Dans la zone: OUI ✅\n`);

    // 4. Insérer la nouvelle position
    await sequelize.query(
      `INSERT INTO geo_tracking 
       (id, user_id, event_id, latitude, longitude, accuracy, recorded_at, 
        speed, heading, battery_level, is_within_geofence, distance_from_event, created_at)
       VALUES 
       (UUID(), :userId, :eventId, :latitude, :longitude, 10, NOW(), 
        0, 0, 85, true, 0, NOW())`,
      {
        replacements: {
          userId: assignment.agentId,
          eventId: event.id,
          latitude: latitude,
          longitude: longitude
        },
        type: QueryTypes.INSERT
      }
    );

    console.log('✅ Position DANS la zone créée avec succès!\n');
    console.log('📋 Prochaines étapes:');
    console.log('   1. Allez sur http://localhost:3000/tracking');
    console.log('   2. Sélectionnez "far vs wac"');
    console.log('   3. Cliquez "🔄 Rafraîchir maintenant" (1er fois)');
    console.log('   4. Attendez 5 secondes');
    console.log('   5. Exécutez: node simulate-zone-exit.js');
    console.log('   6. Cliquez "🔄 Rafraîchir maintenant" (2ème fois)');
    console.log('   7. La notification devrait apparaître! 🚨\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
    process.exit(1);
  }
}

simulateZoneEntry();
