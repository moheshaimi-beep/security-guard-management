const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });
  
  const agentId = 'b623e135-2be9-4976-9f96-7c1c61f07c5a';
  
  console.log('\n🔍 Vérification des affectations pour TAZI THAMI...\n');
  
  const [assignments] = await conn.query(`
    SELECT 
      a.id,
      a.agentId,
      a.eventId,
      a.zoneId,
      a.status,
      e.name as eventName,
      e.startDate,
      e.endDate,
      z.name as zoneName
    FROM assignments a
    LEFT JOIN events e ON a.eventId = e.id
    LEFT JOIN zones z ON a.zoneId = z.id
    WHERE a.agentId = ? AND a.deletedAt IS NULL
  `, [agentId]);
  
  if (assignments.length === 0) {
    console.log('❌ Aucune affectation trouvée pour cet agent!');
    console.log('\n💡 Cet agent a été créé mais n\'a pas été affecté à un événement.');
    console.log('   Solution: Affecter l\'agent à un événement via l\'interface d\'affectation.\n');
  } else {
    console.log(`✅ ${assignments.length} affectation(s) trouvée(s):\n`);
    assignments.forEach((assignment, idx) => {
      console.log(`${idx + 1}. Assignment ID: ${assignment.id}`);
      console.log(`   Événement: ${assignment.eventName || 'N/A'}`);
      console.log(`   Zone: ${assignment.zoneName || 'N/A'}`);
      console.log(`   Status: ${assignment.status}`);
      console.log(`   Dates: ${assignment.startDate} → ${assignment.endDate}`);
      console.log('');
    });
  }
  
  await conn.end();
})();
