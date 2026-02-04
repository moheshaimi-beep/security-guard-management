const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('security_guard_db', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

const assignmentIds = [
  '966de2d3-374c-46df-ac51-65c146ecd8a4',
  'ed2ddcf3-cde4-4a49-aca9-a153cc716c13'
];

sequelize.query(
  `UPDATE assignments 
   SET status = 'cancelled', updatedAt = NOW() 
   WHERE id IN (?)`,
  {
    replacements: [assignmentIds],
    type: Sequelize.QueryTypes.UPDATE
  }
).then(([affectedRows]) => {
  console.log('\n✅ Successfully cancelled', affectedRows, 'assignments');
  console.log('You can now create new assignments for these agents.\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
