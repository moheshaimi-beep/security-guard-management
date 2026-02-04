const mysql = require('mysql2/promise');

async function listAgents() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });

  try {
    const [agents] = await conn.query(`
      SELECT id, firstName, lastName, email, cin 
      FROM users 
      WHERE role = "agent" 
      ORDER BY createdAt DESC
    `);

    console.log('\n👥 AGENTS DISPONIBLES POUR SE CONNECTER:\n');
    agents.forEach((a, i) => {
      console.log(`${i+1}. Email: ${a.email}`);
      console.log(`   Nom: ${a.firstName} ${a.lastName}`);
      console.log(`   CIN: ${a.cin || 'N/A'}`);
      console.log(`   ID: ${a.id}`);
      console.log();
    });

    // Check assignments
    const [assignments] = await conn.query(`
      SELECT u.email, u.firstName, u.lastName, COUNT(*) as count
      FROM assignments a
      JOIN users u ON u.id = a.agentId
      WHERE a.status = 'confirmed'
      AND u.role = 'agent'
      GROUP BY u.id
    `);

    console.log('📋 AGENTS AVEC AFFECTATIONS CONFIRMÉES:\n');
    assignments.forEach(a => {
      console.log(`✅ ${a.firstName} ${a.lastName} (${a.email}) - ${a.count} affectation(s)`);
    });

    console.log('\n⚠️ IMPORTANT: Vous devez vous connecter avec un de ces comptes AGENT');
    console.log('   (pas avec le compte Admin)\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await conn.end();
  }
}

listAgents();
