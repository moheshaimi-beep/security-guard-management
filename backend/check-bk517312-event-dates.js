const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });

  try {
    const supervisorId = '3ae0b39b-81aa-4ed6-99e7-4a49814942fd';
    const now = new Date();
    
    console.log('\n⏰ Heure actuelle:', now.toISOString());
    console.log('');

    const [events] = await conn.query(`
      SELECT 
        e.id, 
        e.name, 
        e.startDate,
        e.endDate, 
        e.checkInTime,
        e.checkOutTime,
        e.status,
        CONCAT(e.endDate, ' ', IFNULL(e.checkOutTime, '23:59:59')) as endDateTime,
        DATE_ADD(
          CONCAT(e.endDate, ' ', IFNULL(e.checkOutTime, '23:59:59')), 
          INTERVAL 2 HOUR
        ) as endPlus2h
      FROM events e
      INNER JOIN zones z ON e.id = z.eventId
      WHERE JSON_CONTAINS(z.supervisors, ?)
        AND e.deletedAt IS NULL
        AND z.deletedAt IS NULL
    `, [JSON.stringify(supervisorId)]);

    console.log(`📅 Événements trouvés pour BK517312: ${events.length}\n`);

    events.forEach((e, idx) => {
      console.log(`${idx + 1}. ${e.name} (${e.status})`);
      console.log(`   Start: ${e.startDate} ${e.checkInTime}`);
      console.log(`   End: ${e.endDateTime}`);
      console.log(`   End+2h: ${e.endPlus2h}`);
      console.log(`   Should display? ${e.endPlus2h >= now ? '✅ OUI' : '❌ NON'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await conn.end();
  }
})();
