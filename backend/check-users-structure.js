const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });
  
  const [cols] = await conn.query('DESCRIBE users');
  console.log('\n📋 Colonnes de la table users:\n');
  cols.forEach(c => {
    console.log(`   ${c.Field.padEnd(25)} ${c.Type.padEnd(20)} ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
  });
  
  const [agents] = await conn.query(`
    SELECT id, employeeId, firstName, lastName, role, supervisorId, createdByType
    FROM users 
    WHERE lastName LIKE '%THAMI%'
    LIMIT 5
  `);
  
  console.log('\n🔍 Agents THAMI trouvés:\n');
  agents.forEach(agent => {
    console.log(`   ID: ${agent.id}`);
    console.log(`   Nom: ${agent.firstName} ${agent.lastName}`);
    console.log(`   Employee ID: ${agent.employeeId}`);
    console.log(`   Rôle: ${agent.role}`);
    console.log(`   Superviseur ID: ${agent.supervisorId}`);
    console.log(`   Type de création: ${agent.createdByType}`);
    console.log('');
  });
  
  await conn.end();
})();
