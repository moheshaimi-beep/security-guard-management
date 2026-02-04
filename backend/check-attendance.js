const { Attendance, User, Event } = require('./src/models');

async function checkRecentAttendance() {
  try {
    console.log('📊 Vérification des pointages récents...');
    
    const recentAttendance = await Attendance.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'firstName', 'lastName', 'cin']
        },
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'startDate']
        }
      ]
    });
    
    console.log(`📋 ${recentAttendance.length} pointages récents trouvés:`);
    
    recentAttendance.forEach((attendance, i) => {
      console.log(`\n${i + 1}. Attendance ID: ${attendance.id}`);
      console.log(`   Agent: ${attendance.agent?.firstName} ${attendance.agent?.lastName} (${attendance.agent?.cin})`);
      console.log(`   Date: ${attendance.date}`);
      console.log(`   Check-in: ${attendance.checkInTime || 'N/A'}`);
      console.log(`   Check-out: ${attendance.checkOutTime || 'N/A'}`);
      console.log(`   Status: ${attendance.status}`);
      console.log(`   Event: ${attendance.event?.name || 'N/A'}`);
      console.log(`   Créé: ${attendance.createdAt}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Erreur:', err.message);
    process.exit(1);
  }
}

checkRecentAttendance();