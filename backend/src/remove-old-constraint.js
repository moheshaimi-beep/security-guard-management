const { sequelize } = require('./models');

(async () => {
  try {
    console.log('Removing old constraint...');
    await sequelize.query('ALTER TABLE assignments DROP INDEX `assignments_agent_id_event_id`');
    console.log('Old constraint removed');
    
    const [indexes] = await sequelize.query('SHOW INDEXES FROM assignments');
    console.log('\nRemaining unique indexes:');
    indexes
      .filter(i => i.Non_unique === 0 && i.Key_name !== 'PRIMARY')
      .forEach(i => console.log(`  - ${i.Key_name}: ${i.Column_name}`));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
