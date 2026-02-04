const axios = require('axios');

// Token du superviseur (à obtenir via login)
const SUPERVISOR_CIN = 'A303730';  // CIN du superviseur de test

async function testManagedEventsAPI() {
  try {
    console.log('🔍 Testing /api/supervisor/managed-events API...\n');

    // 1. D'abord se connecter via CIN pour obtenir un token
    console.log('1️⃣ Logging in as supervisor with CIN:', SUPERVISOR_CIN);
    const loginResponse = await axios.post('http://localhost:5000/api/auth/cin-login', {
      cin: SUPERVISOR_CIN
    });

    if (!loginResponse.data.success) {
      console.error('❌ Login failed:', loginResponse.data);
      return;
    }

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful, token obtained\n');

    // 2. Tester l'ancienne API (zones)
    console.log('2️⃣ Testing OLD API: /api/supervisor/managed-zones');
    const zonesResponse = await axios.get('http://localhost:5000/api/supervisor/managed-zones', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('📍 Zones response:', zonesResponse.data);
    if (zonesResponse.data.success) {
      console.log(`   Found ${zonesResponse.data.zones.length} zones:`);
      zonesResponse.data.zones.forEach(zone => {
        console.log(`   - ${zone.name} (Event ID: ${zone.eventId})`);
      });
    }
    console.log('');

    // 3. Tester la nouvelle API (événements)
    console.log('3️⃣ Testing NEW API: /api/supervisor/managed-events');
    const eventsResponse = await axios.get('http://localhost:5000/api/supervisor/managed-events', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('📅 Events response:', eventsResponse.data);
    if (eventsResponse.data.success) {
      console.log(`   Found ${eventsResponse.data.events.length} events:`);
      eventsResponse.data.events.forEach(event => {
        console.log(`   - ${event.name} (${event.managedZonesCount} zones gérées)`);
        console.log(`     Status: ${event.status}`);
        console.log(`     Dates: ${event.startDate} → ${event.endDate}`);
      });
    }
    console.log('');

    console.log('✅ All tests completed!');

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testManagedEventsAPI();
