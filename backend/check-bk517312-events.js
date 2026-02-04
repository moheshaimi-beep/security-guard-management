const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });

  try {
    // Trouver l'agent BK517312
    const [agents] = await conn.query(
      'SELECT id, firstName, lastName, cin, role FROM users WHERE cin = ?',
      ['BK517312']
    );

    if (agents.length === 0) {
      console.log('❌ Agent BK517312 non trouvé');
      await conn.end();
      return;
    }

    const agent = agents[0];
    console.log('\n👤 Agent trouvé:', {
      id: agent.id,
      nom: `${agent.firstName} ${agent.lastName}`,
      cin: agent.cin,
      role: agent.role
    });

    // Récupérer toutes les affectations avec événements et zones
    const [assignments] = await conn.query(`
      SELECT 
        a.id as assignmentId,
        a.status as assignmentStatus,
        e.id as eventId,
        e.name as eventName,
        e.startDate,
        e.endDate,
        e.status as eventStatus,
        e.location,
        z.id as zoneId,
        z.name as zoneName
      FROM assignments a
      LEFT JOIN events e ON a.eventId = e.id
      LEFT JOIN zones z ON a.zoneId = z.id
      WHERE a.agentId = ? 
        AND a.deletedAt IS NULL
      ORDER BY e.startDate DESC
    `, [agent.id]);

    console.log(`\n📋 Total des affectations: ${assignments.length}\n`);

    if (assignments.length === 0) {
      console.log('⚠️ Aucune affectation trouvée pour cet agent');
    } else {
      assignments.forEach((a, idx) => {
        console.log(`${idx + 1}. ${a.eventName || '(Événement supprimé)'}`);
        console.log(`   📍 Lieu: ${a.location || 'N/A'}`);
        console.log(`   🏷️  Zone: ${a.zoneName || '(Aucune zone)'}`);
        console.log(`   📊 Status événement: ${a.eventStatus || 'N/A'}`);
        console.log(`   ✅ Status affectation: ${a.assignmentStatus}`);
        console.log(`   📅 Dates: ${a.startDate?.toISOString().split('T')[0] || 'N/A'} → ${a.endDate?.toISOString().split('T')[0] || 'N/A'}`);
        console.log('');
      });
    }

    // Compter par statut d'événement
    const byEventStatus = {};
    assignments.forEach(a => {
      const status = a.eventStatus || 'inconnu';
      byEventStatus[status] = (byEventStatus[status] || 0) + 1;
    });

    console.log('\n📊 Répartition par statut d\'événement:');
    Object.entries(byEventStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await conn.end();
  }
})();
