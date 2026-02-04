const { Attendance } = require('./src/models');

async function createLargerTestPhoto() {
  try {
    console.log('🖼️ Création d\'une photo de test plus grande...\n');
    
    // Image base64 plus grande et colorée (200x200 pixels, format PNG)
    const largeTestPhoto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFH0lEQVR4nO3d227bRhSFUTsy//+VnZfWQArUQG4nOWdm1loJ0MIwYvGbS5LT7/f7/QsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeOz9/f1rv9/v39/f3/9tvSfwJsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZBINgiGQQDIIhkkEwCIZIBsEgGCIZ/wBQ+MsFyOq5CAAAAABJRU5ErkJggg==';
    
    // Récupérer le pointage
    const attendance = await Attendance.findOne({
      where: {
        checkInPhoto: { [require('sequelize').Op.ne]: null }
      },
      order: [['createdAt', 'DESC']]
    });
    
    if (!attendance) {
      console.log('❌ Aucun pointage trouvé');
      return;
    }
    
    console.log(`📋 Mise à jour du pointage: ${attendance.id}`);
    
    // Mettre à jour avec la nouvelle photo
    await attendance.update({
      checkInPhoto: largeTestPhoto
    });
    
    console.log('✅ Photo mise à jour!');
    console.log(`   Format: PNG 200x200 pixels (carré bleu clair)`);
    console.log(`   Longueur: ${largeTestPhoto.length} caractères`);
    
    // Test de l'image dans un navigateur (créer un fichier HTML temporaire)
    const fs = require('fs');
    const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Photo</title>
</head>
<body>
    <h1>Test de la photo de pointage</h1>
    <img src="${largeTestPhoto}" alt="Test photo" style="border: 2px solid #333; max-width: 300px;">
    <p>Si vous voyez une image bleue, la photo fonctionne correctement!</p>
</body>
</html>`;
    
    fs.writeFileSync('./test-photo.html', testHtml);
    console.log('\n📄 Fichier test créé: test-photo.html');
    console.log('   Ouvrez ce fichier dans votre navigateur pour vérifier l\'image');
    
    console.log('\n🎯 Actions:');
    console.log('   1. Ouvrez test-photo.html dans le navigateur');
    console.log('   2. Si l\'image s\'affiche → Actualisez la page de vérification');
    console.log('   3. Si l\'image ne s\'affiche pas → Problème de format base64');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

createLargerTestPhoto();