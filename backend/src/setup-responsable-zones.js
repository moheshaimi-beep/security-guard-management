const db = require('./models');
const bcrypt = require('bcryptjs');

async function setupResponsableAndZones() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ DB connected\n');

    // 1. Add supervisors column to zones table if it doesn't exist
    console.log('📝 Adding supervisors column to zones table...');
    try {
      await db.sequelize.query(`
        ALTER TABLE zones 
        ADD COLUMN supervisors JSON NULL 
        COMMENT 'Liste des IDs des responsables qui gèrent cette zone (JSON array)'
      `);
      console.log('✅ Column supervisors added');
    } catch (error) {
      if (error.original && error.original.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ Column supervisors already exists');
      } else {
        console.error('❌ Error adding column:', error.message);
      }
    }

    // 2. Create a responsable user if none exists
    console.log('\n👤 Checking for responseurs...');
    const [responsables] = await db.sequelize.query(`
      SELECT id, firstName, lastName, email 
      FROM users 
      WHERE role = 'supervisor' AND deletedAt IS NULL
    `);

    let responsableId;
    if (responsables.length === 0) {
      console.log('Creating a test supervisor...');
      
      const hashedPassword = await bcrypt.hash('123456', 10);
      const responsableData = {
        id: db.sequelize.fn('UUID'),
        firstName: 'Mohamed',
        lastName: 'Responsable',
        email: 'responsable@test.com',
        password: hashedPassword,
        phone: '+212600000001',
        role: 'supervisor',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.sequelize.query(`
        INSERT INTO users (id, firstName, lastName, email, password, phone, role, status, createdAt, updatedAt)
        VALUES (UUID(), :firstName, :lastName, :email, :password, :phone, :role, :status, :createdAt, :updatedAt)
      `, {
        replacements: responsableData
      });

      const [newResponsable] = await db.sequelize.query(`
        SELECT id, firstName, lastName, email 
        FROM users 
        WHERE email = 'responsable@test.com' AND deletedAt IS NULL
      `);
      
      responsableId = newResponsable[0].id;
      console.log(`✅ Created responsable: ${newResponsable[0].firstName} ${newResponsable[0].lastName} (ID: ${responsableId})`);
      console.log(`   📧 Email: responsable@test.com`);
      console.log(`   🔑 Password: 123456`);
    } else {
      responsableId = responsables[0].id;
      console.log(`✅ Using existing responsable: ${responsables[0].firstName} ${responsables[0].lastName} (ID: ${responsableId})`);
    }

    // 3. Update existing zones to add this responsable
    console.log('\n🗺️ Assigning responsable to zones...');
    const [zones] = await db.sequelize.query(`
      SELECT id, name 
      FROM zones 
      WHERE deletedAt IS NULL
    `);

    console.log(`Found ${zones.length} zones`);
    for (const zone of zones) {
      await db.sequelize.query(`
        UPDATE zones 
        SET supervisors = :supervisors, updatedAt = NOW()
        WHERE id = :zoneId
      `, {
        replacements: {
          supervisors: JSON.stringify([responsableId]),
          zoneId: zone.id
        }
      });
      console.log(`  ✅ Assigned responsable to zone: ${zone.name}`);
    }

    console.log('\n✅ Setup complete!');
    console.log('\n📋 Summary:');
    console.log(`   - Responsable: responsable@test.com / 123456`);
    console.log(`   - Zones managed: ${zones.length}`);
    console.log('\n🔄 Reload the web app to see the changes!');

    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupResponsableAndZones();
