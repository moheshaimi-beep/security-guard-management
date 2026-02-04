const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });

  try {
    console.log('\n🔍 Recherche de tous les agents...\n');
    
    // Récupérer tous les agents
    const [agents] = await conn.query(`
      SELECT id, firstName, lastName, cin, email, role
      FROM users
      WHERE role = 'agent' AND deletedAt IS NULL
      ORDER BY firstName, lastName
    `);

    console.log(`✅ ${agents.length} agent(s) trouvé(s)\n`);

    for (const agent of agents) {
      console.log(`\n👤 ${agent.firstName} ${agent.lastName} (${agent.cin || 'pas de CIN'})`);
      console.log(`   Email: ${agent.email}`);

      // Récupérer les affectations de l'agent
      const [assignments] = await conn.query(`
        SELECT 
          a.id as assignmentId,
          a.status,
          e.id as eventId,
          e.name as eventName,
          e.status as eventStatus,
          e.startDate,
          e.endDate,
          e.checkInTime,
          e.checkOutTime,
          z.id as zoneId,
          z.name as zoneName,
          DATE_ADD(
            CONCAT(DATE(e.endDate), ' ', IFNULL(e.checkOutTime, '23:59:59')), 
            INTERVAL 2 HOUR
          ) as eventEndPlus2h
        FROM assignments a
        LEFT JOIN events e ON a.eventId = e.id
        LEFT JOIN zones z ON a.zoneId = z.id
        WHERE a.agentId = ?
          AND a.deletedAt IS NULL
          AND e.deletedAt IS NULL
          AND e.status NOT IN ('cancelled', 'terminated')
        ORDER BY e.startDate DESC
      `, [agent.id]);

      if (assignments.length === 0) {
        console.log(`   ⚠️  Aucune affectation active`);
        continue;
      }

      console.log(`   ✅ ${assignments.length} affectation(s):\n`);

      const now = new Date();
      let visibleCount = 0;

      assignments.forEach(a => {
        const endPlus2h = a.eventEndPlus2h ? new Date(a.eventEndPlus2h) : null;
        const isVisible = endPlus2h && endPlus2h >= now;
        if (isVisible) visibleCount++;
        
        const icon = isVisible ? '✅' : '❌';
        console.log(`   ${icon} ${a.eventName} (${a.eventStatus})`);
        console.log(`      Zone: ${a.zoneName || '(aucune)'}`);
        console.log(`      Status affectation: ${a.status}`);
        console.log(`      Dates: ${a.startDate?.toISOString().split('T')[0]} → ${a.endDate?.toISOString().split('T')[0]}`);
        if (endPlus2h) {
          console.log(`      Fin+2h: ${endPlus2h.toISOString().split('T')[0]} ${endPlus2h.toISOString().split('T')[1]?.substring(0, 5)}`);
        }
        console.log(`      Visible? ${isVisible ? 'OUI' : 'NON (dépassé)'}`);
        console.log('');
      });

      console.log(`   📊 Événements visibles: ${visibleCount}/${assignments.length}`);
    }

    console.log('\n\n📋 Résumé global:\n');
    console.log(`Total agents: ${agents.length}`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  } finally {
    await conn.end();
  }
})();
