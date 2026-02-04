const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise');

async function assignAllAgentsToEvents() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });

  try {
    // Get admin
    const [admins] = await conn.query('SELECT id FROM users WHERE role = "admin" LIMIT 1');
    if (admins.length === 0) {
      console.error('❌ No admin found');
      return;
    }
    const adminId = admins[0].id;

    // Get all agents
    const [agents] = await conn.query('SELECT id, firstName, lastName, email FROM users WHERE role = "agent"');
    
    // Get active events
    const [events] = await conn.query(`
      SELECT id, name 
      FROM events 
      WHERE endDate >= CURDATE() 
      AND status IN ('scheduled', 'active', 'published')
    `);

    console.log(`\n👥 ${agents.length} agent(s) trouvé(s)`);
    console.log(`📅 ${events.length} événement(s) actif(s)\n`);

    let created = 0;
    let updated = 0;
    let existing = 0;

    for (const agent of agents) {
      for (const event of events) {
        const [rows] = await conn.query(
          'SELECT id, status FROM assignments WHERE agentId = ? AND eventId = ?',
          [agent.id, event.id]
        );

        if (rows.length === 0) {
          const newId = uuidv4();
          await conn.query(
            'INSERT INTO assignments (id, agentId, eventId, status, assignedBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
            [newId, agent.id, event.id, 'confirmed', adminId]
          );
          console.log(`✅ Créé: ${agent.firstName} ${agent.lastName} → ${event.name}`);
          created++;
        } else if (rows[0].status !== 'confirmed') {
          await conn.query('UPDATE assignments SET status = "confirmed" WHERE id = ?', [rows[0].id]);
          console.log(`🔄 Mis à jour: ${agent.firstName} ${agent.lastName} → ${event.name} (${rows[0].status} → confirmed)`);
          updated++;
        } else {
          console.log(`ℹ️  Existe: ${agent.firstName} ${agent.lastName} → ${event.name}`);
          existing++;
        }
      }
    }

    console.log(`\n📊 Résumé:`);
    console.log(`  ✅ ${created} affectation(s) créée(s)`);
    console.log(`  🔄 ${updated} affectation(s) mise(s) à jour`);
    console.log(`  ℹ️  ${existing} affectation(s) déjà confirmée(s)`);

    // Verify all assignments
    console.log('\n🔍 Vérification des affectations par agent:\n');
    for (const agent of agents) {
      const [assignments] = await conn.query(`
        SELECT a.status, e.name 
        FROM assignments a
        JOIN events e ON e.id = a.eventId
        WHERE a.agentId = ?
        AND e.endDate >= CURDATE()
      `, [agent.id]);
      
      console.log(`${agent.firstName} ${agent.lastName} (${agent.email}):`);
      assignments.forEach(a => {
        console.log(`  - ${a.name}: ${a.status}`);
      });
      console.log();
    }

    console.log('✅ Terminé! Reconnectez-vous sur la page web pour actualiser le token.');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    await conn.end();
  }
}

assignAllAgentsToEvents();
