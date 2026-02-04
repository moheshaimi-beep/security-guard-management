const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });

  try {
    console.log('\n🔍 Recherche de tous les responsables...\n');
    
    // Récupérer tous les superviseurs
    const [supervisors] = await conn.query(`
      SELECT id, firstName, lastName, cin, role
      FROM users
      WHERE role = 'supervisor' AND deletedAt IS NULL
    `);

    console.log(`✅ ${supervisors.length} responsable(s) trouvé(s):\n`);
    supervisors.forEach((s, idx) => {
      console.log(`${idx + 1}. ${s.firstName} ${s.lastName} (${s.cin})`);
    });
    console.log('');

    let totalUpdates = 0;

    for (const supervisor of supervisors) {
      console.log(`\n📍 Traitement de ${supervisor.firstName} ${supervisor.lastName} (${supervisor.cin})...\n`);

      // Récupérer toutes les zones où ce superviseur a des affectations
      const [supervisorZones] = await conn.query(`
        SELECT DISTINCT z.id, z.name, z.supervisors, e.name as eventName
        FROM zones z
        LEFT JOIN events e ON z.eventId = e.id
        INNER JOIN assignments a ON a.zoneId = z.id
        WHERE a.agentId = ?
          AND a.deletedAt IS NULL
          AND z.deletedAt IS NULL
      `, [supervisor.id]);

      if (supervisorZones.length === 0) {
        console.log(`   ⚠️  Aucune zone trouvée via les affectations`);
        continue;
      }

      console.log(`   ✅ ${supervisorZones.length} zone(s) trouvée(s) via affectations:\n`);

      for (const zone of supervisorZones) {
        console.log(`   📌 Zone: ${zone.name} (${zone.eventName})`);

        // Parser les superviseurs existants (MySQL peut retourner un objet ou une chaîne)
        let supervisors = [];
        if (zone.supervisors) {
          if (typeof zone.supervisors === 'string') {
            try {
              supervisors = JSON.parse(zone.supervisors);
            } catch (e) {
              console.log(`      ⚠️  Supervisors JSON invalide (string), réinitialisation`);
              supervisors = [];
            }
          } else if (Array.isArray(zone.supervisors)) {
            supervisors = zone.supervisors;
          } else if (typeof zone.supervisors === 'object') {
            // Si c'est un objet, le convertir en array
            supervisors = Object.values(zone.supervisors);
          }
          
          if (!Array.isArray(supervisors)) {
            console.log(`      ⚠️  Supervisors n'est pas un tableau, réinitialisation`);
            supervisors = [];
          }
        }

        // Ajouter le superviseur s'il n'est pas déjà présent
        if (!supervisors.includes(supervisor.id)) {
          supervisors.push(supervisor.id);
          
          await conn.query(
            'UPDATE zones SET supervisors = ?, updatedAt = NOW() WHERE id = ?',
            [JSON.stringify(supervisors), zone.id]
          );
          
          console.log(`      ✅ Superviseur ajouté à la zone`);
          totalUpdates++;
        } else {
          console.log(`      ℹ️  Superviseur déjà assigné`);
        }
      }
    }

    console.log(`\n\n✅ Traitement terminé!`);
    console.log(`📊 Total des mises à jour: ${totalUpdates} zone(s)`);

    // Récapitulatif final
    console.log('\n\n📋 Récapitulatif final:\n');

    for (const supervisor of supervisors) {
      const [zones] = await conn.query(`
        SELECT 
          z.name as zoneName,
          e.name as eventName
        FROM zones z
        LEFT JOIN events e ON z.eventId = e.id
        WHERE z.deletedAt IS NULL
          AND JSON_CONTAINS(z.supervisors, ?)
        ORDER BY e.startDate DESC
      `, [JSON.stringify(supervisor.id)]);

      console.log(`👤 ${supervisor.firstName} ${supervisor.lastName} (${supervisor.cin})`);
      if (zones.length > 0) {
        console.log(`   ✅ ${zones.length} zone(s) gérée(s):`);
        zones.forEach(z => {
          console.log(`      - ${z.zoneName} (${z.eventName})`);
        });
      } else {
        console.log(`   ⚠️  Aucune zone gérée`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  } finally {
    await conn.end();
  }
})();
