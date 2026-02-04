const axios = require('axios');
const { User } = require('./src/models');
const jwt = require('jsonwebtoken');

async function testAttendanceAPIWithPhotos() {
  try {
    console.log('🔍 Test de l\'API Attendance avec photos...\n');
    
    // Créer un token admin
    const admin = await User.findOne({ where: { role: 'admin' } });
    const token = jwt.sign(
      { userId: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    // Tester l'API
    const response = await axios.get('http://localhost:5000/api/attendance', {
      params: { page: 1, limit: 10 },
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✅ API Response Status:', response.status);
    
    if (response.data?.data?.attendances) {
      const attendances = response.data.data.attendances;
      console.log(`📋 ${attendances.length} pointages trouvés:\n`);
      
      attendances.forEach((att, i) => {
        console.log(`${i + 1}. Agent: ${att.agent?.firstName} ${att.agent?.lastName}`);
        console.log(`   Date: ${att.date}`);
        console.log(`   Check-in Photo: ${att.checkInPhoto ? 'PRÉSENTE ✅' : 'ABSENTE ❌'}`);
        if (att.checkInPhoto) {
          console.log(`   Photo Length: ${att.checkInPhoto.length} caractères`);
          console.log(`   Photo Start: ${att.checkInPhoto.substring(0, 30)}...`);
        }
        console.log('');
      });
    } else {
      console.log('❌ Pas de données d\'attendance dans la réponse');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur API:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.response?.data?.message || error.message
    });
    process.exit(1);
  }
}

testAttendanceAPIWithPhotos();