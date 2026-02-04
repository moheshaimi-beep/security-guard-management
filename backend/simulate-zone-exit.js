const { sequelize } = require('./src/models');
const { QueryTypes } = require('sequelize');

async function simulateZoneExit() {
  try {
    console.log('🧪 Simulation de sortie de zone...\n');

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

    // 2. Récupérer un agent assigné à cet événement
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

    // 3. Vérifier la position actuelle
    const [currentPos] = await sequelize.query(
      `SELECT * FROM geo_tracking 
       WHERE user_id = :userId 
       AND event_id = :eventId 
       ORDER BY created_at DESC 
       LIMIT 1`,
      {
        replacements: { 
          userId: assignment.agentId,
          eventId: event.id 
        },
        type: QueryTypes.SELECT
      }
    );

    if (currentPos) {
      console.log(`📍 Position actuelle:`);
      console.log(`   GPS: (${currentPos.latitude}, ${currentPos.longitude})`);
      console.log(`   Dans la zone: ${currentPos.is_within_geofence ? 'OUI ✅' : 'NON ❌'}\n`);
    }

    // 4. Créer une nouvelle position HORS de la zone
    // Déplacer l'agent à ~600m au nord (environ 0.0054° de latitude)
    const newLatitude = parseFloat(event.latitude) + 0.0054;
    const newLongitude = parseFloat(event.longitude);
    
    // Calculer la distance approximative
    const R = 6371000; // Rayon de la Terre en mètres
    const lat1 = event.latitude * Math.PI / 180;
    const lat2 = newLatitude * Math.PI / 180;
    const deltaLat = (newLatitude - event.latitude) * Math.PI / 180;
    const deltaLon = (newLongitude - event.longitude) * Math.PI / 180;
    
    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    console.log(`🎯 Nouvelle position simulée:`);
    console.log(`   GPS: (${newLatitude}, ${newLongitude})`);
    console.log(`   Distance de l'événement: ${Math.round(distance)}m`);
    console.log(`   Hors zone: ${distance > (event.geoRadius || 100) ? 'OUI ✅' : 'NON ❌'}\n`);

    // 5. Insérer la nouvelle position
    await sequelize.query(
      `INSERT INTO geo_tracking 
       (id, user_id, event_id, latitude, longitude, accuracy, recorded_at, 
        speed, heading, battery_level, is_within_geofence, distance_from_event, created_at)
       VALUES 
       (UUID(), :userId, :eventId, :latitude, :longitude, 10, NOW(), 
        0, 0, 85, false, :distance, NOW())`,
      {
        replacements: {
          userId: assignment.agentId,
          eventId: event.id,
          latitude: newLatitude,
          longitude: newLongitude,
          distance: Math.round(distance)
        },
        type: QueryTypes.INSERT
      }
    );

    console.log('✅ Position hors zone créée avec succès!\n');
    console.log('📋 Instructions:');
    console.log('   1. Allez sur la page de tracking: http://localhost:3000/tracking');
    console.log('   2. Sélectionnez l\'événement "far vs wac"');
    console.log('   3. Cliquez sur "🔄 Rafraîchir maintenant"');
    console.log('   4. Une notification "🚨 Agent ... a quitté la zone" devrait apparaître!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
    process.exit(1);
  }
}

simulateZoneExit();
