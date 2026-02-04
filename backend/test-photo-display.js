const mysql = require('mysql2/promise');

async function testPhotoDisplay() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });

  try {
    const [rows] = await connection.execute(`
      SELECT id, agentId, date, checkInPhoto 
      FROM attendance 
      WHERE checkInPhoto IS NOT NULL AND checkInPhoto != '' 
      ORDER BY createdAt DESC 
      LIMIT 1
    `);

    if (rows.length === 0) {
      console.log('❌ Aucune photo trouvée');
      return;
    }

    const photo = rows[0];
    console.log('📸 Photo trouvée:', {
      id: photo.id,
      agent: photo.agentId,
      date: photo.date,
      photoLength: photo.checkInPhoto.length,
      isBase64: photo.checkInPhoto.startsWith('data:image/')
    });

    // Créer un fichier HTML pour tester l'affichage
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Photo Display</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        img { max-width: 300px; border: 2px solid #ccc; margin: 10px 0; }
        .info { background: #f5f5f5; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>Test d'affichage de photo</h1>
    
    <div class="info">
        <h3>Informations de la photo:</h3>
        <p><strong>ID:</strong> ${photo.id}</p>
        <p><strong>Agent:</strong> ${photo.agentId}</p>
        <p><strong>Date:</strong> ${photo.date}</p>
        <p><strong>Longueur:</strong> ${photo.checkInPhoto.length} caractères</p>
        <p><strong>Format valide:</strong> ${photo.checkInPhoto.startsWith('data:image/') ? 'Oui' : 'Non'}</p>
        <p><strong>Preview:</strong> ${photo.checkInPhoto.substring(0, 100)}...</p>
    </div>
    
    <h3>Image affichée:</h3>
    <img src="${photo.checkInPhoto}" alt="Photo de pointage" 
         onload="console.log('✅ Image chargée avec succès')" 
         onerror="console.error('❌ Erreur chargement image')">
    
    <h3>Test en CSS background:</h3>
    <div style="width: 200px; height: 200px; border: 2px solid #ccc; 
                background-image: url('${photo.checkInPhoto}'); 
                background-size: cover; background-position: center;">
    </div>
</body>
</html>
    `;

    const fs = require('fs');
    fs.writeFileSync('test-photo-display.html', html);
    
    console.log('✅ Fichier HTML créé: test-photo-display.html');
    console.log('🌐 Ouvrez ce fichier dans votre navigateur pour tester l\'affichage');
    
  } finally {
    await connection.end();
  }
}

testPhotoDisplay().catch(console.error);