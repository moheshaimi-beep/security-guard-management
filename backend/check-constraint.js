const mysql = require('mysql2/promise');

async function checkConstraint() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });

  try {
    console.log('🔍 Checking assignments table unique constraint definition...\n');
    
    // Get full table definition
    const [result] = await connection.execute('SHOW CREATE TABLE assignments');
    const createTableSQL = result[0]['Create Table'];
    
    console.log('Full CREATE TABLE statement:\n');
    console.log(createTableSQL);
    console.log('\n');
    
    // Extract unique constraints
    const lines = createTableSQL.split('\n');
    const uniqueLines = lines.filter(line => line.includes('UNIQUE'));
    
    console.log('Unique constraints found:');
    uniqueLines.forEach(line => {
      console.log(line.trim());
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkConstraint();
