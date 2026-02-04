const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('security_guard_db', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  employeeId: DataTypes.STRING,
  firstName: DataTypes.STRING,
  lastName: DataTypes.STRING,
  role: DataTypes.ENUM('admin', 'supervisor', 'agent'),
  createdBy: DataTypes.UUID,
  creationType: DataTypes.ENUM('manual', 'facial')
}, {
  tableName: 'users',
  paranoid: true
});

const Assignment = sequelize.define('Assignment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  agentId: DataTypes.UUID,
  eventId: DataTypes.UUID,
  zoneId: DataTypes.UUID,
  status: DataTypes.ENUM('pending', 'confirmed', 'cancelled')
}, {
  tableName: 'assignments',
  paranoid: true
});

async function checkTazi() {
  try {
    console.log('\n🔍 Recherche de TAZI THAMI...\n');
    
    const taziAgent = await User.findOne({
      where: {
        lastName: { [Sequelize.Op.like]: '%THAMI%' }
      }
    });

    if (!taziAgent) {
      console.log('❌ Agent TAZI THAMI non trouvé!');
      await sequelize.close();
      return;
    }

    console.log('✅ Agent trouvé:');
    console.log(`   ID: ${taziAgent.id}`);
    console.log(`   Nom: ${taziAgent.firstName} ${taziAgent.lastName}`);
    console.log(`   Employee ID: ${taziAgent.employeeId}`);
    console.log(`   Rôle: ${taziAgent.role}`);
    console.log(`   Créé par: ${taziAgent.createdBy}`);
    console.log(`   Type de création: ${taziAgent.creationType}`);

    console.log('\n🔍 Recherche des affectations...\n');

    const assignments = await Assignment.findAll({
      where: {
        agentId: taziAgent.id
      }
    });

    if (assignments.length === 0) {
      console.log('❌ Aucune affectation trouvée pour cet agent!');
      console.log('\n💡 Solution: Créer une affectation pour cet agent via l\'interface d\'affectation.');
    } else {
      console.log(`✅ ${assignments.length} affectation(s) trouvée(s):`);
      assignments.forEach((assignment, idx) => {
        console.log(`\n${idx + 1}. Assignment ID: ${assignment.id}`);
        console.log(`   Event ID: ${assignment.eventId}`);
        console.log(`   Zone ID: ${assignment.zoneId}`);
        console.log(`   Status: ${assignment.status}`);
      });
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Erreur:', error);
    await sequelize.close();
  }
}

checkTazi();
