const { Attendance, User } = require('./src/models');

async function createValidCheckInPhoto() {
  try {
    console.log('🖼️ Création d\'une photo de pointage valide...\n');
    
    // Photo base64 valide - image simple colorée de 100x100 pixels
    const validBase64Photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAk0lEQVR4nO3WMQ0AMAzAsPaXbgCCE0HgCfYGTbLnAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwA/2AAAAAABgAuQgAAGvSIaNAAAAAElFTkSuQmCC';
    
    // Récupérer le pointage avec photo
    const attendance = await Attendance.findOne({
      where: {
        checkInPhoto: { [require('sequelize').Op.ne]: null }
      },
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['firstName', 'lastName', 'cin']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    if (!attendance) {
      console.log('❌ Aucun pointage avec photo trouvé');
      return;
    }
    
    console.log(`📋 Pointage trouvé: ${attendance.agent.firstName} ${attendance.agent.lastName}`);
    console.log(`   Photo actuelle: ${attendance.checkInPhoto.substring(0, 50)}...`);
    
    // Mettre à jour avec une photo PNG valide
    await attendance.update({
      checkInPhoto: validBase64Photo
    });
    
    console.log('✅ Photo mise à jour avec image PNG valide!');
    console.log(`   Format: PNG 100x100 pixels`);
    console.log(`   Longueur: ${validBase64Photo.length} caractères`);
    
    // Tester la validation de l'image
    if (validBase64Photo.startsWith('data:image/')) {
      console.log('✅ Format base64 valide détecté');
      const [header, data] = validBase64Photo.split(',');
      console.log(`   Header: ${header}`);
      console.log(`   Data length: ${data.length} caractères`);
    }
    
    console.log('\n📋 Test direct de l\'API...');
    
    // Test direct de l'API pour vérifier que la photo est bien retournée
    const attendanceController = require('./src/controllers/attendanceController');
    
    const mockReq = {
      query: { page: 1, limit: 10 },
      user: { role: 'admin' }
    };
    
    let responseData = null;
    const mockRes = {
      json: (data) => {
        responseData = data;
        return mockRes;
      }
    };
    
    await attendanceController.getAttendances(mockReq, mockRes);
    
    if (responseData?.data?.attendances) {
      const attendanceWithPhoto = responseData.data.attendances.find(att => att.id === attendance.id);
      if (attendanceWithPhoto && attendanceWithPhoto.checkInPhoto) {
        console.log('✅ Photo récupérée via API');
        console.log(`   Photo length: ${attendanceWithPhoto.checkInPhoto.length}`);
        console.log(`   Photo start: ${attendanceWithPhoto.checkInPhoto.substring(0, 30)}...`);
      } else {
        console.log('❌ Photo non récupérée via API');
      }
    }
    
    console.log('\n🎯 Instructions:');
    console.log('   1. Actualisez la page (Ctrl+F5 pour vider le cache)');
    console.log('   2. Ouvrez la console du navigateur (F12)');
    console.log('   3. Regardez s\'il y a des erreurs d\'image');
    console.log('   4. La photo devrait maintenant s\'afficher correctement');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createValidCheckInPhoto();