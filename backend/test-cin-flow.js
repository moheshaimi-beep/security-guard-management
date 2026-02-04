const axios = require('axios');

async function testCinLogin() {
  try {
    // 1. Login with CIN
    console.log('🔐 Login with CIN BK517312...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login-cin', {
      cin: 'BK517312'
    });
    
    console.log('✅ Login successful');
    console.log('📦 Full response:', JSON.stringify(loginResponse.data, null, 2));
    const responseData = loginResponse.data.data;
    const { user } = responseData;
    const accessToken = responseData.checkInToken || responseData.accessToken;
    console.log('👤 User:', user.firstName, user.lastName, user.role);
    console.log('🔑 Token:', accessToken ? accessToken.substring(0, 50) + '...' : 'NO TOKEN');
    
    // 2. Get my assignments with the token
    console.log('\n📋 Fetching assignments...');
    const assignmentsResponse = await axios.get('http://localhost:5000/api/assignments/my', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      params: {
        status: 'confirmed',
        today: 'true'
      }
    });
    
    console.log('✅ Assignments loaded:', assignmentsResponse.data.data.length);
    assignmentsResponse.data.data.forEach((a, i) => {
      console.log(`  ${i + 1}. Event ID: ${a.eventId}, Status: ${a.status}`);
    });
    
    // 3. Try to check-in
    console.log('\n📍 Attempting check-in...');
    if (assignmentsResponse.data.data.length > 0) {
      const firstEventId = assignmentsResponse.data.data[0].eventId;
      console.log('Using event ID:', firstEventId);
      
      try {
        const checkInResponse = await axios.post('http://localhost:5000/api/attendance/check-in', {
          eventId: firstEventId,
          latitude: 33.5731,
          longitude: -7.5898,
          checkInMethod: 'facial'
        }, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        
        console.log('✅ Check-in successful!');
      } catch (checkInError) {
        console.log('❌ Check-in failed:', checkInError.response?.data?.message || checkInError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testCinLogin();
