const { Zone, User } = require('./models');

(async () => {
  try {
    // Find supervisor
    const supervisor = await User.findOne({ 
      where: { firstName: 'youssef' } 
    });
    
    if (!supervisor) {
      console.error('❌ Supervisor not found');
      process.exit(1);
    }
    
    console.log('✅ Supervisor found:', {
      id: supervisor.id,
      name: supervisor.firstName,
      role: supervisor.role
    });
    
    // Find zone 'tata'
    const zone = await Zone.findOne({ 
      where: { name: 'tata' } 
    });
    
    if (!zone) {
      console.error('❌ Zone "tata" not found');
      process.exit(1);
    }
    
    console.log('✅ Zone found:', {
      id: zone.id,
      name: zone.name,
      supervisors: zone.supervisors
    });
    
    // Assign supervisor to zone
    zone.supervisors = [supervisor.id];
    await zone.save();
    
    console.log('✅ Zone updated with supervisor');
    
    // Verify with SQL query
    const verifyQuery = await Zone.sequelize.query(`
      SELECT id, name, supervisors 
      FROM zones 
      WHERE name = 'tata'
    `, {
      type: Zone.sequelize.QueryTypes.SELECT
    });
    
    console.log('📊 Verification:', JSON.stringify(verifyQuery, null, 2));
    
    // Test JSON_CONTAINS query
    const managedZones = await Zone.sequelize.query(`
      SELECT * FROM zones 
      WHERE deletedAt IS NULL 
      AND JSON_CONTAINS(supervisors, '"${supervisor.id}"')
    `, {
      type: Zone.sequelize.QueryTypes.SELECT
    });
    
    console.log('🎯 Managed zones for supervisor:', managedZones.length);
    if (managedZones.length > 0) {
      console.log('Zone names:', managedZones.map(z => z.name).join(', '));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
