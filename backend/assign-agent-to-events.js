const { Sequelize, DataTypes } = require('sequelize');

const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'security_guard_db'
};

const sequelize = new Sequelize(DB_CONFIG.database, DB_CONFIG.user, DB_CONFIG.password, {
  host: DB_CONFIG.host,
  port: DB_CONFIG.port,
  dialect: 'mysql',
  logging: false
});

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, primaryKey: true },
  firstName: DataTypes.STRING,
  lastName: DataTypes.STRING,
  email: DataTypes.STRING,
  role: DataTypes.STRING
}, { tableName: 'users', timestamps: false });

const Event = sequelize.define('Event', {
  id: { type: DataTypes.UUID, primaryKey: true },
  name: DataTypes.STRING,
  location: DataTypes.STRING,
  startDate: DataTypes.DATE,
  endDate: DataTypes.DATE,
  status: DataTypes.STRING
}, { tableName: 'events', timestamps: false });

const Assignment = sequelize.define('Assignment', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  agentId: DataTypes.UUID,
  eventId: DataTypes.UUID,
  status: DataTypes.ENUM('pending', 'confirmed', 'declined', 'cancelled'),
  assignedBy: DataTypes.UUID,
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE
}, { tableName: 'assignments' });

Assignment.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
Event.hasMany(Assignment, { foreignKey: 'eventId', as: 'assignments' });

async function assignAgentToEvents() {
  try {
    console.log('🔗 Connexion à la base de données...');
    await sequelize.authenticate();
    console.log('✅ Connecté à MySQL');

    const agent = await User.findOne({
      where: { 
        role: 'agent'
      },
      order: [['createdAt', 'DESC']]
    });

    if (!agent) {
      console.error('❌ Aucun agent trouvé');
      process.exit(1);
    }

    console.log('👤 Agent trouvé:', {
      id: agent.id,
      name: `${agent.firstName} ${agent.lastName}`,
      email: agent.email
    });

    const today = new Date().toISOString().split('T')[0];
    const events = await Event.findAll({
      where: {
        endDate: { [Sequelize.Op.gte]: today },
        status: { [Sequelize.Op.in]: ['scheduled', 'active', 'published'] }
      },
      order: [['startDate', 'ASC']]
    });

    if (events.length === 0) {
      console.warn('⚠️ Aucun événement actif ou à venir trouvé');
      process.exit(0);
    }

    console.log(`📅 ${events.length} événement(s) trouvé(s):`);
    events.forEach(e => {
      console.log(`  - ${e.name} (${e.startDate.toISOString().split('T')[0]} → ${e.endDate.toISOString().split('T')[0]})`);
    });

    const admin = await User.findOne({
      where: { role: 'admin' }
    });

    if (!admin) {
      console.error('❌ Aucun admin trouvé');
      process.exit(1);
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const event of events) {
      const existingAssignment = await Assignment.findOne({
        where: {
          agentId: agent.id,
          eventId: event.id
        }
      });

      if (existingAssignment) {
        if (existingAssignment.status !== 'confirmed') {
          await existingAssignment.update({ status: 'confirmed' });
          console.log(`✅ Affectation mise à jour: ${event.name} → CONFIRMED`);
          updatedCount++;
        } else {
          console.log(`ℹ️  Affectation déjà confirmée: ${event.name}`);
        }
      } else {
        await Assignment.create({
          agentId: agent.id,
          eventId: event.id,
          status: 'confirmed',
          assignedBy: admin.id
        });
        console.log(`✅ Nouvelle affectation créée: ${event.name} → CONFIRMED`);
        createdCount++;
      }
    }

    console.log('\n📊 Résumé:');
    console.log(`  ✅ ${createdCount} affectation(s) créée(s)`);
    console.log(`  🔄 ${updatedCount} affectation(s) mise(s) à jour`);
    console.log(`  ℹ️  ${events.length - createdCount - updatedCount} affectation(s) déjà confirmée(s)`);

    const assignmentsWithEvents = await Assignment.findAll({
      where: { agentId: agent.id },
      include: [
        { model: Event, as: 'event', attributes: ['name', 'startDate', 'endDate', 'status'] }
      ]
    });

    console.log(`\n📋 Toutes les affectations de l'agent (${assignmentsWithEvents.length}):`);
    assignmentsWithEvents.forEach(a => {
      const startDate = a.event?.startDate ? new Date(a.event.startDate).toISOString().split('T')[0] : 'N/A';
      const endDate = a.event?.endDate ? new Date(a.event.endDate).toISOString().split('T')[0] : 'N/A';
      console.log(`  - ${a.event?.name || 'N/A'} (${a.status}) - ${startDate} → ${endDate}`);
    });

    console.log('\n✅ Terminé! L\'agent peut maintenant pointer sur ces événements.');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

assignAgentToEvents();
