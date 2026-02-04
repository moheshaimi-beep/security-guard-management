const mysql = require('mysql2/promise');

async function checkTables() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });

  try {
    const [tables] = await conn.query('SHOW TABLES');
    console.log('Tables dans la base de données:\n');
    tables.forEach(t => {
      console.log('-', Object.values(t)[0]);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await conn.end();
  }
}

checkTables();
