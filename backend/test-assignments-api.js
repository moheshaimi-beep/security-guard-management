const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testMyAssignmentsAPI() {
  try {
    // Créer un token CIN pour l'agent
    const checkInToken = jwt.sign(
      { id: 'd468e666-3f09-41f9-a16d-6e5e0700ddef', role: 'agent', type: 'checkin' },
      'security_guard_secret_key_2024_very_secure',
      { expiresIn: '7d' }
    );

    console.log('🔑 Testing my-assignments API...');
    
    const response = await axios.get('http://localhost:5000/api/assignments/my-assignments', {
      params: {
        status: 'confirmed',
        today: 'true'
      },
      headers: {
        Authorization: `Bearer ${checkInToken}`
      }
    });

    console.log('✅ API Response:', {
      success: response.data.success,
      dataLength: response.data.data?.length,
      assignments: response.data.data?.map(a => ({
        id: a.id,
        status: a.status,
        eventName: a.event?.name,
        eventStartDate: a.event?.startDate,
        hasEvent: !!a.event
      }))
    });

  } catch (error) {
    console.error('❌ API Error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
  }
}

testMyAssignmentsAPI();