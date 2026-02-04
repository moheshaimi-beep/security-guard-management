/**
 * Script de migration pour ajouter les champs de traçabilité aux pointages
 * Permettre de savoir qui a fait le pointage (admin, agent, superviseur)
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateAttendanceTable() {
  console.log('🔄 Migration des champs de traçabilité pour les pointages...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'security_guard_db',
    port: process.env.DB_PORT || 3306
  });

  try {
    // Vérifier si les colonnes existent déjà
    const [results] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'attendance' 
      AND COLUMN_NAME IN ('checkedInBy', 'checkedInByType', 'checkInSource');
    `);

    const existingColumns = results.map(row => row.COLUMN_NAME);

    // Ajouter les nouvelles colonnes si elles n'existent pas
    if (!existingColumns.includes('checkedInBy')) {
      await connection.query(`
        ALTER TABLE attendance 
        ADD COLUMN checkedInBy INT,
        ADD INDEX idx_checked_in_by (checkedInBy);
      `);
      console.log('✅ Colonne checkedInBy ajoutée');
    } else {
      console.log('ℹ️ Colonne checkedInBy existe déjà');
    }

    if (!existingColumns.includes('checkedInByType')) {
      await connection.query(`
        ALTER TABLE attendance 
        ADD COLUMN checkedInByType ENUM('admin', 'supervisor', 'agent') DEFAULT 'agent';
      `);
      console.log('✅ Colonne checkedInByType ajoutée');
    } else {
      console.log('ℹ️ Colonne checkedInByType existe déjà');
    }

    if (!existingColumns.includes('checkInSource')) {
      await connection.query(`
        ALTER TABLE attendance 
        ADD COLUMN checkInSource ENUM('self', 'admin', 'supervisor') DEFAULT 'self',
        ADD INDEX idx_check_in_source (checkInSource);
      `);
      console.log('✅ Colonne checkInSource ajoutée');
    } else {
      console.log('ℹ️ Colonne checkInSource existe déjà');
    }

    // Ajouter la contrainte de clé étrangère pour checkedInBy
    const [constraints] = await connection.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'attendance' 
      AND COLUMN_NAME = 'checkedInBy'
      AND REFERENCED_TABLE_NAME = 'users';
    `);

    if (constraints.length === 0) {
      await connection.query(`
        ALTER TABLE attendance 
        ADD CONSTRAINT fk_attendance_checked_in_by 
        FOREIGN KEY (checkedInBy) REFERENCES users(id);
      `);
      console.log('✅ Contrainte de clé étrangère ajoutée pour checkedInBy');
    } else {
      console.log('ℹ️ Contrainte de clé étrangère existe déjà pour checkedInBy');
    }

    // Mettre à jour les enregistrements existants
    console.log('🔄 Mise à jour des enregistrements existants...');
    
    const [updateResult] = await connection.query(`
      UPDATE attendance 
      SET 
        checkedInBy = agentId,
        checkedInByType = 'agent',
        checkInSource = 'self'
      WHERE checkedInBy IS NULL;
    `);

    console.log(`✅ ${updateResult.affectedRows} enregistrements mis à jour`);

    // Statistiques après migration
    const [stats] = await connection.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN checkInSource = 'self' THEN 1 END) as self_checkins,
        COUNT(CASE WHEN checkInSource = 'admin' THEN 1 END) as admin_checkins,
        COUNT(CASE WHEN checkInSource = 'supervisor' THEN 1 END) as supervisor_checkins
      FROM attendance;
    `);

    console.log('\n📊 Statistiques des pointages après migration:');
    console.log(`Total: ${stats[0].total}`);
    console.log(`Par l'agent: ${stats[0].self_checkins}`);
    console.log(`Par admin: ${stats[0].admin_checkins}`);
    console.log(`Par superviseur: ${stats[0].supervisor_checkins}`);

    return {
      success: true,
      stats: stats[0],
      message: 'Migration des champs de traçabilité terminée'
    };

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

async function addAttendanceIndexes() {
  console.log('🔄 Ajout des index pour optimiser les performances...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'security_guard_db',
    port: process.env.DB_PORT || 3306
  });

  try {
    const indexes = [
      {
        name: 'idx_attendance_agent_event_date',
        query: `CREATE INDEX IF NOT EXISTS idx_attendance_agent_event_date 
                ON attendance (agentId, eventId, date);`
      },
      {
        name: 'idx_attendance_check_in_time',
        query: `CREATE INDEX IF NOT EXISTS idx_attendance_check_in_time 
                ON attendance (checkInTime DESC);`
      },
      {
        name: 'idx_attendance_source_type',
        query: `CREATE INDEX IF NOT EXISTS idx_attendance_source_type 
                ON attendance (checkInSource, checkedInByType);`
      }
    ];

    for (const index of indexes) {
      await connection.query(index.query);
      console.log(`✅ Index ${index.name} créé`);
    }

    console.log('✅ Tous les index ont été créés');

  } catch (error) {
    console.error('❌ Erreur lors de la création des index:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

async function createAttendanceViews() {
  console.log('🔄 Création des vues pour les rapports...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'security_guard_db',
    port: process.env.DB_PORT || 3306
  });

  try {
    // Vue pour les pointages avec détails complets
    await connection.query(`
      CREATE OR REPLACE VIEW v_attendance_details AS
      SELECT 
        a.id,
        a.date,
        a.checkInTime,
        a.checkOutTime,
        a.status,
        a.checkInSource,
        a.checkedInByType,
        
        -- Agent details
        agent.id as agentId,
        CONCAT(agent.firstName, ' ', agent.lastName) as agentName,
        agent.cin as agentCin,
        
        -- Event details  
        e.id as eventId,
        e.name as eventName,
        e.location as eventLocation,
        
        -- Checked in by details
        checker.id as checkedInById,
        CONCAT(checker.firstName, ' ', checker.lastName) as checkedInByName,
        
        -- Status calculations
        CASE 
          WHEN a.checkInSource = 'self' THEN 'Agent via téléphone'
          WHEN a.checkInSource = 'admin' THEN CONCAT('Admin: ', COALESCE(CONCAT(checker.firstName, ' ', checker.lastName), 'Inconnu'))
          WHEN a.checkInSource = 'supervisor' THEN CONCAT('Responsable: ', COALESCE(CONCAT(checker.firstName, ' ', checker.lastName), 'Inconnu'))
          ELSE 'Source inconnue'
        END as sourceDisplay,
        
        a.facialVerified,
        a.isWithinGeofence,
        a.distanceFromLocation,
        a.createdAt,
        a.updatedAt
        
      FROM attendance a
      INNER JOIN users agent ON a.agentId = agent.id
      INNER JOIN events e ON a.eventId = e.id
      LEFT JOIN users checker ON a.checkedInBy = checker.id
      WHERE a.deletedAt IS NULL;
    `);

    console.log('✅ Vue v_attendance_details créée');

    // Vue pour les statistiques par source
    await connection.query(`
      CREATE OR REPLACE VIEW v_attendance_stats_by_source AS
      SELECT 
        e.name as eventName,
        e.location as eventLocation,
        COUNT(*) as totalAttendances,
        COUNT(CASE WHEN a.checkInSource = 'self' THEN 1 END) as selfCheckins,
        COUNT(CASE WHEN a.checkInSource = 'admin' THEN 1 END) as adminCheckins,
        COUNT(CASE WHEN a.checkInSource = 'supervisor' THEN 1 END) as supervisorCheckins,
        COUNT(CASE WHEN a.facialVerified = 1 THEN 1 END) as facialVerified,
        COUNT(CASE WHEN a.isWithinGeofence = 1 THEN 1 END) as withinGeofence,
        AVG(a.distanceFromLocation) as avgDistance,
        MIN(a.checkInTime) as firstCheckIn,
        MAX(a.checkInTime) as lastCheckIn
      FROM attendance a
      INNER JOIN events e ON a.eventId = e.id
      WHERE a.deletedAt IS NULL
      GROUP BY e.id, e.name, e.location;
    `);

    console.log('✅ Vue v_attendance_stats_by_source créée');

    console.log('✅ Toutes les vues ont été créées');

  } catch (error) {
    console.error('❌ Erreur lors de la création des vues:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Fonction principale de migration
async function runMigration() {
  console.log('🚀 Démarrage de la migration pour les pointages...\n');

  try {
    // 1. Migration des colonnes
    const migrationResult = await migrateAttendanceTable();
    console.log('\n✅ Migration des colonnes terminée');

    // 2. Ajout des index
    await addAttendanceIndexes();
    console.log('\n✅ Index créés');

    // 3. Création des vues
    await createAttendanceViews();
    console.log('\n✅ Vues créées');

    console.log('\n🎉 Migration complète terminée avec succès!');
    console.log('\n📋 Résumé:');
    console.log(`- Total des pointages: ${migrationResult.stats.total}`);
    console.log(`- Par agent: ${migrationResult.stats.self_checkins}`);
    console.log(`- Par admin: ${migrationResult.stats.admin_checkins}`);
    console.log(`- Par superviseur: ${migrationResult.stats.supervisor_checkins}`);

    return migrationResult;

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = {
  migrateAttendanceTable,
  addAttendanceIndexes,
  createAttendanceViews,
  runMigration
};