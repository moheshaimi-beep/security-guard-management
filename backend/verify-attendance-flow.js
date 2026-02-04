const { Attendance, User, Event } = require('./src/models');

async function verifyAttendanceFlow() {
  try {
    console.log('🔍 Vérification complète du flow d\'attendance...\n');
    
    // 1. Vérifier les pointages dans la base
    console.log('1️⃣ Vérification de la base de données:');
    const attendances = await Attendance.findAll({
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'firstName', 'lastName', 'cin', 'email']
        },
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'location']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    if (attendances.length === 0) {
      console.log('   ❌ Aucun pointage trouvé dans la base de données');
      return;
    }
    
    console.log(`   ✅ ${attendances.length} pointage(s) trouvé(s) dans la base:`);
    attendances.forEach((att, i) => {
      console.log(`      ${i + 1}. Agent: ${att.agent?.firstName} ${att.agent?.lastName} (${att.agent?.cin})`);
      console.log(`         Event: ${att.event?.name}`);
      console.log(`         Date: ${att.date}`);
      console.log(`         Check-in: ${att.checkInTime}`);
      console.log(`         Status: ${att.status}`);
      console.log('');
    });
    
    // 2. Simuler l'appel API comme fait par le frontend
    console.log('2️⃣ Simulation de l\'appel API frontend:');
    
    const attendanceController = require('./src/controllers/attendanceController');
    
    // Mock request et response objects
    const mockReq = {
      query: {
        page: 1,
        limit: 20
      },
      user: {
        id: 'admin-id',
        role: 'admin' // Admin peut voir tous les pointages
      }
    };
    
    let responseData = null;
    const mockRes = {
      json: (data) => {
        responseData = data;
        return mockRes;
      },
      status: (code) => {
        return mockRes;
      }
    };
    
    await attendanceController.getAttendances(mockReq, mockRes);
    
    if (responseData && responseData.success) {
      console.log(`   ✅ API Response successful: ${responseData.data.attendances.length} pointage(s) retourné(s)`);
      
      if (responseData.data.attendances.length > 0) {
        console.log('   📋 Détails des pointages via API:');
        responseData.data.attendances.forEach((att, i) => {
          console.log(`      ${i + 1}. Agent: ${att.agent?.firstName} ${att.agent?.lastName}`);
          console.log(`         Event: ${att.event?.name}`);
          console.log(`         Date: ${att.date}`);
          console.log(`         Check-in: ${att.checkInTime}`);
          console.log(`         Status: ${att.status}`);
        });
      }
    } else {
      console.log('   ❌ Erreur dans la réponse API:', responseData);
    }
    
    // 3. Instructions pour vérifier sur l'interface
    console.log('\n3️⃣ Instructions pour vérifier sur l\'interface:');
    console.log('   📍 Pages à vérifier:');
    console.log('      • http://localhost:3000/attendance');
    console.log('      • http://localhost:3000/attendance-verification');
    console.log('');
    console.log('   🔑 Connexion:');
    console.log('      • Email: admin@securityguard.com');
    console.log('      • Password: Admin@123');
    console.log('');
    console.log('   ✅ Si tout fonctionne, vous devriez voir les pointages des agents dans ces pages!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verifyAttendanceFlow();