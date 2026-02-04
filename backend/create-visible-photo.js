const { createCanvas } = require('canvas');
const { Attendance } = require('./src/models');
const { Op } = require('sequelize');

async function createVisiblePhoto() {
  console.log('🖼️ Création d\'une photo très visible...');

  // Créer une image 200x200 avec un motif très contrasté
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext('2d');

  // Fond blanc
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 200, 200);

  // Cercle rouge au centre (visage simulé)
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(100, 100, 60, 0, 2 * Math.PI);
  ctx.fill();

  // Yeux noirs
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(80, 80, 8, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(120, 80, 8, 0, 2 * Math.PI);
  ctx.fill();

  // Bouche noire
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(100, 120, 20, 0, Math.PI);
  ctx.fill();

  // Texte "TEST" en bas
  ctx.fillStyle = '#000000';
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('TEST', 100, 180);

  // Bordure noire
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 200, 200);

  // Convertir en base64
  const dataURL = canvas.toDataURL('image/png');
  
  console.log(`📊 Image créée: ${dataURL.length} caractères`);
  console.log(`📋 Preview: ${dataURL.substring(0, 100)}...`);

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
    checkInPhoto: dataURL
  });

  console.log('✅ Photo mise à jour avec image très visible!');
  console.log('   Format: PNG 200x200 pixels');
  console.log('   Contenu: Visage rouge avec yeux et bouche noirs, texte "TEST"');
  console.log(`   Longueur: ${dataURL.length} caractères`);

  // Créer un fichier HTML de test
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Image Visible</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; }
        .image-test { margin: 20px 0; padding: 20px; border: 2px solid #ccc; }
        img { max-width: 200px; border: 2px solid #000; }
        .info { background: #f0f0f0; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🖼️ Test Image Très Visible</h1>
        
        <div class="info">
            <h3>Informations:</h3>
            <p><strong>Dimensions:</strong> 200x200 pixels</p>
            <p><strong>Contenu:</strong> Visage rouge avec yeux/bouche noirs + texte "TEST"</p>
            <p><strong>Longueur:</strong> ${dataURL.length} caractères</p>
            <p><strong>Format:</strong> ${dataURL.startsWith('data:image/png') ? 'PNG valide' : 'Format incorrect'}</p>
        </div>
        
        <div class="image-test">
            <h3>Image dans balise IMG:</h3>
            <img src="${dataURL}" alt="Test visible" 
                 onload="console.log('✅ Image chargée dans IMG')"
                 onerror="console.error('❌ Erreur dans IMG')">
        </div>
        
        <div class="image-test">
            <h3>Image en CSS background:</h3>
            <div style="width: 200px; height: 200px; border: 2px solid #000;
                        background-image: url('${dataURL}');
                        background-size: contain; background-repeat: no-repeat; 
                        background-position: center;">
            </div>
        </div>
        
        <div class="image-test">
            <h3>Même image dans un canvas:</h3>
            <canvas id="testCanvas" width="200" height="200" style="border: 2px solid #000;"></canvas>
            <script>
                const canvas = document.getElementById('testCanvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                img.onload = function() {
                    ctx.drawImage(img, 0, 0);
                    console.log('✅ Image dessinée dans canvas');
                };
                img.src = '${dataURL}';
            </script>
        </div>
    </div>
</body>
</html>`;

  const fs = require('fs');
  fs.writeFileSync('test-visible-image.html', html);
  
  console.log('📄 Fichier test créé: test-visible-image.html');
  console.log('🎯 Actions:');
  console.log('   1. Ouvrez test-visible-image.html dans votre navigateur');
  console.log('   2. Vous devriez voir un visage rouge très visible');
  console.log('   3. Si visible → Actualisez la page de vérification');
  console.log('   4. Si pas visible → Problème navigateur/CSS');

  process.exit(0);
}

createVisiblePhoto().catch(error => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});