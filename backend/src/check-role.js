const db = require('./models');

async function checkUserRole() {
  try {
    await db.sequelize.authenticate();
    const [results] = await db.sequelize.query("SHOW COLUMNS FROM users LIKE 'role'");
    console.log('Role column definition:');
    console.log('Type:', results[0].Type);
    console.log('Default:', results[0].Default);
    await db.sequelize.close();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

checkUserRole();
