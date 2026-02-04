const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { exec, spawn } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const multer = require('multer');
const { sequelize, ActivityLog, ScheduledBackup } = require('../models');

// Configuration multer pour upload de fichiers
const upload = multer({
  dest: path.join(__dirname, '../../backups/uploads/'),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/sql' || file.originalname.endsWith('.sql')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers .sql sont autorisés'), false);
    }
  }
});

// Répertoires de sauvegarde
const BACKUP_DIR = path.join(__dirname, '../../backups');
const UPLOADS_DIR = path.join(BACKUP_DIR, 'uploads');

// Créer les répertoires si ils n'existent pas
const ensureDirectories = async () => {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.log('Répertoires de sauvegarde déjà existants');
  }
};

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

// Utilitaire pour trouver les outils MySQL de Laragon
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
  
  // En développement, essayer de trouver un chemin qui existe
  const fs_sync = require('fs');
  for (const mysqlPath of possiblePaths) {
    try {
      if (fs_sync.existsSync(`${mysqlPath}\\mysqldump.exe`)) {
        console.log(`✅ MySQL trouvé dans: ${mysqlPath}`);
        return mysqlPath;
      }
    } catch (error) {
      // Continue vers le chemin suivant
    }
  }
  
  console.log('⚠️ MySQL non trouvé dans Laragon, utilisation du PATH système');
  // Fallback vers PATH système (peut fonctionner si MySQL est dans PATH)
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

// Fonction pour enregistrer les logs d'activité
const logActivity = async (req, action, description, status = 'success', metadata = {}) => {
  try {
    await ActivityLog.create({
      userId: req.user?.id || null,
      action,
      description,
      entityType: 'database',
      entityId: null,
      status,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      metadata: JSON.stringify(metadata)
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du log:', error);
  }
};

// Fonction pour nettoyer les anciennes sauvegardes (garder seulement les N plus récentes)
const cleanupOldBackups = async (retentionCount = 3) => {
  try {
    await ensureDirectories();
    const files = await fs.readdir(BACKUP_DIR);
    const sqlFiles = files.filter(file => file.endsWith('.sql'));
    
    if (sqlFiles.length <= retentionCount) {
      console.log(`📁 ${sqlFiles.length} sauvegardes trouvées (limite: ${retentionCount}). Aucun nettoyage nécessaire.`);
      return { deleted: 0, kept: sqlFiles.length };
    }
    
    // Obtenir les infos de tous les fichiers
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
    
    // Trier par date (plus récent en premier)
    backupsWithStats.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Garder seulement les N plus récents, supprimer les autres
    const toKeep = backupsWithStats.slice(0, retentionCount);
    const toDelete = backupsWithStats.slice(retentionCount);
    
    console.log(`🗑️ Nettoyage: Garder ${toKeep.length} sauvegardes, supprimer ${toDelete.length}`);
    
    // Supprimer les anciennes
    for (const backup of toDelete) {
      await fs.unlink(backup.filePath);
      console.log(`  ❌ Supprimé: ${backup.filename}`);
    }
    
    return { deleted: toDelete.length, kept: toKeep.length };
  } catch (error) {
    console.error('❌ Erreur nettoyage sauvegardes:', error);
    throw error;
  }
};

// Routes

/**
 * GET /admin/database/info
 * Informations sur la base de données
 */
router.get('/info', async (req, res) => {
  try {
    const dbConfig = getDatabaseConfig();
    
    // Requêtes spécifiques selon le type de DB
    let dbInfo = {
      type: dbConfig.dialect,
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database
    };

    if (dbConfig.dialect === 'mysql') {
      // Informations MySQL
      const [results] = await sequelize.query('SELECT VERSION() as version');
      const [sizeResult] = await sequelize.query(`
        SELECT 
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
        FROM information_schema.tables 
        WHERE table_schema = ?
      `, { replacements: [dbConfig.database] });
      
      const [tablesResult] = await sequelize.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = ?
      `, { replacements: [dbConfig.database] });

      dbInfo.version = results[0].version;
      dbInfo.size = (sizeResult[0].size_mb || 0) * 1024 * 1024; // Convert to bytes
      dbInfo.tables_count = tablesResult[0].count;

    } else if (dbConfig.dialect === 'postgres') {
      // Informations PostgreSQL
      const [results] = await sequelize.query('SELECT version()');
      const [sizeResult] = await sequelize.query(`
        SELECT pg_size_pretty(pg_database_size(?)) as size, 
               pg_database_size(?) as size_bytes
      `, { replacements: [dbConfig.database, dbConfig.database] });
      
      const [tablesResult] = await sequelize.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);

      dbInfo.version = results[0][0].version.split(' ')[1];
      dbInfo.size = parseInt(sizeResult[0][0].size_bytes) || 0;
      dbInfo.tables_count = tablesResult[0][0].count;
    }

    res.json(dbInfo);
  } catch (error) {
    console.error('Erreur info DB:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des informations de base' 
    });
  }
});

/**
 * POST /admin/database/validate
 * Valider la structure de la base
 */
router.post('/validate', async (req, res) => {
  try {
    // Test de connexion
    await sequelize.authenticate();
    
    // Vérifier quelques tables critiques
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name IN ('users', 'events', 'assignments')
    `, { 
      replacements: [getDatabaseConfig().database] 
    });

    if (results.length < 3) {
      throw new Error('Tables critiques manquantes');
    }

    res.json({ success: true, message: 'Base de données valide' });
  } catch (error) {
    console.error('Erreur validation:', error);
    res.status(400).json({ 
      success: false, 
      message: `Erreur validation: ${error.message}` 
    });
  }
});

/**
 * POST /admin/database/backup
 * Créer une sauvegarde
 */
router.post('/backup', async (req, res) => {
  await ensureDirectories();
  
  try {
    const { type = 'full' } = req.body;
    const dbConfig = getDatabaseConfig();
    const timestamp = formatDate();
    const filename = `backup_${dbConfig.database}_${timestamp}_${type}.sql`;
    const filePath = path.join(BACKUP_DIR, filename);

    let command;

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
      
      // Options selon le type
      if (type === 'full') {
        args.push('--single-transaction', '--routines', '--triggers');
      } else {
        args.push('--no-data', '--routines');
      }
      
      args.push(dbConfig.database);
      
      console.log(`🔧 Exécution sauvegarde: ${mysqldumpPath} ${args.join(' ').replace(/-p\w+/, '-p***')}`);
      
      // Utiliser spawn au lieu d'exec pour mieux contrôler les streams
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
            console.error(`❌ mysqldump exit code: ${code}`);
            console.error(`❌ stderr: ${stderr}`);
            reject(new Error(`mysqldump failed with exit code ${code}: ${stderr}`));
          } else {
            console.log(`✅ mysqldump completed successfully`);
            if (stderr && !stderr.includes('Warning') && !stderr.includes('Using a password on the command line')) {
              console.log(`📝 stderr (warnings): ${stderr}`);
            }
            resolve();
          }
        });
        
        mysqldump.on('error', (error) => {
          console.error(`❌ mysqldump spawn error:`, error);
          reject(new Error(`Failed to start mysqldump: ${error.message}`));
        });
      });
      
    } else if (dbConfig.dialect === 'postgres') {
      const options = type === 'full' ? '' : '--schema-only';
      const pgPassword = dbConfig.password ? `PGPASSWORD=${dbConfig.password} ` : '';
      
      command = `${pgPassword}pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} ${options} ${dbConfig.database} > "${filePath}"`;
    } else {
      throw new Error(`Type de base non supporté: ${dbConfig.dialect}`);
    }

    // Vérifier que le fichier a été créé
    const fileSize = await getFileSize(filePath);
    console.log(`📁 Taille fichier créé: ${fileSize} octets`);
    
    if (fileSize === 0) {
      // Essayer de lire le fichier pour voir s'il contient quelque chose
      try {
        const content = await fs.readFile(filePath, 'utf8');
        console.log(`📄 Contenu fichier (100 premiers caractères): ${content.substring(0, 100)}`);
        await logActivity(req, 'backup_failed', `Échec sauvegarde ${type}: fichier vide`, 'error', { filename, type, fileSize });
        throw new Error(`Fichier de sauvegarde vide. Contenu: ${content.length} caractères`);
      } catch (readError) {
        await logActivity(req, 'backup_failed', `Échec sauvegarde ${type}: fichier vide et illisible`, 'error', { filename, type, error: readError.message });
        throw new Error(`Fichier de sauvegarde vide et illisible: ${readError.message}`);
      }
    }

    // Enregistrer le succès dans les logs
    await logActivity(req, 'database_backup_created', `Sauvegarde ${type} créée: ${filename}`, 'success', {
      filename,
      type,
      fileSize,
      database: dbConfig.database
    });

    res.json({
      success: true,
      filename,
      size: fileSize,
      type,
      message: `Sauvegarde ${type} créée avec succès`
    });

  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    
    // Enregistrer l'échec dans les logs
    await logActivity(req, 'database_backup_failed', `Échec création sauvegarde: ${error.message}`, 'error', {
      error: error.message,
      type: req.body.type || 'full'
    });
    
    res.status(500).json({
      success: false,
      message: `Erreur lors de la sauvegarde: ${error.message}`
    });
  }
});

/**
 * GET /admin/database/verify/:filename
 * Vérifier l'intégrité d'un fichier de sauvegarde
 */
router.get('/verify/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(BACKUP_DIR, filename);
    
    console.log(`🔍 Vérification simple de ${filename}`);
    
    // Vérification basique d'existence et taille
    await fs.access(filePath);
    const stats = await fs.stat(filePath);
    
    console.log(`📊 Fichier trouvé: ${stats.size} octets`);
    
    const isValid = stats.size > 100; // Si plus de 100 octets, considéré comme valide
    
    res.json({
      valid: isValid,
      size: stats.size,
      checks: {
        has_content: isValid
      }
    });

  } catch (error) {
    console.error('❌ Erreur vérification simple:', error.message);
    res.status(404).json({ 
      valid: false, 
      message: `Fichier non trouvé: ${error.message}` 
    });
  }
});

/**
 * GET /admin/database/backups
 * Lister les sauvegardes disponibles
 */
router.get('/backups', async (req, res) => {
  await ensureDirectories();
  
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const sqlFiles = files.filter(file => file.endsWith('.sql'));
    
    const backups = await Promise.all(
      sqlFiles.map(async (filename) => {
        const filePath = path.join(BACKUP_DIR, filename);
        const stats = await fs.stat(filePath);
        
        // Extraire type depuis le nom de fichier
        const type = filename.includes('_full') ? 'full' : 'structure';
        
        return {
          filename,
          size: stats.size,
          created_at: stats.mtime,
          type
        };
      })
    );

    // Trier par date (plus récent en premier)
    backups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ success: true, backups });
  } catch (error) {
    console.error('Erreur liste sauvegardes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des sauvegardes' 
    });
  }
});

/**
 * GET /admin/database/download/:filename
 * Télécharger une sauvegarde
 */
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(BACKUP_DIR, filename);
    
    // Vérifier sécurité: seulement fichiers .sql
    if (!filename.endsWith('.sql') || filename.includes('..')) {
      return res.status(400).json({ message: 'Nom de fichier invalide' });
    }
    
    await fs.access(filePath);
    
    // Enregistrer le téléchargement dans les logs
    const stats = await fs.stat(filePath);
    await logActivity(req, 'database_backup_downloaded', `Sauvegarde téléchargée: ${filename}`, 'success', {
      filename,
      fileSize: stats.size
    });
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/sql');
    res.sendFile(filePath);
    
  } catch (error) {
    res.status(404).json({ message: 'Fichier non trouvé' });
  }
});

/**
 * DELETE /admin/database/delete/:filename
 * Supprimer une sauvegarde
 */
router.delete('/delete/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(BACKUP_DIR, filename);
    
    console.log(`🗑️ Tentative de suppression: ${filename}`);
    
    // Vérifier sécurité: seulement fichiers .sql et pas de path traversal
    if (!filename.endsWith('.sql') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nom de fichier invalide ou dangereux' 
      });
    }
    
    // Vérifier que le fichier existe
    await fs.access(filePath);
    
    // Obtenir les informations du fichier avant suppression
    const stats = await fs.stat(filePath);
    const fileSize = stats.size;
    
    // Supprimer le fichier
    await fs.unlink(filePath);
    
    console.log(`✅ Fichier supprimé: ${filename} (${fileSize} octets)`);
    
    // Enregistrer l'action dans les logs
    await logActivity(req, 'database_backup_deleted', `Sauvegarde supprimée: ${filename}`, 'success', {
      filename,
      fileSize,
      path: filePath
    });
    
    res.json({ 
      success: true, 
      message: `Sauvegarde "${filename}" supprimée avec succès`,
      deleted_file: filename,
      deleted_size: fileSize
    });
    
  } catch (error) {
    console.error('❌ Erreur suppression sauvegarde:', error);
    
    if (error.code === 'ENOENT') {
      return res.status(404).json({ 
        success: false, 
        message: 'Fichier de sauvegarde non trouvé' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: `Erreur lors de la suppression: ${error.message}` 
    });
  }
});

/**
 * POST /admin/database/restore
 * Restaurer depuis sauvegarde locale
 */
router.post('/restore', async (req, res) => {
  try {
    const { filename } = req.body;
    const filePath = path.join(BACKUP_DIR, filename);
    
    // Vérifier que le fichier existe
    await fs.access(filePath);
    
    const dbConfig = getDatabaseConfig();
    let command;

    if (dbConfig.dialect === 'mysql') {
      // Utiliser le chemin complet vers mysql.exe
      const mysqlPath = getMySQLPath();
      if (!mysqlPath) {
        throw new Error('MySQL non trouvé dans le système');
      }
      
      const mysqlExe = path.join(mysqlPath, 'mysql.exe');
      const baseCmd = `"${mysqlExe}" -h${dbConfig.host} -P${dbConfig.port} -u${dbConfig.username}`;
      const passwordPart = dbConfig.password ? ` -p${dbConfig.password}` : '';
      command = `${baseCmd}${passwordPart} ${dbConfig.database} < "${filePath}"`;
      
    } else if (dbConfig.dialect === 'postgres') {
      const pgPassword = dbConfig.password ? `PGPASSWORD=${dbConfig.password} ` : '';
      command = `${pgPassword}psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -f "${filePath}"`;
    } else {
      throw new Error(`Type de base non supporté: ${dbConfig.dialect}`);
    }

    console.log(`🔄 Restauration: ${command.replace(/-p\w+/, '-p***')}`);
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && stderr.toLowerCase().includes('error')) {
      throw new Error(`Erreur restauration: ${stderr}`);
    }

    console.log(`✅ Restauration réussie depuis: ${filename}`);

    // Enregistrer le succès dans les logs
    await logActivity(req, 'database_restored', `Base de données restaurée depuis: ${filename}`, 'success', {
      filename,
      database: dbConfig.database,
      restored_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Base de données restaurée avec succès',
      restored_from: filename
    });

  } catch (error) {
    console.error('❌ Erreur restauration:', error.message);
    
    // Enregistrer l'échec dans les logs
    await logActivity(req, 'database_restore_failed', `Échec restauration: ${error.message}`, 'error', {
      filename: req.body.filename,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: `Erreur lors de la restauration: ${error.message}`
    });
  }
});

/**
 * POST /admin/database/restore/upload
 * Restaurer depuis fichier uploadé
 */
router.post('/restore/upload', upload.single('backup'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier de sauvegarde fourni' });
    }

    const uploadedPath = req.file.path;
    const dbConfig = getDatabaseConfig();
    let command;

    if (dbConfig.dialect === 'mysql') {
      const baseCmd = `mysql -h${dbConfig.host} -P${dbConfig.port} -u${dbConfig.username}`;
      const passwordPart = dbConfig.password ? ` -p${dbConfig.password}` : '';
      command = `${baseCmd}${passwordPart} ${dbConfig.database} < "${uploadedPath}"`;
      
    } else if (dbConfig.dialect === 'postgres') {
      const pgPassword = dbConfig.password ? `PGPASSWORD=${dbConfig.password} ` : '';
      command = `${pgPassword}psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -f "${uploadedPath}"`;
    } else {
      throw new Error(`Type de base non supporté: ${dbConfig.dialect}`);
    }

    console.log(`Restauration upload: ${command.replace(/-p\w+/, '-p***')}`);
    
    const { stdout, stderr } = await execAsync(command);
    
    // Nettoyer le fichier temporaire
    await fs.unlink(uploadedPath).catch(() => {});
    
    if (stderr && stderr.toLowerCase().includes('error')) {
      throw new Error(`Erreur restauration: ${stderr}`);
    }

    // Enregistrer le succès dans les logs
    await logActivity(req, 'database_restored_upload', `Base de données restaurée depuis fichier uploadé: ${req.file.originalname}`, 'success', {
      originalName: req.file.originalname,
      fileSize: req.file.size,
      database: dbConfig.database,
      restored_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Base de données restaurée avec succès depuis fichier externe',
      restored_from: req.file.originalname
    });

  } catch (error) {
    // Nettoyer le fichier temporaire en cas d'erreur
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    console.error('Erreur restauration upload:', error);
    
    // Enregistrer l'échec dans les logs
    await logActivity(req, 'database_restore_upload_failed', `Échec restauration fichier uploadé: ${error.message}`, 'error', {
      originalName: req.file?.originalname,
      fileSize: req.file?.size,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: `Erreur lors de la restauration: ${error.message}`
    });
  }
});

/**
 * GET /admin/database/scheduled
 * Obtenir la configuration de sauvegarde planifiée
 */
router.get('/scheduled', async (req, res) => {
  try {
    const config = await ScheduledBackup.findOne({
      order: [['createdAt', 'DESC']]
    });
    
    if (!config) {
      // Retourner une configuration par défaut
      return res.json({
        success: true,
        config: {
          enabled: false,
          intervalDays: 7,
          backupType: 'full',
          retentionCount: 3,
          lastRunAt: null,
          nextRunAt: null
        }
      });
    }
    
    res.json({
      success: true,
      config: {
        id: config.id,
        enabled: config.enabled,
        intervalDays: config.intervalDays,
        backupType: config.backupType,
        retentionCount: config.retentionCount,
        lastRunAt: config.lastRunAt,
        nextRunAt: config.nextRunAt,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }
    });
  } catch (error) {
    console.error('Erreur récupération config:', error);
    res.status(500).json({
      success: false,
      message: `Erreur lors de la récupération de la configuration: ${error.message}`
    });
  }
});

/**
 * POST /admin/database/scheduled
 * Créer ou mettre à jour la configuration de sauvegarde planifiée
 */
router.post('/scheduled', async (req, res) => {
  try {
    const { enabled, intervalDays, backupType, retentionCount } = req.body;
    
    // Validation
    if (intervalDays && (intervalDays < 1 || intervalDays > 365)) {
      return res.status(400).json({
        success: false,
        message: 'L\'intervalle doit être entre 1 et 365 jours'
      });
    }
    
    if (retentionCount && (retentionCount < 1 || retentionCount > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Le nombre de sauvegardes à garder doit être entre 1 et 100'
      });
    }
    
    // Vérifier si une configuration existe déjà
    let config = await ScheduledBackup.findOne({
      order: [['createdAt', 'DESC']]
    });
    
    const now = new Date();
    const daysInterval = intervalDays || config?.intervalDays || 7;
    const nextRun = new Date(now.getTime() + daysInterval * 24 * 60 * 60 * 1000);
    
    if (config) {
      // Mettre à jour la configuration existante
      await config.update({
        enabled: enabled !== undefined ? enabled : config.enabled,
        intervalDays: intervalDays || config.intervalDays,
        backupType: backupType || config.backupType,
        retentionCount: retentionCount || config.retentionCount,
        nextRunAt: enabled === false ? null : nextRun
      });
    } else {
      // Créer une nouvelle configuration
      config = await ScheduledBackup.create({
        enabled: enabled !== undefined ? enabled : true,
        intervalDays: intervalDays || 7,
        backupType: backupType || 'full',
        retentionCount: retentionCount || 3,
        nextRunAt: enabled !== false ? nextRun : null,
        createdBy: req.user?.id || null
      });
    }
    
    await logActivity(req, 'scheduled_backup_configured', 
      `Configuration sauvegarde planifiée: ${enabled ? 'activée' : 'désactivée'}`, 
      'success', 
      {
        intervalDays: config.intervalDays,
        backupType: config.backupType,
        retentionCount: config.retentionCount
      }
    );
    
    res.json({
      success: true,
      message: 'Configuration de sauvegarde planifiée enregistrée',
      config: {
        id: config.id,
        enabled: config.enabled,
        intervalDays: config.intervalDays,
        backupType: config.backupType,
        retentionCount: config.retentionCount,
        lastRunAt: config.lastRunAt,
        nextRunAt: config.nextRunAt
      }
    });
  } catch (error) {
    console.error('Erreur config scheduled backup:', error);
    res.status(500).json({
      success: false,
      message: `Erreur lors de la configuration: ${error.message}`
    });
  }
});

/**
 * POST /admin/database/cleanup
 * Nettoyer les anciennes sauvegardes manuellement
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { retentionCount } = req.body;
    const count = retentionCount || 3;
    
    const result = await cleanupOldBackups(count);
    
    await logActivity(req, 'backup_cleanup', 
      `Nettoyage sauvegardes: ${result.deleted} supprimées, ${result.kept} conservées`, 
      'success', 
      result
    );
    
    res.json({
      success: true,
      message: `Nettoyage effectué: ${result.deleted} sauvegardes supprimées, ${result.kept} conservées`,
      deleted: result.deleted,
      kept: result.kept
    });
  } catch (error) {
    console.error('Erreur cleanup:', error);
    await logActivity(req, 'backup_cleanup_failed', 
      `Échec nettoyage sauvegardes: ${error.message}`, 
      'error'
    );
    res.status(500).json({
      success: false,
      message: `Erreur lors du nettoyage: ${error.message}`
    });
  }
});

/**
 * POST /admin/database/run-scheduled
 * Exécuter une sauvegarde planifiée manuellement
 */
router.post('/run-scheduled', async (req, res) => {
  try {
    const config = await ScheduledBackup.findOne({
      where: { enabled: true },
      order: [['createdAt', 'DESC']]
    });
    
    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'Aucune configuration de sauvegarde planifiée active'
      });
    }
    
    // Créer la sauvegarde
    const dbConfig = getDatabaseConfig();
    const timestamp = formatDate();
    const filename = `backup_${dbConfig.database}_${timestamp}_${config.backupType}_scheduled.sql`;
    const filePath = path.join(BACKUP_DIR, filename);
    
    await ensureDirectories();
    
    let command;
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
    
    // Nettoyer les anciennes sauvegardes
    await cleanupOldBackups(config.retentionCount);
    
    // Mettre à jour la configuration
    const now = new Date();
    const nextRun = new Date(now.getTime() + config.intervalDays * 24 * 60 * 60 * 1000);
    
    await config.update({
      lastRunAt: now,
      nextRunAt: nextRun
    });
    
    await logActivity(req, 'scheduled_backup_executed', 
      `Sauvegarde planifiée exécutée: ${filename}`, 
      'success', 
      {
        filename,
        fileSize,
        type: config.backupType,
        intervalDays: config.intervalDays
      }
    );
    
    res.json({
      success: true,
      message: 'Sauvegarde planifiée exécutée avec succès',
      filename,
      size: fileSize,
      nextRunAt: nextRun
    });
  } catch (error) {
    console.error('Erreur exécution sauvegarde planifiée:', error);
    await logActivity(req, 'scheduled_backup_failed', 
      `Échec sauvegarde planifiée: ${error.message}`, 
      'error'
    );
    res.status(500).json({
      success: false,
      message: `Erreur lors de l'exécution de la sauvegarde planifiée: ${error.message}`
    });
  }
});

module.exports = router;