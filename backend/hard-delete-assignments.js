const mysql = require('mysql2/promise');

async function hardDeleteAssignments() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });

  try {
    const assignmentIds = [
      'e3d79a27-af9e-480a-90e1-89e32c14869e',  // Agent d468e666
      'e8c71b88-ceae-4907-b3c5-964d418e3661'   // Supervisor 3ae0b39b
    ];
    
    console.log('🗑️  Hard deleting soft-deleted assignments...\n');
    
    for (const id of assignmentIds) {
      const [result] = await connection.execute(
        'DELETE FROM assignments WHERE id = ?',
        [id]
      );
      console.log(`✅ Deleted assignment ${id} (affected: ${result.affectedRows} row)`);
    }
    
    console.log('\n✅ All soft-deleted assignments have been physically removed!');
    console.log('You can now create new assignments.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

hardDeleteAssignments();
