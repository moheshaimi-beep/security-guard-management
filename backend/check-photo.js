const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('security_guard_db', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

async function checkPhoto() {
  try {
    const [results] = await sequelize.query(
      "SELECT id, employeeId, firstName, lastName, profilePhoto FROM users WHERE employeeId = 'AGT67388971'"
    );
    
    console.log('\n=== AGENT TAZI THAMI ===\n');
    console.log(JSON.stringify(results[0], null, 2));
    
    // Vérifier tous les agents avec photos
    const [agentsWithPhotos] = await sequelize.query(
      "SELECT COUNT(*) as total, SUM(CASE WHEN profilePhoto IS NOT NULL THEN 1 ELSE 0 END) as withPhotos FROM users WHERE role = 'agent' AND deletedAt IS NULL"
    );
    
    console.log('\n=== STATISTIQUES ===\n');
    console.log(agentsWithPhotos[0]);
    
    await sequelize.close();
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

checkPhoto();
