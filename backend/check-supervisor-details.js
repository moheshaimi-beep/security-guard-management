const { User } = require('./src/models');

async function checkSupervisorDetails() {
  try {
    console.log('🔍 Checking supervisor with CIN BK517312...');
    
    const supervisor = await User.findOne({
      where: { cin: 'BK517312' },
      attributes: ['id', 'firstName', 'lastName', 'cin', 'role', 'status', 'email']
    });
    
    if (supervisor) {
      console.log('✅ Supervisor found:');
      console.log('ID:', supervisor.id);
      console.log('Name:', supervisor.firstName, supervisor.lastName);
      console.log('CIN:', supervisor.cin);
      console.log('Role:', supervisor.role);
      console.log('Status:', supervisor.status);
      console.log('Email:', supervisor.email);
    } else {
      console.log('❌ Supervisor not found with CIN BK517312');
      
      // Check all supervisors
      const allSupervisors = await User.findAll({
        where: { role: 'supervisor' },
        attributes: ['id', 'firstName', 'lastName', 'cin', 'role', 'status']
      });
      
      console.log('\n📋 All supervisors in database:');
      allSupervisors.forEach(sup => {
        console.log(`- ${sup.firstName} ${sup.lastName} (CIN: ${sup.cin})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSupervisorDetails();