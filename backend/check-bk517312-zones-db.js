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

    console.log('\n📍 Zones gérées par BK517312:\n');
    
    // Récupérer toutes les zones où le superviseur est dans le tableau supervisors
    const [zones] = await conn.query(`
      SELECT 
        z.id,
        z.name as zoneName,
        z.supervisors,
        e.id as eventId,
        e.name as eventName,
        e.status as eventStatus,
        e.startDate,
        e.endDate
      FROM zones z
      LEFT JOIN events e ON z.eventId = e.id
      WHERE z.deletedAt IS NULL
        AND JSON_CONTAINS(z.supervisors, ?)
      ORDER BY e.startDate DESC
    `, [JSON.stringify(supervisorId)]);

    console.log(`✅ ${zones.length} zone(s) trouvée(s):\n`);

    if (zones.length === 0) {
      console.log('⚠️ Aucune zone trouvée pour ce superviseur');
      console.log('\nVérifions toutes les zones:');
      
      const [allZones] = await conn.query(`
        SELECT 
          z.id,
          z.name,
          z.supervisors,
          e.name as eventName
        FROM zones z
        LEFT JOIN events e ON z.eventId = e.id
        WHERE z.deletedAt IS NULL
        LIMIT 10
      `);
      
      allZones.forEach(z => {
        console.log(`  Zone: ${z.name} (${z.eventName})`);
        console.log(`    Supervisors JSON: ${z.supervisors}`);
        console.log('');
      });
    } else {
      // Grouper par événement
      const eventMap = {};
      zones.forEach(z => {
        if (!eventMap[z.eventId]) {
          eventMap[z.eventId] = {
            eventName: z.eventName,
            eventStatus: z.eventStatus,
            startDate: z.startDate,
            endDate: z.endDate,
            zones: []
          };
        }
        eventMap[z.eventId].zones.push(z.zoneName);
      });

      Object.values(eventMap).forEach((event, idx) => {
        console.log(`${idx + 1}. ${event.eventName} (${event.eventStatus})`);
        console.log(`   Dates: ${event.startDate?.toISOString().split('T')[0]} → ${event.endDate?.toISOString().split('T')[0]}`);
        console.log(`   Zones (${event.zones.length}):`);
        event.zones.forEach(z => console.log(`      - ${z}`));
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await conn.end();
  }
})();
