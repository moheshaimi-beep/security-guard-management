const { Attendance, User, Event } = require('./src/models');

async function analyzeA303730Issue() {
  try {
    console.log('🔍 Analyse du problème avec l\'utilisateur A303730...\n');
    
    // 1. Vérifier si l'utilisateur A303730 existe
    console.log('1️⃣ Vérification de l\'utilisateur A303730:');
    const userA303730 = await User.findOne({
      where: { cin: 'A303730' }
    });
    
    if (!userA303730) {
      console.log('   ❌ Utilisateur A303730 non trouvé dans la base');
      
      // Chercher des utilisateurs similaires
      const similarUsers = await User.findAll({
        where: {
          cin: { [require('sequelize').Op.like]: '%A303730%' }
        }
      });
      
      if (similarUsers.length > 0) {
        console.log('   📋 Utilisateurs similaires trouvés:');
        similarUsers.forEach(user => {
          console.log(`      • ${user.firstName} ${user.lastName} - CIN: ${user.cin}`);
        });
      }
      
      return;
    }
    
    console.log(`   ✅ Utilisateur trouvé: ${userA303730.firstName} ${userA303730.lastName}`);
    console.log(`      • CIN: ${userA303730.cin}`);
    console.log(`      • Email: ${userA303730.email}`);
    console.log(`      • Rôle: ${userA303730.role}`);
    console.log(`      • Statut: ${userA303730.status}`);
    
    // 2. Vérifier ses pointages récents
    console.log('\n2️⃣ Vérification des pointages récents:');
    const recentAttendances = await Attendance.findAll({
      where: { agentId: userA303730.id },
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'location']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    if (recentAttendances.length === 0) {
      console.log('   ❌ Aucun pointage trouvé pour cet utilisateur');
    } else {
      console.log(`   ✅ ${recentAttendances.length} pointage(s) trouvé(s):`);
      recentAttendances.forEach((att, i) => {
        console.log(`      ${i + 1}. Date: ${att.date}`);
        console.log(`         Check-in: ${att.checkInTime || 'N/A'}`);
        console.log(`         Check-out: ${att.checkOutTime || 'N/A'}`);
        console.log(`         Status: ${att.status}`);
        console.log(`         Event: ${att.event?.name || 'N/A'}`);
        console.log(`         Créé: ${att.createdAt}`);
        console.log('');
      });
    }
    
    // 3. Vérifier tous les pointages récents (toutes les activités récentes)
    console.log('3️⃣ Vérification de TOUS les pointages récents:');
    const allRecentAttendances = await Attendance.findAll({
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'firstName', 'lastName', 'cin']
        },
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    
    console.log(`   📋 ${allRecentAttendances.length} pointages récents au total:`);
    allRecentAttendances.forEach((att, i) => {
      console.log(`      ${i + 1}. Agent: ${att.agent?.firstName} ${att.agent?.lastName} (${att.agent?.cin})`);
      console.log(`         Date: ${att.date} | Check-in: ${att.checkInTime || 'N/A'}`);
      console.log(`         Créé: ${att.createdAt}`);
      console.log('');
    });
    
    // 4. Vérifier les assignments de l'utilisateur
    console.log('4️⃣ Vérification des assignments:');
    const { Assignment } = require('./src/models');
    const assignments = await Assignment.findAll({
      where: { agentId: userA303730.id },
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'startDate', 'status']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    if (assignments.length === 0) {
      console.log('   ❌ Aucun assignment trouvé - L\'utilisateur doit être assigné à un événement!');
    } else {
      console.log(`   ✅ ${assignments.length} assignment(s) trouvé(s):`);
      assignments.forEach((ass, i) => {
        console.log(`      ${i + 1}. Event: ${ass.event?.name}`);
        console.log(`         Status: ${ass.status}`);
        console.log(`         Event Status: ${ass.event?.status}`);
        console.log('');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

analyzeA303730Issue();