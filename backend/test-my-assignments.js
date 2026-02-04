const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testAssignmentsEndpoint() {
  try {
    console.log('🔍 Testing /assignments/my-assignments endpoint...\n');

    // First, login by CIN
    console.log('1️⃣ Login by CIN...');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login-cin', {
      cin: 'A303730'
    });

    const { checkInToken } = loginRes.data.data;
    console.log('✅ Got checkInToken');

    // Decode token to verify it has type: 'checkin'
    const decoded = jwt.decode(checkInToken);
    console.log('\n2️⃣ Token structure:');
    console.log('- id:', decoded.id ? '✅' : '❌');
    console.log('- role:', decoded.role);
    console.log('- type:', decoded.type);
    console.log('- exp:', new Date(decoded.exp * 1000).toLocaleString());

    // Now try /assignments/my-assignments WITH parameters
    console.log('\n3️⃣ Calling /assignments/my-assignments WITH parameters...');
    try {
      const assignmentsRes = await axios.get('http://localhost:5000/api/assignments/my-assignments?status=confirmed&today=true', {
        headers: {
          'Authorization': `Bearer ${checkInToken}`
        }
      });

      console.log('✅ SUCCESS');
      console.log('Status:', assignmentsRes.status);
      console.log('Assignments found:', assignmentsRes.data.data?.length || 0);
      if (assignmentsRes.data.data && assignmentsRes.data.data.length > 0) {
        console.log('First assignment:', {
          id: assignmentsRes.data.data[0].id,
          eventId: assignmentsRes.data.data[0].eventId,
          status: assignmentsRes.data.data[0].status,
          eventName: assignmentsRes.data.data[0].event?.name,
          eventStart: assignmentsRes.data.data[0].event?.startDate
        });
      }
    } catch (apiErr) {
      console.log('❌ FAILED');
      console.log('Status:', apiErr.response?.status);
      console.log('Message:', apiErr.response?.data?.message);
      console.log('Full data:', apiErr.response?.data);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

testAssignmentsEndpoint();
