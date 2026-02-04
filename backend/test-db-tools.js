const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const testDatabaseTools = async () => {
  console.log('🔧 Test des outils de base de données...\n');

  // Test MySQL tools
  try {
    const { stdout: mysqlVersion } = await execAsync('mysql --version');
    console.log('✅ MySQL Client:', mysqlVersion.trim());
  } catch (error) {
    console.log('❌ MySQL Client non trouvé');
    console.log('   Installation: https://dev.mysql.com/downloads/mysql/');
  }

  try {
    const { stdout: mysqldumpVersion } = await execAsync('mysqldump --version');
    console.log('✅ mysqldump:', mysqldumpVersion.trim());
  } catch (error) {
    console.log('❌ mysqldump non trouvé');
  }

  // Test PostgreSQL tools
  try {
    const { stdout: psqlVersion } = await execAsync('psql --version');
    console.log('✅ PostgreSQL Client:', psqlVersion.trim());
  } catch (error) {
    console.log('❌ PostgreSQL Client non trouvé');
    console.log('   Installation: https://www.postgresql.org/download/');
  }

  try {
    const { stdout: pgDumpVersion } = await execAsync('pg_dump --version');
    console.log('✅ pg_dump:', pgDumpVersion.trim());
  } catch (error) {
    console.log('❌ pg_dump non trouvé');
  }

  console.log('\n📋 Instructions:');
  console.log('- Pour MySQL: Installer MySQL Server ou MySQL Client');
  console.log('- Pour PostgreSQL: Installer PostgreSQL avec outils client');
  console.log('- Windows: Ajouter les paths dans variables d\'environnement');
  console.log('- Docker: Utiliser containers avec outils inclus');
};

testDatabaseTools().catch(console.error);