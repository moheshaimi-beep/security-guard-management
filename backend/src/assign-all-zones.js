const { Zone, User } = require('./models');

(async () => {
  try {
    // Find supervisor youssef
    const supervisor = await User.findOne({ 
      where: { firstName: 'youssef' } 
    });
    
    if (!supervisor) {
      console.error('❌ Supervisor not found');
      process.exit(1);
    }
    
    console.log('✅ Supervisor found:', supervisor.id);
    
    // Get all zones
    const allZones = await Zone.findAll({ 
      where: { deletedAt: null } 
    });
    
    console.log('\n📊 All zones before update:');
    allZones.forEach(zone => {
      console.log(`  - ${zone.name} (${zone.id})`);
      console.log(`    supervisors: ${JSON.stringify(zone.supervisors)}`);
    });
    
    // Assign supervisor to all zones
    for (const zone of allZones) {
      if (!zone.supervisors || !zone.supervisors.includes(supervisor.id)) {
        console.log(`\n🔧 Updating zone: ${zone.name}`);
        zone.supervisors = [supervisor.id];
        await zone.save();
        console.log('  ✅ Supervisor assigned');
      } else {
        console.log(`\n✓ Zone ${zone.name} already has supervisor`);
      }
    }
    
    // Verify
    const updatedZones = await Zone.findAll({ 
      where: { deletedAt: null } 
    });
    
    console.log('\n✅ All zones after update:');
    updatedZones.forEach(zone => {
      console.log(`  - ${zone.name}: supervisors = ${JSON.stringify(zone.supervisors)}`);
    });
    
    console.log('\n🎯 Total zones managed:', updatedZones.length);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
