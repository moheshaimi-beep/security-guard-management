const { User, Event, Assignment, Attendance } = require('./src/models');

async function testCheckInA303730() {
  try {
    console.log('🧪 Test de pointage spécifique pour A303730...\n');
    
    // 1. Récupérer l'utilisateur
    const user = await User.findOne({
      where: { cin: 'A303730' }
    });
    
    if (!user) {
      console.log('❌ Utilisateur A303730 non trouvé');
      return;
    }
    
    console.log(`✅ Utilisateur: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
    
    // 2. Récupérer un événement actif assigné à cet utilisateur
    const assignment = await Assignment.findOne({
      where: { 
        agentId: user.id,
        status: 'confirmed'
      },
      include: [
        {
          model: Event,
          as: 'event',
          where: { status: 'active' }
        }
      ]
    });
    
    if (!assignment) {
      console.log('❌ Aucun assignment actif trouvé');
      return;
    }
    
    console.log(`✅ Assignment trouvé: ${assignment.event.name} (ID: ${assignment.event.id})`);
    
    // 3. Simuler un pointage comme fait par le frontend
    console.log('\n🔍 Simulation du pointage...');
    
    const checkInData = {
      agentId: user.id,
      eventId: assignment.event.id,
      date: new Date().toISOString().split('T')[0],
      checkInTime: new Date(),
      checkInLatitude: 36.8485,
      checkInLongitude: 10.2422,
      checkInMethod: 'facial',
      status: 'present',
      notes: 'Test pointage pour A303730'
    };
    
    console.log('Données du pointage:', checkInData);
    
    // 4. Tenter de créer le pointage
    try {
      const attendance = await Attendance.create(checkInData);
      console.log(`✅ Pointage créé avec succès! ID: ${attendance.id}`);
      
      // Vérifier que le pointage est bien enregistré
      const verifyAttendance = await Attendance.findOne({
        where: { id: attendance.id },
        include: [
          {
            model: User,
            as: 'agent',
            attributes: ['firstName', 'lastName', 'cin']
          },
          {
            model: Event,
            as: 'event',
            attributes: ['name']
          }
        ]
      });
      
      if (verifyAttendance) {
        console.log('✅ Pointage vérifié dans la base de données:');
        console.log(`   Agent: ${verifyAttendance.agent.firstName} ${verifyAttendance.agent.lastName}`);
        console.log(`   Event: ${verifyAttendance.event.name}`);
        console.log(`   Date: ${verifyAttendance.date}`);
        console.log(`   Status: ${verifyAttendance.status}`);
      }
      
    } catch (createError) {
      console.error('❌ Erreur lors de la création du pointage:', createError.message);
      console.error('Details:', createError.errors || createError);
      
      // Analyser l'erreur spécifique
      if (createError.name === 'SequelizeValidationError') {
        console.log('\n🔍 Erreurs de validation:');
        createError.errors.forEach(err => {
          console.log(`   - ${err.path}: ${err.message}`);
        });
      }
      
      if (createError.name === 'SequelizeUniqueConstraintError') {
        console.log('\n🔍 Conflit de contrainte unique:');
        console.log('   Un pointage existe peut-être déjà pour cette combinaison agent/événement/date');
        
        // Vérifier les pointages existants
        const existingAttendance = await Attendance.findOne({
          where: {
            agentId: user.id,
            eventId: assignment.event.id,
            date: new Date().toISOString().split('T')[0]
          }
        });
        
        if (existingAttendance) {
          console.log(`   ⚠️ Pointage existant trouvé: ID ${existingAttendance.id}`);
          console.log(`      Créé: ${existingAttendance.createdAt}`);
          console.log(`      Status: ${existingAttendance.status}`);
        }
      }
    }
    
    // 5. Test API direct
    console.log('\n🔍 Test de l\'API Check-In...');
    
    const attendanceController = require('./src/controllers/attendanceController');
    
    const mockReq = {
      body: {
        eventId: assignment.event.id,
        latitude: 36.8485,
        longitude: 10.2422,
        checkInMethod: 'facial',
        facialVerified: false,
        facialMatchScore: 0
      },
      user: { 
        id: user.id, 
        role: user.role,
        cin: user.cin 
      }
    };
    
    let responseData = null;
    const mockRes = {
      json: (data) => {
        responseData = data;
        console.log('API Response:', JSON.stringify(data, null, 2));
        return mockRes;
      },
      status: (code) => {
        console.log('Status Code:', code);
        return mockRes;
      }
    };
    
    try {
      await attendanceController.checkIn(mockReq, mockRes);
    } catch (apiError) {
      console.error('❌ Erreur API:', apiError.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testCheckInA303730();