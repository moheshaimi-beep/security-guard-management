const { Event } = require('./src/models');
const { computeEventStatus } = require('./src/utils/eventHelpers');

(async () => {
  try {
    const events = await Event.findAll({ 
      where: { 
        status: { 
          [require('sequelize').Op.notIn]: ['cancelled', 'terminated'] 
        } 
      } 
    });
    
    console.log(`\n🔄 Vérification de ${events.length} événements...\n`);
    
    for (const event of events) {
      const correctStatus = computeEventStatus(event);
      
      if (correctStatus !== event.status) {
        await event.update({ status: correctStatus });
        console.log(`✅ "${event.name}": ${event.status} → ${correctStatus}`);
      } else {
        console.log(`✓ "${event.name}": ${event.status} (OK)`);
      }
    }
    
    console.log('\n✅ Terminé!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
})();
