const { Event } = require('./src/models');

async function testEventStatus() {
  try {
    const event = await Event.findOne({
      where: { name: 'barca vs real' }
    });
    
    if (!event) {
      console.log('❌ Event not found');
      return;
    }
    
    console.log('\n=== Event: barca vs real ===');
    console.log('startDate:', event.startDate);
    console.log('endDate:', event.endDate);
    console.log('checkInTime:', event.checkInTime);
    console.log('checkOutTime:', event.checkOutTime);
    console.log('agentCreationBuffer:', event.agentCreationBuffer);
    console.log('DB status:', event.status);
    
    // Reproduire la logique du frontend
    const now = new Date();
    console.log('\nNow:', now.toISOString());
    
    // Calculer eventStart (checkInTime - buffer)
    const startDateStr = event.startDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const checkInTime = event.checkInTime || '00:00:00';
    const eventStartStr = `${startDateStr}T${checkInTime}`;
    const eventStart = new Date(eventStartStr);
    // CORRECTION: agentCreationBuffer est en MINUTES, pas en heures
    const bufferHours = (event.agentCreationBuffer || 120) / 60;
    eventStart.setHours(eventStart.getHours() - bufferHours);
    
    console.log('Event start (checkInTime - buffer):', eventStart.toISOString());
    console.log('Comparison: now >= eventStart?', now >= eventStart);
    
    // Calculer eventEnd (checkOutTime)
    const endDateStr = event.endDate.toISOString().split('T')[0];
    const checkOutTime = event.checkOutTime || '23:59:00';
    const eventEndStr = `${endDateStr}T${checkOutTime}`;
    const eventEnd = new Date(eventEndStr);
    
    console.log('Event end:', eventEnd.toISOString());
    console.log('Comparison: now > eventEnd?', now > eventEnd);
    console.log('Comparison: now >= eventStart && now <= eventEnd?', now >= eventStart && now <= eventEnd);
    
    let computedStatus;
    if (now > eventEnd) {
      computedStatus = 'completed';
    } else if (now >= eventStart && now <= eventEnd) {
      computedStatus = 'active';
    } else if (now < eventStart) {
      computedStatus = 'scheduled';
    } else {
      computedStatus = 'unknown';
    }
    
    console.log('\n✅ Computed status:', computedStatus);
    console.log('Should display?', !['completed', 'terminated', 'cancelled'].includes(computedStatus));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testEventStatus();
