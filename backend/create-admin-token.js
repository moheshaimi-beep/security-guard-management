const jwt = require('jsonwebtoken');
const { User } = require('./src/models');

async function createAdminToken() {
  try {
    console.log('🔑 Création du token admin...');
    
    // Récupérer l'admin
    const admin = await User.findOne({
      where: { role: 'admin' }
    });
    
    if (!admin) {
      console.error('❌ Aucun admin trouvé');
      return;
    }
    
    console.log(`👤 Admin trouvé: ${admin.firstName} ${admin.lastName} (${admin.email})`);
    
    // Créer le token JWT
    const token = jwt.sign(
      {
        userId: admin.id,
        email: admin.email,
        role: admin.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    console.log('\n🎫 Token JWT créé:');
    console.log(`Bearer ${token}`);
    
    // Test avec le token
    const axios = require('axios');
    
    console.log('\n🔍 Test de l\'API avec le token...');
    
    const response = await axios.get('http://localhost:5000/api/attendance', {
      params: {
        page: 1,
        limit: 10
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n✅ API Response Status:', response.status);
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
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
    process.exit(1);
  }
}

createAdminToken();