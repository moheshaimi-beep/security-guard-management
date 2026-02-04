/**
 * Script simple pour terminer la migration
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function finishMigration() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'security_guard_db',
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('🔄 Finalisation de la migration...');

    // Mettre à jour les enregistrements existants
    const [updateResult] = await conn.query(`
      UPDATE attendance 
      SET 
        checkedInBy = agentId,
        checkedInByType = 'agent',
        checkInSource = 'self'
      WHERE checkedInBy IS NULL;
    `);

    console.log(`✅ ${updateResult.affectedRows} enregistrements mis à jour`);

    // Statistiques
    const [stats] = await conn.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN checkInSource = 'self' THEN 1 END) as self_checkins,
        COUNT(CASE WHEN checkInSource = 'admin' THEN 1 END) as admin_checkins,
        COUNT(CASE WHEN checkInSource = 'supervisor' THEN 1 END) as supervisor_checkins
      FROM attendance;
    `);

    console.log('\n📊 Statistiques finales:');
    console.log(`Total: ${stats[0].total}`);
    console.log(`Par l'agent: ${stats[0].self_checkins}`);
    console.log(`Par admin: ${stats[0].admin_checkins}`);
    console.log(`Par superviseur: ${stats[0].supervisor_checkins}`);

    console.log('\n🎉 Migration terminée avec succès!');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await conn.end();
  }
}

finishMigration();