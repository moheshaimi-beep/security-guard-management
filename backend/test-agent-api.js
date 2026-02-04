const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

(async () => {
  try {
    // 1. Login avec A303730
    console.log('\n🔐 Login avec CIN A303730 (mohammed eshaimi)...\n');
    const loginRes = await axios.post(`${API_URL}/auth/login-cin`, {
      cin: 'A303730'
    });

    if (!loginRes.data.success) {
      console.error('❌ Login échoué:', loginRes.data.message);
      return;
    }

    const token = loginRes.data.data.token;
    const checkInToken = loginRes.data.data.checkInToken;
    const user = loginRes.data.data.user;
    console.log('✅ Login réussi:', {
      nom: `${user.firstName} ${user.lastName}`,
      role: user.role,
      id: user.id
    });
    console.log('   Token:', token ? 'OK' : 'MANQUANT');
    console.log('   CheckInToken:', checkInToken ? 'OK' : 'MANQUANT');

    // 2. Récupérer les événements de l'agent
    console.log('\n📅 Récupération des événements de l\'agent...\n');
    const eventsRes = await axios.get(`${API_URL}/events/my-events`, {
      headers: { Authorization: `Bearer ${checkInToken || token}` }
    });

    if (eventsRes.data.success) {
      const events = eventsRes.data.data || [];
      console.log(`✅ ${events.length} événement(s) trouvé(s):\n`);
      
      events.forEach((event, idx) => {
        console.log(`${idx + 1}. ${event.name}`);
        console.log(`   Status: ${event.status}`);
        console.log(`   Start: ${event.startDate}`);
        console.log(`   End: ${event.endDate}`);
        console.log(`   Zone: ${event.zone ? event.zone.name : '(aucune)'}`);
        console.log(`   Assignment Status: ${event.assignmentStatus}`);
        console.log('');
      });
    } else {
      console.log('❌ Erreur:', eventsRes.data.message);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
})();
