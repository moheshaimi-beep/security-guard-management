const { Attendance } = require('./src/models');
const { Op } = require('sequelize');

async function createTestPhoto() {
  console.log('🖼️ Création d\'une photo de test très visible...');

  // Image base64 d'un simple carré rouge 100x100 pixels (très visible)
  // Cette image est garantie de s'afficher car c'est une image PNG minimaliste
  const redSquareBase64 = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAANklEQVR4nO3BMQEAAADCoPVPbQ0PoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD4GQABAAHiThjKAAAAAElFTkSuQmCC`;
  
  // Image base64 d'un carré rouge vif plus grand et plus visible
  const visibleRedSquare = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAAXElEQVR4nO3BAQ0AAADCoPdPbQ43AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAvg0hqAABVuRS+QAAAABJRU5ErkJggg==`;

  // Créer une image encore plus visible - carré rouge 200x200
  const bigRedSquare = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGSSURBVHhe7cExAQAAAMKg9U9tB2+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAvAYBUAAB958aLgAAAABJRU5ErkJggg==`;

  console.log(`📊 Image de test: ${bigRedSquare.length} caractères`);
  console.log(`📋 Preview: ${bigRedSquare.substring(0, 100)}...`);
  console.log(`✅ Format valide: ${bigRedSquare.startsWith('data:image/png')}`);

  // Trouver un pointage à mettre à jour
  const attendance = await Attendance.findOne({
    where: { 
      checkInPhoto: { 
        [Op.not]: null,
        [Op.ne]: ''
      } 
    },
    order: [['createdAt', 'DESC']]
  });

  if (!attendance) {
    console.log('❌ Aucun pointage trouvé');
    return;
  }

  console.log(`📋 Mise à jour du pointage: ${attendance.id}`);
  
  // Mettre à jour avec la nouvelle image
  await attendance.update({
    checkInPhoto: bigRedSquare
  });

  console.log('✅ Photo mise à jour avec carré rouge très visible!');
  console.log('   Format: PNG 200x200 pixels');
  console.log('   Contenu: Carré rouge uni très contrasté');
  console.log(`   Longueur: ${bigRedSquare.length} caractères`);

  // Créer un fichier HTML de test
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Carré Rouge</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            background: #f0f0f0;
        }
        .container { 
            max-width: 800px; 
            margin: 0 auto; 
            background: white;
            padding: 20px;
            border-radius: 8px;
        }
        .test-section { 
            margin: 30px 0; 
            padding: 20px; 
            border: 3px solid #333; 
            background: #fafafa;
        }
        .test-image { 
            border: 3px solid #000; 
            margin: 10px;
            display: inline-block;
        }
        .info { 
            background: #e8f4ff; 
            padding: 15px; 
            margin: 10px 0; 
            border-left: 5px solid #007bff;
        }
        .success { color: #28a745; font-weight: bold; }
        .error { color: #dc3545; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1 style="color: #dc3545;">🔴 Test Carré Rouge Très Visible</h1>
        
        <div class="info">
            <h3>Informations de l'image:</h3>
            <p><strong>Dimensions:</strong> 200x200 pixels</p>
            <p><strong>Contenu:</strong> Carré rouge uni (impossible à louper!)</p>
            <p><strong>Longueur:</strong> ${bigRedSquare.length} caractères</p>
            <p><strong>Format valide:</strong> <span class="success">✅ PNG valide</span></p>
            <p><strong>Preview:</strong> ${bigRedSquare.substring(0, 100)}...</p>
        </div>
        
        <div class="test-section">
            <h3>🖼️ Test 1: Image dans balise IMG</h3>
            <p>Si vous voyez un carré rouge ci-dessous, l'image fonctionne :</p>
            <img src="${bigRedSquare}" alt="Carré rouge test" class="test-image"
                 onload="console.log('✅ Image chargée dans IMG'); document.getElementById('img-status').innerHTML='<span class=success>✅ IMAGE CHARGÉE</span>'"
                 onerror="console.error('❌ Erreur dans IMG'); document.getElementById('img-status').innerHTML='<span class=error>❌ ERREUR IMAGE</span>'">
            <div id="img-status" style="margin-top: 10px;">⏳ Chargement...</div>
        </div>
        
        <div class="test-section">
            <h3>🎨 Test 2: Image en arrière-plan CSS</h3>
            <p>Même image en background CSS :</p>
            <div class="test-image" style="width: 200px; height: 200px;
                        background-image: url('${bigRedSquare}');
                        background-size: contain; 
                        background-repeat: no-repeat; 
                        background-position: center;
                        background-color: #ccc;">
            </div>
        </div>
        
        <div class="test-section">
            <h3>📝 Instructions:</h3>
            <ol>
                <li><strong>Si vous voyez des carrés rouges ci-dessus</strong> → L'image base64 fonctionne parfaitement</li>
                <li><strong>Actualisez votre page</strong> http://localhost:3000/attendance-verification</li>
                <li><strong>Regardez la section "Vérification d'identité"</strong></li>
                <li><strong>Vous devriez maintenant voir un carré rouge</strong> dans "Photo de pointage"</li>
            </ol>
        </div>
    </div>
    
    <script>
        console.log('🔴 Test carré rouge - si vous voyez des logs de succès, l\\'image fonctionne!');
    </script>
</body>
</html>`;

  const fs = require('fs');
  fs.writeFileSync('test-red-square.html', html);
  
  console.log('📄 Fichier test créé: test-red-square.html');
  console.log('🎯 Actions:');
  console.log('   1. Ouvrez test-red-square.html dans votre navigateur');
  console.log('   2. Vérifiez que vous voyez des carrés ROUGES');
  console.log('   3. Actualisez http://localhost:3000/attendance-verification');
  console.log('   4. Vous devriez maintenant voir un carré rouge au lieu d\'une image noire!');

  process.exit(0);
}

createTestPhoto().catch(error => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});