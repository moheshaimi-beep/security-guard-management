const cron = require('node-cron');
const { ScheduledBackup } = require('../models');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Répertoires de sauvegarde
const BACKUP_DIR = path.join(__dirname, '../../backups');

// Utilitaires
const formatDate = () => {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
};

const getDatabaseConfig = () => {
  const config = require('../config/database');
  const env = process.env.NODE_ENV || 'development';
  return config[env];
};

const getMySQLPath = () => {
  const laragonPath = 'C:\\laragon\\bin\\mysql';
  const possiblePaths = [
    `${laragonPath}\\mysql-8.4.3-winx64\\bin`,
    `${laragonPath}\\mysql-8.0.30-winx64\\bin`,
    `${laragonPath}\\mysql-8.1.0-winx64\\bin`,
    `${laragonPath}\\mysql-5.7.44-winx64\\bin`,
    `${laragonPath}\\mysql-8.0.28-winx64\\bin`,
    `${laragonPath}\\mysql-8.0.32-winx64\\bin`
  ];
  
  const fs_sync = require('fs');
  for (const mysqlPath of possiblePaths) {
    try {
      if (fs_sync.existsSync(`${mysqlPath}\\mysqldump.exe`)) {
        return mysqlPath;
      }
    } catch (error) {
      // Continue
    }
  }
  
  return '';
};

const getFileSize = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
};

const cleanupOldBackups = async (retentionCount = 3) => {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const sqlFiles = files.filter(file => file.endsWith('.sql'));
    
    if (sqlFiles.length <= retentionCount) {
      console.log(`📁 ${sqlFiles.length} sauvegardes trouvées (limite: ${retentionCount}). Aucun nettoyage nécessaire.`);
      return { deleted: 0, kept: sqlFiles.length };
    }
    
    const backupsWithStats = await Promise.all(
      sqlFiles.map(async (filename) => {
        const filePath = path.join(BACKUP_DIR, filename);
        const stats = await fs.stat(filePath);
        return {
          filename,
          filePath,
          created_at: stats.mtime
        };
      })
    );
    
    backupsWithStats.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    const toKeep = backupsWithStats.slice(0, retentionCount);
    const toDelete = backupsWithStats.slice(retentionCount);
    
    console.log(`🗑️ Nettoyage auto: Garder ${toKeep.length} sauvegardes, supprimer ${toDelete.length}`);
    
    for (const backup of toDelete) {
      await fs.unlink(backup.filePath);
      console.log(`  ❌ Supprimé: ${backup.filename}`);
    }
    
    return { deleted: toDelete.length, kept: toKeep.length };
  } catch (error) {
    console.error('❌ Erreur nettoyage auto sauvegardes:', error);
    throw error;
  }
};

const executeScheduledBackup = async () => {
  try {
    console.log('🔍 Vérification des sauvegardes planifiées...');
    
    const config = await ScheduledBackup.findOne({
      where: { enabled: true },
      order: [['createdAt', 'DESC']]
    });
    
    if (!config) {
      console.log('ℹ️ Aucune sauvegarde planifiée active');
      return;
    }
    
    const now = new Date();
    
    // Vérifier si c'est le moment d'exécuter
    if (config.nextRunAt && now < new Date(config.nextRunAt)) {
      console.log(`⏰ Prochaine sauvegarde prévue à: ${config.nextRunAt}`);
      return;
    }
    
    console.log('🚀 Démarrage de la sauvegarde planifiée automatique...');
    
    const dbConfig = getDatabaseConfig();
    const timestamp = formatDate();
    const filename = `backup_${dbConfig.database}_${timestamp}_${config.backupType}_auto.sql`;
    const filePath = path.join(BACKUP_DIR, filename);
    
    // Créer le répertoire si nécessaire
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    
    if (dbConfig.dialect === 'mysql') {
      const mysqlPath = getMySQLPath();
      const mysqldumpPath = mysqlPath ? path.join(mysqlPath, 'mysqldump.exe') : 'mysqldump';
      
      const args = [
        `-h${dbConfig.host}`,
        `-P${dbConfig.port}`,
        `-u${dbConfig.username}`
      ];
      
      if (dbConfig.password) {
        args.push(`-p${dbConfig.password}`);
      }
      
      if (config.backupType === 'full') {
        args.push('--single-transaction', '--routines', '--triggers');
      } else {
        args.push('--no-data', '--routines');
      }
      
      args.push(dbConfig.database);
      
      await new Promise((resolve, reject) => {
        const mysqldump = spawn(mysqldumpPath, args, {
          stdio: ['ignore', 'pipe', 'pipe']
        });
        
        const writeStream = require('fs').createWriteStream(filePath);
        mysqldump.stdout.pipe(writeStream);
        
        let stderr = '';
        mysqldump.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        mysqldump.on('close', (code) => {
          writeStream.end();
          if (code !== 0) {
            reject(new Error(`mysqldump failed with exit code ${code}: ${stderr}`));
          } else {
            resolve();
          }
        });
        
        mysqldump.on('error', (error) => {
          reject(new Error(`Failed to start mysqldump: ${error.message}`));
        });
      });
    }
    
    const fileSize = await getFileSize(filePath);
    
    if (fileSize === 0) {
      throw new Error('Fichier de sauvegarde vide');
    }
    
    console.log(`✅ Sauvegarde créée: ${filename} (${fileSize} octets)`);
    
    // Nettoyer les anciennes sauvegardes
    const cleanupResult = await cleanupOldBackups(config.retentionCount);
    console.log(`🗑️ Nettoyage: ${cleanupResult.deleted} supprimées, ${cleanupResult.kept} conservées`);
    
    // Mettre à jour la configuration
    const nextRun = new Date(now.getTime() + config.intervalDays * 24 * 60 * 60 * 1000);
    
    await config.update({
      lastRunAt: now,
      nextRunAt: nextRun
    });
    
    console.log(`📅 Prochaine sauvegarde: ${nextRun.toISOString()}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde planifiée automatique:', error);
  }
};

// Fonction d'initialisation du service de sauvegarde planifiée
const initScheduledBackupService = () => {
  console.log('🔧 Initialisation du service de sauvegarde planifiée...');
  
  // Vérifier toutes les heures
  // Format cron: minute heure jour mois jour_semaine
  // '0 * * * *' = toutes les heures à la minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Vérification planifiée des sauvegardes (toutes les heures)');
    await executeScheduledBackup();
  });
  
  // Exécuter aussi au démarrage après 30 secondes
  setTimeout(async () => {
    console.log('🚀 Vérification initiale des sauvegardes au démarrage');
    await executeScheduledBackup();
  }, 30000);
  
  console.log('✅ Service de sauvegarde planifiée initialisé');
  console.log('   - Vérification: toutes les heures');
  console.log('   - Vérification initiale: dans 30 secondes');
};

module.exports = {
  initScheduledBackupService,
  executeScheduledBackup
};
