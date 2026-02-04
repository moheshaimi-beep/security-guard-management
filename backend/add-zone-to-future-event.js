const { Zone } = require('./src/models');
const { v4: uuidv4 } = require('uuid');

async function addZoneToFutureEvent() {
  try {
    const supervisorId = '3ae0b39b-81aa-4ed6-99e7-4a49814942fd';
    
    // Trouver l'ID de "Test Future Event"
    const { Event } = require('./src/models');
    const futureEvent = await Event.findOne({
      where: { name: 'Test Future Event' }
    });
    
    if (!futureEvent) {
      console.log('❌ Événement "Test Future Event" non trouvé');
      process.exit(1);
    }
    
    console.log('✅ Événement trouvé:', futureEvent.name, 'ID:', futureEvent.id);
    
    // Créer une zone pour cet événement
    const zone = await Zone.create({
      id: uuidv4(),
      name: 'Zone Test Future',
      eventId: futureEvent.id,
      supervisors: [supervisorId],
      capacity: 10
    });
    
    console.log('✅ Zone créée:', zone.name);
    console.log('   Event:', futureEvent.name);
    console.log('   Supervisor:', supervisorId);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

addZoneToFutureEvent();
