const axios = require('axios');

/**
 * Test complet du flow de connexion CIN
 */
async function testCinLoginFlow() {
  try {
    console.log('🔐 TEST: Connexion avec CIN BK517312...\n');
    
    // 1. Login avec CIN
    const loginRes = await axios.post('http://localhost:5000/api/auth/login-cin', {
      cin: 'BK517312'
    });
    
    console.log('✅ Connexion réussie');
    console.log('Response data:', JSON.stringify(loginRes.data, null, 2));
    
    const responseData = loginRes.data.data;
    const { user } = responseData;
    const checkInToken = responseData.checkInToken;
    const accessToken = responseData.accessToken;
    
    console.log('\n👤 User:', {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      cin: user.cin
    });
    
    console.log('\n🔑 Tokens:', {
      hasCheckInToken: !!checkInToken,
      hasAccessToken: !!accessToken,
      checkInToken: checkInToken ? checkInToken.substring(0, 30) + '...' : 'null',
      accessToken: accessToken ? accessToken.substring(0, 30) + '...' : 'null'
    });
    
    // 2. Récupérer les affectations avec checkInToken
    console.log('\n\n📋 TEST: Récupération des affectations avec checkInToken...');
    try {
      const assignRes = await axios.get('http://localhost:5000/api/assignments/my-assignments', {
        headers: {
          Authorization: `Bearer ${checkInToken}`
        },
        params: {
          status: 'confirmed',
          today: 'true'
        }
      });
      
      console.log('✅ Affectations récupérées avec checkInToken');
      console.log(`Nombre: ${assignRes.data.data.length}`);
      assignRes.data.data.forEach((a, i) => {
        console.log(`  ${i + 1}. Event: ${a.event?.name || 'N/A'}`);
        console.log(`     Start: ${a.event?.startDate || 'N/A'}`);
        console.log(`     Status: ${a.status}`);
        console.log(`     Has event object: ${!!a.event}`);
      });
    } catch (err) {
      console.error('❌ Erreur avec checkInToken:', err.response?.data || err.message);
    }
    
    // 3. Récupérer les affectations avec accessToken
    if (accessToken) {
      console.log('\n\n📋 TEST: Récupération des affectations avec accessToken...');
      try {
        const assignRes = await axios.get('http://localhost:5000/api/assignments/my-assignments', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          params: {
            status: 'confirmed',
            today: 'true'
          }
        });
        
        console.log('✅ Affectations récupérées avec accessToken');
        console.log(`Nombre: ${assignRes.data.data.length}`);
        assignRes.data.data.forEach((a, i) => {
          console.log(`  ${i + 1}. Event: ${a.event?.name || 'N/A'}`);
          console.log(`     Start: ${a.event?.startDate || 'N/A'}`);
          console.log(`     Status: ${a.status}`);
          console.log(`     Has event object: ${!!a.event}`);
        });
      } catch (err) {
        console.error('❌ Erreur avec accessToken:', err.response?.data || err.message);
      }
    }
    
    // 4. Test de la logique frontend de filtrage
    console.log('\n\n🔍 TEST: Simulation de la logique frontend...');
    const assignRes = await axios.get('http://localhost:5000/api/assignments/my-assignments', {
      headers: {
        Authorization: `Bearer ${checkInToken}`
      },
      params: {
        status: 'confirmed',
        today: 'true'
      }
    });
    
    const assignments = assignRes.data.data || [];
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const today = now.toISOString().split('T')[0];
    
    console.log('Date/heure actuelle:', now.toISOString());
    console.log('Aujourd\'hui (date):', today);
    console.log('Dans 2 heures:', twoHoursLater.toISOString());
    console.log('Nombre d\'affectations reçues:', assignments.length);
    
    const confirmedTodayAssignments = assignments.filter(a => {
      console.log(`\n  Filtrage affectation ${a.id.substring(0, 8)}:`);
      
      if (!a.event?.startDate) {
        console.log('    ❌ Pas de event.startDate');
        return false;
      }
      
      const eventDate = new Date(a.event.startDate);
      const eventDateStr = eventDate.toISOString().split('T')[0];
      
      console.log(`    Event startDate: ${a.event.startDate}`);
      console.log(`    Event date object: ${eventDate.toISOString()}`);
      console.log(`    Event date string: ${eventDateStr}`);
      console.log(`    Today string: ${today}`);
      console.log(`    Match aujourd'hui: ${eventDateStr === today}`);
      
      // Vérifier si l'événement est aujourd'hui
      if (eventDateStr === today) {
        console.log('    ✅ ACCEPTÉ: événement aujourd\'hui');
        return true;
      }
      
      // Vérifier si l'événement commence dans les 2 prochaines heures
      if (eventDate >= now && eventDate <= twoHoursLater) {
        console.log('    ✅ ACCEPTÉ: événement dans les 2h');
        return true;
      }
      
      console.log('    ❌ REJETÉ');
      return false;
    });
    
    console.log(`\n\n📊 RÉSULTAT FINAL: ${confirmedTodayAssignments.length} affectation(s) validée(s)`);
    
    if (confirmedTodayAssignments.length === 0) {
      console.log('\n❌ Le problème est confirmé: aucune affectation ne passe le filtre frontend');
    } else {
      console.log('\n✅ Les affectations passent le filtre frontend correctement');
    }
    
  } catch (error) {
    console.error('\n💥 Erreur globale:', error.response?.data || error.message);
  }
}

testCinLoginFlow();
