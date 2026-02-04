const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('security_guard_db', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

const eventId = '93af38ef-484d-4459-a8d4-06d20593f944';

sequelize.query(
  `SELECT id, agentId, eventId, zoneId, role, status, createdAt 
   FROM assignments 
   WHERE eventId = ? AND deletedAt IS NULL 
   ORDER BY createdAt DESC`,
  {
    replacements: [eventId],
    type: Sequelize.QueryTypes.SELECT
  }
).then(results => {
  console.log('\n📊 Existing assignments for event:', eventId);
  console.log('Total:', results.length, '\n');
  
  if (results.length === 0) {
    console.log('No assignments found.');
  } else {
    results.forEach((assignment, index) => {
      console.log(`${index + 1}. Assignment ID: ${assignment.id}`);
      console.log(`   Agent: ${assignment.agentId}`);
      console.log(`   Role: ${assignment.role}`);
      console.log(`   Status: ${assignment.status}`);
      console.log(`   Zone: ${assignment.zoneId || 'N/A'}`);
      console.log(`   Created: ${assignment.createdAt}`);
      console.log('');
    });
  }
  
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
