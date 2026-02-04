const { Attendance, User, Event, Assignment } = require('./src/models');

async function createTestAttendance() {
  try {
    console.log('🟢 Création d\'un pointage de test...');
    
    // Récupérer l'agent de test
    const agent = await User.findOne({
      where: { cin: 'AB999999' }
    });
    
    if (!agent) {
      console.error('❌ Agent de test non trouvé');
      return;
    }
    
    console.log(`👤 Agent trouvé: ${agent.firstName} ${agent.lastName} (${agent.cin})`);
    
    // Récupérer ou créer un événement
    let event = await Event.findOne();
    
    if (!event) {
      event = await Event.create({
        name: 'Événement Test',
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        location: 'Centre-ville',
        latitude: 36.8485,
        longitude: 10.2422,
        clientName: 'Client Test',
        requiredAgents: 1,
        status: 'active',
        type: 'corporate_event'
      });
      console.log(`📅 Événement créé: ${event.name}`);
    } else {
      console.log(`📅 Événement existant: ${event.name}`);
    }
    
    // Créer ou vérifier l'assignment - pas nécessaire pour le test
    console.log('📋 Skipping assignment pour le test');
    
    
    // Créer un pointage de test
    const now = new Date();
    const checkInTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 heures avant maintenant
    
    const attendance = await Attendance.create({
      agentId: agent.id,
      eventId: event.id,
      date: now.toISOString().split('T')[0],
      checkInTime: checkInTime,
      checkInLatitude: 36.8485,
      checkInLongitude: 10.2422,
      checkInMethod: 'facial',
      status: 'present',
      notes: 'Check-in de test via simulation'
    });
    
    console.log(`✅ Pointage créé avec succès!`);
    console.log(`   ID: ${attendance.id}`);
    console.log(`   Agent: ${agent.firstName} ${agent.lastName}`);
    console.log(`   Date: ${attendance.date}`);
    console.log(`   Check-in: ${attendance.checkInTime}`);
    console.log(`   Status: ${attendance.status}`);
    
    // Vérifier maintenant tous les pointages
    console.log('\n📊 Vérification de tous les pointages...');
    
    const allAttendance = await Attendance.findAll({
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
    
    console.log(`📋 Total: ${allAttendance.length} pointages dans la base:`);
    
    allAttendance.forEach((att, i) => {
      console.log(`\n${i + 1}. ID: ${att.id} | Agent: ${att.agent?.firstName} ${att.agent?.lastName} | Status: ${att.status}`);
      console.log(`   Date: ${att.date} | Check-in: ${att.checkInTime}`);
      console.log(`   Event: ${att.event?.name}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

createTestAttendance();