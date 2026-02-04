const { User, Event, Assignment } = require('./src/models');

async function checkAssignments() {
  try {
    const agent = await User.findOne({ where: { cin: 'A303730' } });
    console.log('👤 Agent:', agent.firstName, agent.lastName);
    
    const assignments = await Assignment.findAll({
      where: { 
        agentId: agent.id,
        status: 'confirmed'
      },
      include: [{
        model: Event,
        as: 'event'
      }]
    });
    
    console.log('📋 Affectations confirmées:', assignments.length);
    assignments.forEach(a => {
      console.log('  - Assignment ID:', a.id);
      console.log('    Status:', a.status);
      console.log('    Event:', a.event ? a.event.name : 'NO EVENT');
      console.log('    Event Date:', a.event ? a.event.startDate : 'N/A');
      console.log('    Event Status:', a.event ? a.event.status : 'N/A');
      console.log('    Today Check:', a.event ? a.event.startDate.toISOString().split('T')[0] : 'N/A');
    });
    
    const today = new Date().toISOString().split('T')[0];
    console.log('📅 Today:', today);
    
    process.exit(0);
  } catch(err) {
    console.error('Erreur:', err.message);
    process.exit(1);
  }
}

checkAssignments();