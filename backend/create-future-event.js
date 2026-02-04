const { Event } = require('./src/models');

async function createFutureEvent() {
  try {
    const futureEvent = await Event.create({
      name: 'Test Future Event',
      description: 'Événement test pour vérifier le statut "scheduled"',
      type: 'regular',
      location: 'Test Location',
      startDate: '2026-01-28', // Dans 3 jours
      endDate: '2026-01-28',
      checkInTime: '10:00:00', // 10h00
      checkOutTime: '18:00:00',
      lateThreshold: 15,
      agentCreationBuffer: 120, // 2 heures en minutes
      requiredAgents: 5,
      status: 'scheduled',
      priority: 'medium',
      createdBy: '3ae0b39b-81aa-4ed6-99e7-4a49814942fd' // Supervisor BK517312
    });

    console.log('\n✅ Événement futur créé:');
    console.log('ID:', futureEvent.id);
    console.log('Nom:', futureEvent.name);
    console.log('Date début:', futureEvent.startDate);
    console.log('Check-in:', futureEvent.checkInTime);
    console.log('Buffer:', futureEvent.agentCreationBuffer, 'minutes');
    console.log('\nLa fenêtre de check-in ouvrira le 28/01/2026 à 08:00 (10:00 - 2h)');
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

createFutureEvent();
