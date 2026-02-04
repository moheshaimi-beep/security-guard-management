const { Zone } = require('./models');

(async () => {
  try {
    const supervisorId = '3ae0b39b-81aa-4ed6-99e7-4a49814942fd';
    
    console.log('Testing SQL query...');
    const zones = await Zone.sequelize.query(`
      SELECT * FROM zones 
      WHERE deletedAt IS NULL 
      AND JSON_CONTAINS(supervisors, '"${supervisorId}"')
      ORDER BY name ASC
    `, {
      type: Zone.sequelize.QueryTypes.SELECT
    });
    
    console.log('✅ Zones found:', zones.length);
    if (zones.length > 0) {
      console.log('Zone details:', JSON.stringify(zones, null, 2));
    }
    
    // Test with mapToModel
    console.log('\nTesting with mapToModel...');
    const zonesWithModel = await Zone.sequelize.query(`
      SELECT * FROM zones 
      WHERE deletedAt IS NULL 
      AND JSON_CONTAINS(supervisors, '"${supervisorId}"')
      ORDER BY name ASC
    `, {
      type: Zone.sequelize.QueryTypes.SELECT,
      model: Zone,
      mapToModel: true
    });
    
    console.log('✅ Zones with model:', zonesWithModel.length);
    if (zonesWithModel.length > 0) {
      console.log('Mapped zone:', zonesWithModel[0].name);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
})();
