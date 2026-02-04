const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });

  try {
    // Drop checkedInBy if exists
    try {
      await conn.query('ALTER TABLE attendance DROP COLUMN checkedInBy');
      console.log('✅ Dropped existing checkedInBy column');
    } catch (e) {
      console.log('ℹ️ No existing checkedInBy column');
    }

    // Add checkedInBy column with exact same type as users.id
    await conn.query(`
      ALTER TABLE attendance 
      ADD COLUMN checkedInBy CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL 
      COMMENT 'Admin/Supervisor who performed the check-in on behalf of the agent',
      ADD INDEX idx_checkedInBy (checkedInBy)
    `);
    console.log('✅ Added checkedInBy column with index');

    console.log('\n✅ Migration completed! (FK not added due to compatibility issues, but column is ready)');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await conn.end();
  }
}

run();
