const db = require('./models');

async function checkStructure() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ DB connected\n');

    // Check zones table structure
    const [zoneColumns] = await db.sequelize.query('DESCRIBE zones');
    console.log('🏗️ Zone table structure:');
    zoneColumns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });

    // Check if there are any zones
    const [zones] = await db.sequelize.query('SELECT * FROM zones WHERE deletedAt IS NULL LIMIT 5');
    console.log(`\n📊 Total zones: ${zones.length}`);
    if (zones.length > 0) {
      console.log('\nFirst zone sample:');
      console.log(zones[0]);
    }

    // Check users with role responsable
    const [responsables] = await db.sequelize.query(`SELECT id, firstName, lastName, email, role FROM users WHERE role = 'responsable' AND deletedAt IS NULL`);
    console.log(`\n👥 Responsables found: ${responsables.length}`);
    responsables.forEach(r => {
      console.log(`  - ${r.firstName} ${r.lastName} (ID: ${r.id}) - ${r.email}`);
    });

    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkStructure();
