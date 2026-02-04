const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Test l'API d'attendance
async function testAttendanceAPI() {
  try {
    console.log('🔍 Test de l\'API Attendance...\n');
    
    // Test de l'API d'attendance avec des paramètres
    const response = await axios.get('http://localhost:5000/api/attendance', {
      params: {
        page: 1,
        limit: 10
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ API Response Data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data?.data?.attendances) {
      console.log(`\n📊 ${response.data.data.attendances.length} pointages trouvés:`);
      
      response.data.data.attendances.forEach((attendance, i) => {
        console.log(`\n${i + 1}. ${attendance.agent?.firstName} ${attendance.agent?.lastName}`);
        console.log(`   Event: ${attendance.event?.name}`);
        console.log(`   Date: ${attendance.date}`);
        console.log(`   Check-in: ${attendance.checkInTime || 'N/A'}`);
        console.log(`   Status: ${attendance.status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur API:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
  }
}

testAttendanceAPI();