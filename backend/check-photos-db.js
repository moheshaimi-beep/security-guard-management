const { Attendance } = require('./src/models');
const { Op } = require('sequelize');

async function checkPhotos() {
  try {
    console.log('🔍 Vérification des photos en base...');
    
    const attendances = await Attendance.findAll({
      where: { 
        checkInPhoto: { 
          [Op.not]: null,
          [Op.ne]: ''
        } 
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log(`\n📋 Trouvé ${attendances.length} pointages avec photos:`);
    
    attendances.forEach((att, i) => {
      const photoLength = att.checkInPhoto ? att.checkInPhoto.length : 0;
      const preview = att.checkInPhoto ? att.checkInPhoto.substring(0, 80) + '...' : 'NULL';
      console.log(`\n${i+1}. ID: ${att.id}`);
      console.log(`   Agent: ${att.agentId}`);
      console.log(`   Date: ${att.date}`);
      console.log(`   CheckIn: ${att.checkInTime}`);
      console.log(`   Photo longueur: ${photoLength} caractères`);
      console.log(`   Photo preview: ${preview}`);
      
      // Vérifier le format base64
      if (att.checkInPhoto) {
        const isValidBase64 = att.checkInPhoto.startsWith('data:image/');
        const hasComma = att.checkInPhoto.includes(',');
        console.log(`   ✅ Format data:image/: ${isValidBase64}`);
        console.log(`   ✅ Contient virgule: ${hasComma}`);
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkPhotos();