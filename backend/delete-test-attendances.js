const { Attendance } = require('./src/models');

async function deleteTestAttendances() {
  try {
    console.log('🗑️ Suppression des pointages de test...');
    
    const deleted = await Attendance.destroy({
      where: {
        notes: 'Test pointage pour A303730'
      }
    });
    
    console.log(`✅ ${deleted} pointage(s) de test supprimé(s)`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

deleteTestAttendances();