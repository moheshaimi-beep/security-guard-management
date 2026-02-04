const db = require('./models');
const { User, Zone } = db;

async function checkData() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ DB connected\n');

    // Get responsables
    const responsables = await User.findAll({ 
      where: { role: 'responsable' },
      attributes: ['id', 'firstName', 'lastName', 'email']
    });
    
    console.log(`📋 Responsables: ${responsables.length}`);
    responsables.forEach(r => {
      console.log(`  - ${r.firstName} ${r.lastName} (ID: ${r.id})`);
    });

    // Get zones
    console.log('\n🗺️ Zones:');
    const zones = await Zone.findAll({
      attributes: ['id', 'name', 'description', 'supervisors', 'eventId', 'requiredAgents']
    });
    
    console.log(`Total zones: ${zones.length}\n`);
    zones.forEach(z => {
      console.log(`Zone #${z.id}: ${z.name}`);
      console.log(`  Event ID: ${z.eventId}`);
      console.log(`  Supervisors field: ${z.supervisors}`);
      console.log(`  Required agents: ${z.requiredAgents}`);
      console.log('');
    });

    // Check assignments
    console.log('\n🔗 Zone assignments per responsable:\n');
    for (const resp of responsables) {
      console.log(`👤 ${resp.firstName} ${resp.lastName} (ID: ${resp.id})`);
      
      // Find zones that include this supervisor
      const managedZones = zones.filter(zone => {
        if (!zone.supervisors) return false;
        try {
          const supervisorIds = JSON.parse(zone.supervisors);
          return supervisorIds.includes(resp.id);
        } catch (e) {
          return zone.supervisors.includes(resp.id.toString());
        }
      });

      if (managedZones.length > 0) {
        managedZones.forEach(zone => {
          console.log(`   ✅ Manages: ${zone.name} (Zone ID: ${zone.id})`);
        });
      } else {
        console.log('   ⚠️ No zones assigned to this responsable');
      }
      console.log('');
    }

    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkData();
