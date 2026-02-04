const fs = require('fs');
const path = require('path');

function analyzeLogs() {
  try {
    console.log('📋 Analyse des logs pour identifier le problème...\n');
    
    // Vérifier les logs du serveur backend
    const logFiles = [
      './backend.log',
      './server-debug.log',
      '../console.log',
      './src/server.log'
    ];
    
    let logsFound = false;
    
    logFiles.forEach(logFile => {
      try {
        if (fs.existsSync(logFile)) {
          console.log(`📄 Lecture du fichier: ${logFile}`);
          const content = fs.readFileSync(logFile, 'utf8');
          const lines = content.split('\n');
          const recentLines = lines.slice(-50); // 50 dernières lignes
          
          console.log('Dernières lignes:');
          recentLines.forEach((line, i) => {
            if (line.trim()) {
              console.log(`   ${i}: ${line}`);
            }
          });
          console.log('\n' + '='.repeat(50) + '\n');
          logsFound = true;
        }
      } catch (err) {
        console.log(`❌ Erreur lecture ${logFile}: ${err.message}`);
      }
    });
    
    if (!logsFound) {
      console.log('ℹ️ Aucun fichier de log trouvé. Vérifions les erreurs possibles...\n');
    }
    
    // Créer un script de test spécifique pour A303730
    console.log('🧪 Création d\'un test spécifique pour reproduire le problème...');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

analyzeLogs();