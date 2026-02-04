const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testAssignments() {
  try {
    console.log('🔍 Testing assignments endpoint...\n');

    // Test CIN login first
    const loginRes = await axios.post('http://localhost:5000/api/auth/login-cin', {
      cin: 'BK517312'
    });

    console.log('✅ Login successful');
    const { accessToken, checkInToken } = loginRes.data.data;
    console.log('  - accessToken:', accessToken ? '✅' : '❌');
    console.log('  - checkInToken:', checkInToken ? '✅' : '❌');

    // Test assignments endpoint with checkInToken
    console.log('\n📋 Fetching assignments with checkInToken...');
    const assignmentsRes = await axios.get(
      'http://localhost:5000/api/assignments/my-assignments?status=confirmed&today=true',
      {
        headers: {
          'Authorization': `Bearer ${checkInToken}`
        }
      }
    );

    console.log('✅ Assignments retrieved:', assignmentsRes.data.data.length);
    if (assignmentsRes.data.data.length > 0) {
      assignmentsRes.data.data.forEach((a, i) => {
        console.log(`  ${i + 1}. ${a.event?.name || 'Unknown'} - ${a.status}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testAssignments();
