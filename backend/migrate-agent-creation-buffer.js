const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('security_guard_db', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

async function addAgentCreationBuffer() {
  try {
    // Vérifier si la colonne existe déjà
    const [columns] = await sequelize.query(`
      SHOW COLUMNS FROM events LIKE 'agentCreationBuffer'
    `);
    
    if (columns.length === 0) {
      // Ajouter la colonne agentCreationBuffer
      await sequelize.query(`
        ALTER TABLE events 
        ADD COLUMN agentCreationBuffer INT DEFAULT 120 
        COMMENT 'Minutes avant le début de l\\'événement où la création d\\'agents est autorisée (30, 60, 90, ou 120)'
      `);
      
      console.log('✅ Column agentCreationBuffer added successfully');
    } else {
      console.log('ℹ️  Column agentCreationBuffer already exists');
    }
    
    // Mettre à jour les événements existants
    await sequelize.query(`
      UPDATE events 
      SET agentCreationBuffer = 120 
      WHERE agentCreationBuffer IS NULL
    `);
    
    console.log('✅ Existing events updated with default value (120 minutes)');
    
    // Vérifier
    const [results] = await sequelize.query(`
      SELECT id, name, agentCreationBuffer 
      FROM events 
      LIMIT 5
    `);
    
    console.log('\n=== Sample Events ===');
    console.log(results);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

addAgentCreationBuffer();
