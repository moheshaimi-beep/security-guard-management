const { User, Event, Assignment, Zone } = require('./src/models');

async function createTodayEvent() {
  try {
    console.log('📅 Création d\'un événement pour aujourd\'hui...');
    
    // Trouver l'agent mohammed eshaimi
    const agent = await User.findOne({ where: { cin: 'A303730' } });
    if (!agent) {
      throw new Error('Agent non trouvé');
    }
    console.log('👤 Agent trouvé:', agent.firstName, agent.lastName);
    
    // Trouver une zone existante
    const zone = await Zone.findOne();
    console.log('🗺️ Zone trouvée:', zone ? zone.name : 'Aucune');
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Créer un événement pour aujourd'hui
    const event = await Event.create({
      name: `Test Pointage - ${todayStr}`,
      description: 'Événement de test pour le pointage d\'aujourd\'hui',
      type: 'regular',
      location: 'Centre Commercial Rabat',
      latitude: 34.0209,
      longitude: -6.8414,
      geoRadius: 100,
      startDate: new Date(todayStr + ' 08:00:00'),
      endDate: new Date(todayStr + ' 20:00:00'),
      checkInTime: new Date(todayStr + ' 08:00:00'),
      checkOutTime: new Date(todayStr + ' 20:00:00'),
      status: 'active',
      priority: 'medium',
      requiredAgents: 1,
      createdBy: agent.id
    });
    
    console.log('✅ Événement créé:', event.name);
    console.log('   ID:', event.id);
    console.log('   Date:', event.startDate);
    
    // Créer l'affectation
    const assignment = await Assignment.create({
      agentId: agent.id,
      eventId: event.id,
      zoneId: zone?.id || null,
      role: 'primary',
      status: 'confirmed',
      startTime: event.checkInTime,
      endTime: event.checkOutTime,
      assignedBy: agent.id  // L'agent s'auto-assigne (ou utilisez un admin ID)
    });
    
    console.log('✅ Affectation créée:', assignment.id);
    console.log('   Status:', assignment.status);
    
    console.log('\n🎯 L\'agent peut maintenant se connecter et faire son pointage!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

createTodayEvent();