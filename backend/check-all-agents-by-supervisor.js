const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });
  
  const supervisorId = '3ae0b39b-81aa-4ed6-99e7-4a49814942fd'; // youssef
  
  console.log('\n🔍 Agents créés par le superviseur youssef:\n');
  
  const [agents] = await conn.query(`
    SELECT 
      id, 
      employeeId, 
      firstName, 
      lastName, 
      role,
      createdByType,
      createdAt
    FROM users
    WHERE supervisorId = ? AND deletedAt IS NULL
    ORDER BY createdAt DESC
  `, [supervisorId]);
  
  console.log(`📊 Total: ${agents.length} agent(s) créé(s)\n`);
  
  for (const agent of agents) {
    console.log(`👤 ${agent.firstName} ${agent.lastName} (${agent.employeeId})`);
    console.log(`   ID: ${agent.id}`);
    console.log(`   Type: ${agent.createdByType}`);
    console.log(`   Créé: ${agent.createdAt}`);
    
    // Check assignments
    const [assignments] = await conn.query(`
      SELECT 
        a.id,
        a.status,
        e.name as eventName,
        z.name as zoneName
      FROM assignments a
      LEFT JOIN events e ON a.eventId = e.id
      LEFT JOIN zones z ON a.zoneId = z.id
      WHERE a.agentId = ? AND a.deletedAt IS NULL
    `, [agent.id]);
    
    if (assignments.length > 0) {
      console.log(`   ✅ Affectations: ${assignments.length}`);
      assignments.forEach(a => {
        console.log(`      - ${a.eventName} / ${a.zoneName} (${a.status})`);
      });
    } else {
      console.log(`   ❌ Aucune affectation`);
    }
    console.log('');
  }
  
  await conn.end();
})();
