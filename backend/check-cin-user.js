const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('security_guard_db', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

(async () => {
  try {
    const [users] = await sequelize.query(
      "SELECT id, firstName, lastName, cin, role FROM users WHERE cin = 'BK517312'"
    );
    
    if (users.length === 0) {
      console.log('❌ Aucun utilisateur trouvé avec le CIN BK517312');
      await sequelize.close();
      return;
    }
    
    console.log('✅ Utilisateur trouvé:');
    console.log(users[0]);
    
    const userId = users[0].id;
    
    const [assignments] = await sequelize.query(
      `SELECT a.*, e.name as eventName, e.startDate, e.endDate, e.status as eventStatus 
       FROM assignments a 
       JOIN events e ON a.eventId = e.id 
       WHERE a.agentId = ?`,
      { replacements: [userId] }
    );
    
    console.log('\n📋 Assignations:');
    if (assignments.length === 0) {
      console.log('❌ Aucune assignation trouvée');
    } else {
      assignments.forEach((a, i) => {
        console.log(`\n${i + 1}. ${a.eventName}`);
        console.log(`   - Status: ${a.status}`);
        console.log(`   - Event Status: ${a.eventStatus}`);
        console.log(`   - Dates: ${a.startDate} -> ${a.endDate}`);
      });
    }
    
    await sequelize.close();
  } catch (error) {
    console.error('Erreur:', error.message);
    await sequelize.close();
  }
})();
