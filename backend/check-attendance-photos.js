const { Attendance, User } = require('./src/models');

async function checkAttendancePhotos() {
  try {
    console.log('📸 Vérification des photos de pointage...\n');
    
    // Récupérer les pointages récents avec photos
    const attendances = await Attendance.findAll({
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'firstName', 'lastName', 'cin']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log(`📋 ${attendances.length} pointages trouvés:`);
    
    attendances.forEach((att, i) => {
      console.log(`\n${i + 1}. Agent: ${att.agent?.firstName} ${att.agent?.lastName} (${att.agent?.cin})`);
      console.log(`   ID: ${att.id}`);
      console.log(`   Date: ${att.date}`);
      console.log(`   Check-in Photo: ${att.checkInPhoto ? 'PRÉSENTE ✅' : 'ABSENTE ❌'}`);
      console.log(`   Check-out Photo: ${att.checkOutPhoto ? 'PRÉSENTE ✅' : 'ABSENTE ❌'}`);
      
      if (att.checkInPhoto) {
        console.log(`   Photo Check-in Length: ${att.checkInPhoto.length} caractères`);
        console.log(`   Photo Check-in Start: ${att.checkInPhoto.substring(0, 50)}...`);
      }
      
      if (att.checkOutPhoto) {
        console.log(`   Photo Check-out Length: ${att.checkOutPhoto.length} caractères`);
        console.log(`   Photo Check-out Start: ${att.checkOutPhoto.substring(0, 50)}...`);
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

checkAttendancePhotos();