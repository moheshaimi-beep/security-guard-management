const axios = require('axios');

async function testAPI() {
  try {
    console.log('🌐 Test de l\'API /api/attendance...');
    
    const response = await axios.get('http://localhost:5000/api/attendance', {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📦 Nombre d'enregistrements: ${response.data.length}`);
    
    // Chercher les enregistrements avec photos
    const withPhotos = response.data.filter(item => item.checkInPhoto && item.checkInPhoto.length > 0);
    console.log(`🖼️ Avec photos: ${withPhotos.length}`);
    
    if (withPhotos.length > 0) {
      const first = withPhotos[0];
      console.log('\n📋 Premier enregistrement avec photo:');
      console.log(`   ID: ${first.id}`);
      console.log(`   Agent: ${first.agentId}`);
      console.log(`   Date: ${first.date}`);
      console.log(`   Photo longueur: ${first.checkInPhoto.length} caractères`);
      console.log(`   Photo preview: ${first.checkInPhoto.substring(0, 80)}...`);
      console.log(`   Format valide: ${first.checkInPhoto.startsWith('data:image/')}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur API:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('🔧 Le serveur backend n\'est pas démarré sur le port 8000');
    }
  }
}

testAPI();