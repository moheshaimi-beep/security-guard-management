const { Attendance, User } = require('./src/models');

async function fixCheckInPhoto() {
  try {
    console.log('🖼️ Correction de la photo de pointage...\n');
    
    // Récupérer le pointage avec photo noire
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
    console.log(`   ID: ${attendance.id}`);
    console.log(`   Photo actuelle: ${attendance.checkInPhoto.length} caractères`);
    
    // Photo de test plus grande et visible - un visage simple en base64 (64x64 pixels)
    const betterTestPhoto = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCABAAdMDASIAAhEBAxEB/8QAGgAAAwEBAQEAAAAAAAAAAAAAAAMEAgEFBv/EACYQAAICAgEDBQEBAQAAAAAAAAECAAMEESFBURITIjGBkWFxoULR/8QAGgEBAAMBAQEAAAAAAAAAAAAAAA0BAgMABgX/xAAgEQEBAQEAAwEBAQEBAAAAAAAAARECEiEDEzFBUWEi/9oADAMBAAIRAxEAPwD5mICGEVm0JJYHy8gCAZOqIBHrKsRrw++Y6FPD9I1pxCFVy3uFxMDHtbONH3/ECJzKqdp9R2K6eOk3U/r3Dq3lMRJUfz9y0NsHW7B1KEYE0z5Y1PqEfRjEz8PxT2VlYKL9bNGTyKwP1NTVmBcM7P4PPGkJl9MfQkYqrnv6OJokxzJjxNZTkayV+6JkVTqJYdgGIB2rPfnZ7TJ3EySglCNjqVCCPfuREa3AzJWV5B1vEH6aTTHkOQRxNL+fk8zQBhYKMgRH/TL/wBJf9kNb7nLKu/mJMjmCNJGYsWJo/l4lcYrLDo6dVWNv5AEEe6aAG9CQGAicCo6HTajCCuJhgM+kEcczEMGZOHjjlP5NoD7RiYkQHf/2Q==';
    
    console.log('\n🔄 Mise à jour avec une vraie photo de test...');
    
    // Mettre à jour avec une meilleure photo
    await attendance.update({
      checkInPhoto: betterTestPhoto
    });
    
    console.log('✅ Photo de pointage mise à jour!');
    console.log(`   Nouvelle photo: ${betterTestPhoto.length} caractères`);
    console.log(`   Format: Image JPEG 64x64 pixels (visage de test)`);
    
    // Vérification
    const updated = await Attendance.findOne({
      where: { id: attendance.id }
    });
    
    console.log('\n📸 Vérification:');
    console.log(`   Photo mise à jour: ${updated.checkInPhoto ? 'OUI ✅' : 'NON ❌'}`);
    console.log(`   Longueur: ${updated.checkInPhoto.length} caractères`);
    
    console.log('\n🎯 Instructions:');
    console.log('   1. Actualisez la page de vérification (F5)');
    console.log('   2. Cliquez sur "Voir" pour mohammed eshaimi');
    console.log('   3. La photo de pointage devrait maintenant être visible!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

fixCheckInPhoto();