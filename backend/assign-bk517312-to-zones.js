const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });

  try {
    const supervisorId = '3ae0b39b-81aa-4ed6-99e7-4a49814942fd'; // BK517312
    const zoneNames = ['a1', 'a2', 'a3'];

    console.log('\n🔧 Assignation de BK517312 comme superviseur aux zones a1, a2, a3...\n');

    for (const zoneName of zoneNames) {
      // Récupérer la zone
      const [zones] = await conn.query(
        'SELECT id, name, supervisors FROM zones WHERE name = ? AND deletedAt IS NULL',
        [zoneName]
      );

      if (zones.length === 0) {
        console.log(`❌ Zone "${zoneName}" non trouvée`);
        continue;
      }

      const zone = zones[0];
      console.log(`📍 Zone trouvée: ${zone.name} (${zone.id})`);

      // Créer ou mettre à jour le tableau de superviseurs
      let supervisors = [];
      if (zone.supervisors) {
        try {
          supervisors = JSON.parse(zone.supervisors);
        } catch (e) {
          console.log(`   ⚠️  Supervisors JSON invalide, réinitialisation`);
          supervisors = [];
        }
      }

      // Ajouter le superviseur s'il n'est pas déjà présent
      if (!supervisors.includes(supervisorId)) {
        supervisors.push(supervisorId);
        
        await conn.query(
          'UPDATE zones SET supervisors = ?, updatedAt = NOW() WHERE id = ?',
          [JSON.stringify(supervisors), zone.id]
        );
        
        console.log(`   ✅ Superviseur BK517312 ajouté`);
      } else {
        console.log(`   ℹ️  Superviseur BK517312 déjà assigné`);
      }
    }

    console.log('\n✅ Assignation terminée!\n');

    // Vérifier les résultats
    console.log('🔍 Vérification des zones mises à jour:\n');
    
    const [updatedZones] = await conn.query(`
      SELECT 
        z.name as zoneName,
        z.supervisors,
        e.name as eventName
      FROM zones z
      LEFT JOIN events e ON z.eventId = e.id
      WHERE z.name IN (?, ?, ?)
        AND z.deletedAt IS NULL
    `, zoneNames);

    updatedZones.forEach(z => {
      console.log(`Zone: ${z.zoneName} (${z.eventName})`);
      console.log(`  Supervisors: ${z.supervisors}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await conn.end();
  }
})();
