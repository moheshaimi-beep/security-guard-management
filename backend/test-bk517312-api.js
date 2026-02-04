const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

(async () => {
  try {
    // 1. Login avec BK517312
    console.log('\n🔐 Login avec CIN BK517312...\n');
    const loginRes = await axios.post(`${API_URL}/auth/login-cin`, {
      cin: 'BK517312'
    });

    if (!loginRes.data.success) {
      console.error('❌ Login échoué:', loginRes.data.message);
      return;
    }

    const token = loginRes.data.data.token;
    const checkInToken = loginRes.data.data.checkInToken; // Token spécial pour check-in
    const user = loginRes.data.data.user;
    console.log('✅ Login réussi:', {
      nom: `${user.firstName} ${user.lastName}`,
      role: user.role,
      id: user.id
    });
    console.log('   Token:', token ? 'OK' : 'MANQUANT');
    console.log('   CheckInToken:', checkInToken ? 'OK' : 'MANQUANT');

    // 2. Récupérer les zones gérées (utiliser checkInToken)
    console.log('\n📍 Récupération des zones gérées...\n');
    const zonesRes = await axios.get(`${API_URL}/supervisor/managed-zones`, {
      headers: { Authorization: `Bearer ${checkInToken || token}` }
    });

    console.log('Zones gérées:', zonesRes.data.success ? `${zonesRes.data.zones?.length || 0} zones` : zonesRes.data.message);

    // 3. Récupérer les événements gérés
    console.log('\n📅 Récupération des événements gérés...\n');
    const eventsRes = await axios.get(`${API_URL}/supervisor/managed-events`, {
      headers: { Authorization: `Bearer ${checkInToken || token}` }
    });

    if (eventsRes.data.success) {
      const events = eventsRes.data.events || [];
      console.log(`✅ ${events.length} événement(s) géré(s):\n`);
      
      events.forEach((event, idx) => {
        console.log(`${idx + 1}. ${event.name}`);
        console.log(`   Status: ${event.status}`);
        console.log(`   Start: ${event.startDate}`);
        console.log(`   End: ${event.endDate}`);
        console.log(`   Zones: ${event.zones?.length || 0}`);
        if (event.zones && event.zones.length > 0) {
          event.zones.forEach(z => {
            console.log(`      - ${z.name} (${z.id})`);
          });
        }
        console.log('');
      });
    } else {
      console.log('❌ Erreur:', eventsRes.data.message);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
})();
