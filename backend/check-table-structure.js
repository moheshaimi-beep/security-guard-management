/**
 * Script pour vérifier la structure des tables et corriger les incompatibilités de types
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTableStructure() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'security_guard_db',
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('🔍 Vérification de la structure des tables...\n');

    // Vérifier la table users
    console.log('📋 Structure de la table users:');
    const [usersStructure] = await connection.query('DESCRIBE users');
    console.table(usersStructure);

    // Vérifier la table attendance  
    console.log('\n📋 Structure de la table attendance:');
    const [attendanceStructure] = await connection.query('DESCRIBE attendance');
    console.table(attendanceStructure);

    // Vérifier les types spécifiques
    const [userIdType] = await connection.query(`
      SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'id'
    `);

    const [checkedInByType] = await connection.query(`
      SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'attendance' AND COLUMN_NAME = 'checkedInBy'
    `);

    console.log('\n🔍 Comparaison des types:');
    console.log('users.id:', userIdType[0]);
    if (checkedInByType[0]) {
      console.log('attendance.checkedInBy:', checkedInByType[0]);
    } else {
      console.log('attendance.checkedInBy: Colonne non trouvée');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await connection.end();
  }
}

// Fonction pour corriger le type de colonne
async function fixColumnType() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'security_guard_db',
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('🔧 Correction du type de colonne checkedInBy...');

    // Supprimer la colonne existante si elle existe
    await connection.query(`
      ALTER TABLE attendance DROP COLUMN IF EXISTS checkedInBy;
    `);

    // Recréer la colonne avec le bon type
    await connection.query(`
      ALTER TABLE attendance 
      ADD COLUMN checkedInBy CHAR(36),
      ADD INDEX idx_checked_in_by (checkedInBy);
    `);

    // Ajouter la contrainte de clé étrangère
    await connection.query(`
      ALTER TABLE attendance 
      ADD CONSTRAINT fk_attendance_checked_in_by 
      FOREIGN KEY (checkedInBy) REFERENCES users(id);
    `);

    console.log('✅ Type de colonne corrigé et clé étrangère ajoutée');

  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
  } finally {
    await connection.end();
  }
}

// Exécuter les fonctions
async function main() {
  await checkTableStructure();
  
  console.log('\n❓ Voulez-vous corriger le type de colonne ? (y/N)');
  // Pour l'automatisation, on va directement corriger
  await fixColumnType();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  checkTableStructure,
  fixColumnType
};