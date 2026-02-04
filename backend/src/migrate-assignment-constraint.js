const { sequelize } = require('./models');

(async () => {
  try {
    console.log('🔧 Updating assignments table unique constraint...');
    
    // Drop the old constraint
    console.log('1️⃣ Dropping old unique constraint on (agentId, eventId)...');
    try {
      await sequelize.query(`
        ALTER TABLE assignments 
        DROP INDEX \`assignments_agentId_eventId\`;
      `);
      console.log('✅ Old constraint dropped');
    } catch (err) {
      if (err.message.includes("check that column/key exists")) {
        console.log('ℹ️  Old constraint does not exist, skipping...');
      } else {
        throw err;
      }
    }
    
    // Add new constraint with zoneId
    console.log('2️⃣ Adding new unique constraint on (agentId, eventId, zoneId)...');
    await sequelize.query(`
      ALTER TABLE assignments 
      ADD UNIQUE KEY \`assignments_agent_event_zone\` (\`agentId\`, \`eventId\`, \`zoneId\`);
    `);
    console.log('✅ New constraint added');
    
    // Verify the change
    console.log('3️⃣ Verifying indexes...');
    const [indexes] = await sequelize.query(`
      SHOW INDEXES FROM assignments;
    `);
    
    console.log('\n📊 Current indexes on assignments table:');
    indexes.forEach(index => {
      if (index.Key_name !== 'PRIMARY') {
        console.log(`  - ${index.Key_name}: ${index.Column_name} (Unique: ${index.Non_unique === 0})`);
      }
    });
    
    console.log('\n✅ Migration completed successfully!');
    console.log('ℹ️  Now a supervisor can be assigned to multiple zones in the same event.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();
