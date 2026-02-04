const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });

  try {
    // Drop existing constraint if it exists
    try {
      await conn.query('ALTER TABLE attendance DROP FOREIGN KEY fk_attendance_checkedInBy');
      console.log('✅ Dropped existing constraint');
    } catch (e) {
      console.log('ℹ️ No existing constraint to drop');
    }

    // Check users.id type
    const [userCols] = await conn.query('DESCRIBE users');
    const idCol = userCols.find(c => c.Field === 'id');
    console.log('\nType de users.id:', idCol.Type);

    // Check attendance columns
    const [attCols] = await conn.query('DESCRIBE attendance');
    const checkedInByCol = attCols.find(c => c.Field === 'checkedInBy');
    if (checkedInByCol) {
      console.log('Type de attendance.checkedInBy:', checkedInByCol.Type);
      
      // Drop and recreate with correct type
      await conn.query('ALTER TABLE attendance DROP COLUMN checkedInBy');
      console.log('✅ Dropped checkedInBy column');
    }

    // Add with correct type (VARCHAR instead of CHAR)
    await conn.query(`
      ALTER TABLE attendance 
      ADD COLUMN checkedInBy VARCHAR(36) NULL 
      COMMENT 'Admin/Supervisor who performed the check-in on behalf of the agent'
    `);
    console.log('✅ Added checkedInBy column');

    // Add foreign key
    await conn.query(`
      ALTER TABLE attendance
      ADD CONSTRAINT fk_attendance_checkedInBy 
      FOREIGN KEY (checkedInBy) REFERENCES users(id) ON DELETE SET NULL
    `);
    console.log('✅ Added foreign key constraint');

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await conn.end();
  }
}

run();
