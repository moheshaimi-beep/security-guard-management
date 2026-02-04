const { sequelize } = require('./src/models');
const { QueryTypes } = require('sequelize');

async function checkPositions() {
  try {
    console.log('🔍 Vérification des positions de tata titi...\n');

    // Récupérer toutes les positions récentes
    const positions = await sequelize.query(
      `SELECT 
        id,
        user_id,
        latitude,
        longitude,
        is_within_geofence,
        distance_from_event,
        recorded_at,
        created_at
       FROM geo_tracking 
       WHERE user_id = 'aa934af0-6a5f-4f9f-9c19-0abb5398169e'
       ORDER BY recorded_at DESC
       LIMIT 10`,
      { type: QueryTypes.SELECT }
    );

    console.log(`📊 ${positions.length} position(s) trouvée(s):\n`);
    
    positions.forEach((pos, index) => {
      console.log(`${index + 1}. ${pos.is_within_geofence ? '✅ DANS' : '❌ HORS'} zone`);
      console.log(`   GPS: (${pos.latitude}, ${pos.longitude})`);
      console.log(`   Distance: ${pos.distance_from_event}m`);
      console.log(`   recorded_at: ${pos.recorded_at}`);
      console.log(`   created_at: ${pos.created_at}\n`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

checkPositions();
