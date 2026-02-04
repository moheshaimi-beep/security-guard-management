const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('security_guard_db', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

async function updateItalyEvent() {
  try {
    // Mettre à jour l'événement italy vs brazil avec 60 minutes (1h avant)
    await sequelize.query(`
      UPDATE events 
      SET agentCreationBuffer = 60 
      WHERE name = 'italy vs brazil'
    `);
    
    console.log('✅ Event "italy vs brazil" updated to 1h buffer');
    
    // Vérifier
    const [results] = await sequelize.query(`
      SELECT name, checkInTime, checkOutTime, agentCreationBuffer 
      FROM events 
      WHERE name = 'italy vs brazil'
    `);
    
    console.log('\n=== Event Details ===');
    console.log(results[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Update failed:', error.message);
    process.exit(1);
  }
}

updateItalyEvent();
