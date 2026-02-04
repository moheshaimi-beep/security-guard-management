const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });

  try {
    const [supervisors] = await conn.query(`
      SELECT id, firstName, lastName, cin, email, role
      FROM users
      WHERE role = 'supervisor' AND deletedAt IS NULL
    `);

    console.log('\n📋 Liste des responsables:\n');
    supervisors.forEach((s, idx) => {
      console.log(`${idx + 1}. ${s.firstName} ${s.lastName} (${s.cin})`);
      console.log(`   Email: ${s.email}`);
      console.log(`   ID: ${s.id}`);
      console.log('');
    });

    console.log(`Total: ${supervisors.length} responsable(s)\n`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await conn.end();
  }
})();
