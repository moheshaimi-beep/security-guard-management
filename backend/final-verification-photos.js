const { Attendance, User, Event } = require('./src/models');

async function finalVerificationPhotos() {
  try {
    console.log('🎯 VÉRIFICATION FINALE - Photos de pointage\n');
    
    // 1. Vérifier les pointages avec photos
    console.log('1️⃣ Pointages avec photos dans la base:');
    const attendancesWithPhotos = await Attendance.findAll({
      where: {
        checkInPhoto: { [require('sequelize').Op.ne]: null }
      },
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['firstName', 'lastName', 'cin', 'profilePhoto']
        },
        {
          model: Event,
          as: 'event',
          attributes: ['name']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    if (attendancesWithPhotos.length === 0) {
      console.log('   ❌ Aucun pointage avec photo trouvé');
      return;
    }
    
    console.log(`   ✅ ${attendancesWithPhotos.length} pointage(s) avec photo trouvé(s):`);
    
    attendancesWithPhotos.forEach((att, i) => {
      console.log(`\n   ${i + 1}. Agent: ${att.agent.firstName} ${att.agent.lastName} (${att.agent.cin})`);
      console.log(`      Event: ${att.event.name}`);
      console.log(`      Date: ${att.date}`);
      console.log(`      Check-in Time: ${att.checkInTime}`);
      console.log(`      Photo pointage: ${att.checkInPhoto.length} caractères`);
      console.log(`      Photo profil: ${att.agent.profilePhoto ? att.agent.profilePhoto.length + ' caractères' : 'ABSENTE ❌'}`);
      
      // Vérifier que les deux photos sont présentes
      const hasCheckInPhoto = att.checkInPhoto && att.checkInPhoto.length > 0;
      const hasProfilePhoto = att.agent.profilePhoto && att.agent.profilePhoto.length > 0;
      
      console.log(`      ✅ Données complètes pour vérification: ${hasCheckInPhoto && hasProfilePhoto ? 'OUI ✅' : 'NON ❌'}`);
    });
    
    // 2. Instructions pour vérifier sur l'interface
    console.log('\n2️⃣ Instructions pour vérifier sur l\'interface:');
    console.log('   📍 Pages à vérifier:');
    console.log('      • http://localhost:3000/attendance-verification');
    console.log('');
    console.log('   🔑 Connexion:');
    console.log('      • Email: admin@securityguard.com');
    console.log('      • Password: Admin@123');
    console.log('');
    console.log('   👁️ Ce que vous devriez voir:');
    console.log('      • Le pointage de mohammed eshaimi (A303730) dans la liste');
    console.log('      • En cliquant sur "Voir" : Modal avec photo de pointage ET photo de référence');
    console.log('      • Score de confiance et vérification faciale automatique');
    console.log('');
    console.log('   🎯 Si les photos n\'apparaissent pas:');
    console.log('      1. Actualisez la page (F5)');
    console.log('      2. Videz le cache du navigateur (Ctrl+Shift+R)');
    console.log('      3. Vérifiez la console du navigateur (F12) pour d\'éventuelles erreurs');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

finalVerificationPhotos();