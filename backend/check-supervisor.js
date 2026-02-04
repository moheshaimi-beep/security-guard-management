const { sequelize } = require('./src/models');

async function checkSupervisor() {
  try {
    // Vérifier les utilisateurs
    console.log('=== UTILISATEURS ===');
    const users = await sequelize.query(
      'SELECT id, firstName, lastName, cin, role FROM users WHERE cin IN ("BK517312", "A303730") ORDER BY role',
      { type: sequelize.QueryTypes.SELECT }
    );
    
    users.forEach(u => {
      console.log(`CIN: ${u.cin} | Nom: ${u.firstName} ${u.lastName} | Role: ${u.role}`);
      console.log(`ID: ${u.id}\n`);
    });

    // Vérifier les zones et leurs superviseurs
    console.log('=== ZONES ET SUPERVISEURS ===');
    const zones = await sequelize.query(
      'SELECT z.id, z.name, z.eventId, e.name as eventName, z.supervisors FROM zones z LEFT JOIN events e ON z.eventId = e.id WHERE z.deletedAt IS NULL ORDER BY z.name',
      { type: sequelize.QueryTypes.SELECT }
    );
    
    zones.forEach(z => {
      console.log(`Zone: ${z.name} | Event: ${z.eventName || "AUCUN"}`);
      console.log(`  Supervisors: ${z.supervisors || "AUCUN"}\n`);
    });

    process.exit();
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

checkSupervisor();
