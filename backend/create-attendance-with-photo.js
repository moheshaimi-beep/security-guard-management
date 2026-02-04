const { Attendance, User, Event } = require('./src/models');

async function createAttendanceWithPhoto() {
  try {
    console.log('📸 Création d\'un pointage avec photo de test...\n');
    
    // Récupérer l'utilisateur A303730
    const user = await User.findOne({
      where: { cin: 'A303730' }
    });
    
    if (!user) {
      console.log('❌ Utilisateur A303730 non trouvé');
      return;
    }
    
    // Récupérer l'événement
    const event = await Event.findOne({
      where: { name: 'Test Pointage - 2026-01-21' }
    });
    
    if (!event) {
      console.log('❌ Événement non trouvé');
      return;
    }
    
    // Supprimer l'ancien pointage s'il existe
    await Attendance.destroy({
      where: {
        agentId: user.id,
        eventId: event.id,
        date: '2026-01-21'
      }
    });
    
    // Photo de test en base64 (petit carré rouge)
    const testPhotoBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyLli5xc+ZNqoooMCNYl0aKKKAFYKKKKBpOKDyGjP8AU7hUYklR8QvJRRQB//Z';
    
    // Créer un nouveau pointage avec photo
    const attendance = await Attendance.create({
      agentId: user.id,
      eventId: event.id,
      date: '2026-01-21',
      checkInTime: new Date(),
      checkInLatitude: 36.8485,
      checkInLongitude: 10.2422,
      checkInPhoto: testPhotoBase64,
      checkInMethod: 'facial',
      status: 'present',
      notes: 'Pointage avec photo de test'
    });
    
    console.log(`✅ Pointage avec photo créé: ${attendance.id}`);
    console.log(`   Agent: ${user.firstName} ${user.lastName}`);
    console.log(`   Photo Length: ${testPhotoBase64.length} caractères`);
    
    // Vérifier que la photo est bien sauvée
    const verifyAttendance = await Attendance.findOne({
      where: { id: attendance.id }
    });
    
    console.log(`\n📸 Vérification photo dans la base:`);
    console.log(`   Photo présente: ${verifyAttendance.checkInPhoto ? 'OUI ✅' : 'NON ❌'}`);
    if (verifyAttendance.checkInPhoto) {
      console.log(`   Photo length: ${verifyAttendance.checkInPhoto.length} caractères`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

createAttendanceWithPhoto();