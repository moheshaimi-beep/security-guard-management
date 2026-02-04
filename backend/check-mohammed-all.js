const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });
  
  const agentId = 'd468e666-3f09-41f9-a16d-6e5e0700ddef';
  
  console.log('\n🔍 Vérification de TOUTES les affectations (même supprimées)...\n');
  
  const [all] = await conn.query(`
    SELECT 
      a.*,
      e.name as eventName,
      z.name as zoneName
    FROM assignments a
    LEFT JOIN events e ON a.eventId = e.id
    LEFT JOIN zones z ON a.zoneId = z.id
    WHERE a.agentId = ?
  `, [agentId]);
  
  console.log(`📊 Total: ${all.length} affectation(s) trouvée(s)\n`);
  
  if (all.length === 0) {
    console.log('❌ Aucune affectation (ni active ni supprimée)\n');
  } else {
    all.forEach((a, idx) => {
      console.log(`${idx + 1}. ${a.eventName} / ${a.zoneName}`);
      console.log(`   ID: ${a.id}`);
      console.log(`   Status: ${a.status}`);
      console.log(`   DeletedAt: ${a.deletedAt || 'NULL (active)'}`);
      console.log('');
    });
  }
  
  await conn.end();
})();
