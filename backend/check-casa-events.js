const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('security_guard_db', 'root', '', {
  host: 'localhost',
  port: 3307,
  dialect: 'mysql',
  logging: false
});

(async () => {
  try {
    const [rows] = await sequelize.query(`
      SELECT 
        id, 
        name, 
        DATE_FORMAT(startDate, '%Y-%m-%d') as startDate,
        DATE_FORMAT(endDate, '%Y-%m-%d') as endDate,
        checkInTime, 
        checkOutTime, 
        agentCreationBuffer, 
        status 
      FROM events 
      WHERE name LIKE '%casa%' 
      ORDER BY startDate DESC 
      LIMIT 10
    `);
    
    console.log('\n=== ÉVÉNEMENTS "CASA" ===\n');
    console.table(rows);
    
    console.log('\n=== HEURE ACTUELLE ===');
    const now = new Date();
    console.log(now.toLocaleString('fr-FR', { timeZone: 'Africa/Casablanca' }));
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    process.exit();
  }
})();
