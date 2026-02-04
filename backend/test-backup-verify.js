const fs = require('fs').promises;
const path = require('path');

async function testVerifyBackup() {
  const backupDir = path.join(__dirname, 'backups');
  const filename = 'backup_security_guard_db_2026-02-02T21-45-30_full.sql';
  const filePath = path.join(backupDir, filename);
  
  try {
    console.log('🧪 Test de vérification du fichier:', filename);
    
    // Vérifier que le fichier existe
    await fs.access(filePath);
    const stats = await fs.stat(filePath);
    
    console.log(`📋 Taille du fichier: ${stats.size} octets`);
    
    // Pour les gros fichiers, lire seulement les 5000 premiers caractères
    const buffer = Buffer.alloc(Math.min(5000, stats.size));
    const fileHandle = await fs.open(filePath, 'r');
    
    try {
      await fileHandle.read(buffer, 0, buffer.length, 0);
      const content = buffer.toString('utf8');
      const lines = content.split('\n').slice(0, 30);
      
      console.log('📄 Premières lignes du fichier:');
      lines.slice(0, 10).forEach((line, i) => {
        console.log(`${i+1}: ${line.substring(0, 80)}`);
      });
      
      // Vérifications basiques pour un dump MySQL
      const hasHeader = lines.some(line => 
        line.includes('mysqldump') || 
        line.includes('MySQL dump') ||
        line.includes('-- Host:') ||
        line.includes('-- Server version')
      );
      
      const hasContent = stats.size > 500;
      const hasValidSQL = lines.some(line => 
        line.toLowerCase().includes('create table') ||
        line.toLowerCase().includes('insert into') ||
        line.toLowerCase().includes('use ') ||
        line.includes('/*!40')
      );

      const isValid = hasHeader || (hasContent && hasValidSQL);
      
      console.log(`📋 Résultat de la vérification:`, {
        size: stats.size,
        hasHeader,
        hasContent, 
        hasValidSQL,
        isValid
      });
      
      console.log(isValid ? '✅ Fichier valide' : '❌ Fichier invalide');
      
    } finally {
      await fileHandle.close();
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testVerifyBackup();