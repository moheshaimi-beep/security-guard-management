const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('security_guard_db', 'root', '', {
  host: 'localhost',
  port: 3306,
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
  startDate: DataTypes.DATE,
  endDate: DataTypes.DATE,
  status: DataTypes.STRING
}, { tableName: 'events', timestamps: false });

const Assignment = sequelize.define('Assignment', {
  id: { type: DataTypes.UUID, primaryKey: true },
  agentId: DataTypes.UUID,
  eventId: DataTypes.UUID,
  status: DataTypes.ENUM('pending', 'confirmed', 'declined', 'cancelled'),
  assignedBy: DataTypes.UUID
}, { tableName: 'assignments' });

Assignment.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
Assignment.belongsTo(User, { foreignKey: 'agentId', as: 'agent' });

async function checkAndFix() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connecté à MySQL\n');

    // Lister tous les agents
    const agents = await User.findAll({
      where: { role: 'agent' },
      order: [['createdAt', 'DESC']]
    });

    console.log(`👥 ${agents.length} agent(s) trouvé(s):\n`);
    agents.forEach((a, i) => {
      console.log(`${i + 1}. ID: ${a.id}`);
      console.log(`   Nom: ${a.firstName} ${a.lastName}`);
      console.log(`   Email: ${a.email}\n`);
    });

    // Lister les événements
    const today = new Date().toISOString().split('T')[0];
    const events = await Event.findAll({
      where: {
        endDate: { [Sequelize.Op.gte]: today },
        status: { [Sequelize.Op.in]: ['scheduled', 'active', 'published'] }
      }
    });

    console.log(`📅 ${events.length} événement(s) actif(s):\n`);
    events.forEach((e, i) => {
      console.log(`${i + 1}. ID: ${e.id}`);
      console.log(`   Nom: ${e.name}`);
      console.log(`   Date: ${e.startDate.toISOString().split('T')[0]} → ${e.endDate.toISOString().split('T')[0]}\n`);
    });

    // Lister toutes les affectations
    const assignments = await Assignment.findAll({
      include: [
        { model: Event, as: 'event', attributes: ['name'] },
        { model: User, as: 'agent', attributes: ['firstName', 'lastName', 'email'] }
      ]
    });

    console.log(`📋 ${assignments.length} affectation(s) totale(s):\n`);
    assignments.forEach((a, i) => {
      console.log(`${i + 1}. Agent: ${a.agent?.firstName} ${a.agent?.lastName} (${a.agent?.email})`);
      console.log(`   Événement: ${a.event?.name}`);
      console.log(`   Statut: ${a.status}`);
      console.log(`   Agent ID: ${a.agentId}`);
      console.log(`   Event ID: ${a.eventId}\n`);
    });

    // Demander quel agent a besoin d'affectations
    if (agents.length > 0 && events.length > 0) {
      console.log('\n🔧 CRÉATION DES AFFECTATIONS POUR TOUS LES AGENTS...\n');
      
      const admin = await User.findOne({ where: { role: 'admin' } });
      
      for (const agent of agents) {
        for (const event of events) {
          const existing = await Assignment.findOne({
            where: { agentId: agent.id, eventId: event.id }
          });

          if (!existing) {
            await Assignment.create({
              agentId: agent.id,
              eventId: event.id,
              status: 'confirmed',
              assignedBy: admin.id
            });
            console.log(`✅ Créé: ${agent.firstName} ${agent.lastName} → ${event.name}`);
          } else if (existing.status !== 'confirmed') {
            await existing.update({ status: 'confirmed' });
            console.log(`🔄 Mis à jour: ${agent.firstName} ${agent.lastName} → ${event.name}`);
          } else {
            console.log(`ℹ️  Existe déjà: ${agent.firstName} ${agent.lastName} → ${event.name}`);
          }
        }
      }

      console.log('\n✅ Terminé! Tous les agents sont maintenant affectés aux événements actifs.');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

checkAndFix();
