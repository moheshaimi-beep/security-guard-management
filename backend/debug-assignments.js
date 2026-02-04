const db = require('./src/models');

(async () => {
  // Cherchez l'agent avec le CIN A303730
  const user = await db.User.findOne({ where: { cin: 'A303730' } });
  if (user) {
    console.log('User found:');
    console.log('ID:', user.id);
    console.log('CIN:', user.cin);
    console.log('Name:', user.firstName, user.lastName);
    console.log('');
    
    // Cherchez les affectations pour cet utilisateur
    const assignments = await db.Assignment.findAll({
      where: { agentId: user.id },
      include: [{
        model: db.Event,
        as: 'event'
      }]
    });
    
    console.log('Assignments found:', assignments.length);
    assignments.forEach((a, i) => {
      console.log(`  ${i+1}. Event: ${a.event?.name}, Status: ${a.status}, Start: ${a.event?.startDate}`);
    });
  } else {
    console.log('User with CIN A303730 not found');
  }
  process.exit(0);
})();
