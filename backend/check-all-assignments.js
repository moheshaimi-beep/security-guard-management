const mysql = require('mysql2/promise');

async function checkAllAssignments() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });

  try {
    const eventId = '93af38ef-484d-4459-a8d4-06d20593f944';
    
    console.log('📊 Checking ALL assignments (including soft-deleted) for event:', eventId);
    console.log('');
    
    // Query WITHOUT deletedAt filter
    const [rows] = await connection.execute(
      `SELECT id, agentId, eventId, zoneId, role, status, deletedAt, createdAt, updatedAt 
       FROM assignments 
       WHERE eventId = ?
       ORDER BY createdAt DESC`,
      [eventId]
    );

    console.log('Total assignments found:', rows.length);
    console.log('');

    if (rows.length === 0) {
      console.log('❌ No assignments found at all!');
    } else {
      rows.forEach((assignment, index) => {
        console.log(`${index + 1}. Assignment ID: ${assignment.id}`);
        console.log(`   Agent: ${assignment.agentId}`);
        console.log(`   Role: ${assignment.role}`);
        console.log(`   Status: ${assignment.status}`);
        console.log(`   Zone: ${assignment.zoneId}`);
        console.log(`   deletedAt: ${assignment.deletedAt || 'NULL (active)'}`);
        console.log(`   Created: ${assignment.createdAt}`);
        console.log(`   Updated: ${assignment.updatedAt}`);
        console.log('');
      });
    }

    // Also check the unique constraint
    console.log('🔍 Checking unique constraint...');
    const [constraints] = await connection.execute(
      `SHOW CREATE TABLE assignments`
    );
    
    console.log('');
    console.log('Table definition includes:');
    const createTable = constraints[0]['Create Table'];
    const uniqueConstraints = createTable.match(/UNIQUE KEY[^,]+/g);
    if (uniqueConstraints) {
      uniqueConstraints.forEach(constraint => {
        console.log('  -', constraint);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkAllAssignments();
