const { Sequelize, Op } = require('sequelize');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  }
);

async function checkSupervisorZones() {
  try {
    console.log('🔍 Checking supervisor zones...\n');

    // 1. Get all users with role 'responsable'
    const [responsables] = await sequelize.query(`
      SELECT id, "firstName", "lastName", email, role
      FROM users
      WHERE role = 'responsable'
      ORDER BY id
    `);

    console.log('📋 Responsables found:', responsables.length);
    console.log(responsables);
    console.log('\n');

    // 2. Check Zone table structure
    const [zoneColumns] = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'zones'
      ORDER BY ordinal_position
    `);

    console.log('🏗️ Zone table structure:');
    zoneColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    console.log('\n');

    // 3. Get all zones
    const [zones] = await sequelize.query(`
      SELECT id, name, description, "eventId", supervisors, "requiredAgents"
      FROM zones
      ORDER BY id
    `);

    console.log('🗺️ All zones:', zones.length);
    zones.forEach(zone => {
      console.log(`\nZone #${zone.id}: ${zone.name}`);
      console.log(`  Event ID: ${zone.eventId}`);
      console.log(`  Supervisors: ${zone.supervisors}`);
      console.log(`  Required Agents: ${zone.requiredAgents}`);
    });
    console.log('\n');

    // 4. Check which responsable manages which zones
    if (responsables.length > 0 && zones.length > 0) {
      console.log('🔗 Zone assignments per responsable:\n');
      
      for (const resp of responsables) {
        console.log(`👤 ${resp.firstName} ${resp.lastName} (ID: ${resp.id})`);
        
        const managedZones = zones.filter(zone => {
          if (!zone.supervisors) return false;
          try {
            // Check if supervisors is JSON array containing the user ID
            const supervisorIds = JSON.parse(zone.supervisors);
            return supervisorIds.includes(resp.id);
          } catch (e) {
            // Check if it's a simple string match
            return zone.supervisors.includes(resp.id.toString());
          }
        });

        if (managedZones.length > 0) {
          managedZones.forEach(zone => {
            console.log(`   ✅ Zone: ${zone.name} (ID: ${zone.id})`);
          });
        } else {
          console.log('   ⚠️ No zones assigned');
        }
        console.log('');
      }
    }

    // 5. Get today's events
    const [events] = await sequelize.query(`
      SELECT id, name, "startDate", "endDate", "checkInTime", "checkOutTime"
      FROM events
      WHERE "startDate"::date <= CURRENT_DATE
        AND ("endDate"::date >= CURRENT_DATE OR "endDate" IS NULL)
      ORDER BY "startDate"
    `);

    console.log('📅 Today\'s events:', events.length);
    events.forEach(event => {
      console.log(`  - ${event.name} (ID: ${event.id})`);
      console.log(`    Date: ${event.startDate} - ${event.endDate}`);
    });
    console.log('\n');

    await sequelize.close();
    console.log('✅ Check complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkSupervisorZones();
