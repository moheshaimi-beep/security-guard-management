const { Event } = require('./src/models');

async function checkEventStatus() {
  try {
    console.log('📅 Vérification du statut de l\'événement...\n');
    
    const event = await Event.findOne({
      where: { id: '35f240c9-bf83-4db2-933f-f0ebd73122b2' }
    });
    
    if (!event) {
      console.log('❌ Événement non trouvé');
      return;
    }
    
    console.log('🎯 Événement trouvé:');
    console.log(`   Name: ${event.name}`);
    console.log(`   Status: ${event.status}`);
    console.log(`   Start Date: ${event.startDate}`);
    console.log(`   End Date: ${event.endDate}`);
    console.log(`   Location: ${event.location}`);
    console.log(`   Check-in Time: ${event.checkInTime}`);
    console.log(`   Check-out Time: ${event.checkOutTime}`);
    console.log(`   Type: ${event.type}`);
    
    // Vérifier si la date d'aujourd'hui est dans la plage
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    console.log(`\n📊 Vérification des dates:`);
    console.log(`   Aujourd'hui: ${todayStr} (${today.toLocaleDateString()})`);
    console.log(`   Start: ${event.startDate}`);
    console.log(`   End: ${event.endDate}`);
    
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    
    console.log(`   Start Date obj: ${startDate.toISOString()}`);
    console.log(`   End Date obj: ${endDate.toISOString()}`);
    console.log(`   Today obj: ${today.toISOString()}`);
    
    const isToday = todayStr >= event.startDate && todayStr <= event.endDate;
    console.log(`   Est dans la plage: ${isToday ? 'OUI ✅' : 'NON ❌'}`);
    
    // Si pas dans la plage, corriger l'événement
    if (!isToday) {
      console.log('\n🔧 Correction de l\'événement pour aujourd\'hui...');
      
      await event.update({
        startDate: todayStr,
        endDate: todayStr,
        status: 'active'
      });
      
      console.log('✅ Événement mis à jour avec les dates d\'aujourd\'hui');
      console.log(`   Nouvelle Start Date: ${todayStr}`);
      console.log(`   Nouvelle End Date: ${todayStr}`);
      console.log(`   Status: active`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

checkEventStatus();