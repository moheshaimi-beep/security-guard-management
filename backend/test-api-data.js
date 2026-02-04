const axios = require('axios');

async function testAPI() {
  try {
    console.log('\n🔍 Test de l\'API creation-history...\n');
    
    // You need to get a valid token first
    // For testing, let's use a direct database query instead
    const mysql = require('mysql2/promise');
    
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'security_guard_db'
    });
    
    const agentId = 'b623e135-2be9-4976-9f96-7c1c61f07c5a';
    
    console.log('📋 Vérification des données pour TAZI THAMI:\n');
    
    // Get agent info
    const [agents] = await conn.query(`
      SELECT id, employeeId, firstName, lastName, role, createdAt
      FROM users
      WHERE id = ?
    `, [agentId]);
    
    if (agents.length === 0) {
      console.log('❌ Agent non trouvé!');
      await conn.end();
      return;
    }
    
    const agent = agents[0];
    console.log(`✅ Agent: ${agent.firstName} ${agent.lastName} (${agent.employeeId})`);
    
    // Get assignments with events and zones
    const [assignments] = await conn.query(`
      SELECT 
        a.id as assignmentId,
        a.status,
        e.id as eventId,
        e.name as eventName,
        e.startDate,
        e.endDate,
        e.location,
        z.id as zoneId,
        z.name as zoneName
      FROM assignments a
      LEFT JOIN events e ON a.eventId = e.id
      LEFT JOIN zones z ON a.zoneId = z.id
      WHERE a.agentId = ? AND a.deletedAt IS NULL
    `, [agentId]);
    
    console.log(`\n📊 Affectations: ${assignments.length}\n`);
    
    if (assignments.length > 0) {
      assignments.forEach((a, idx) => {
        console.log(`${idx + 1}. ${a.eventName} (${a.status})`);
        console.log(`   Zone: ${a.zoneName}`);
        console.log(`   Dates: ${a.startDate} → ${a.endDate}`);
        console.log(`   Event ID: ${a.eventId}`);
        console.log(`   Zone ID: ${a.zoneId}`);
        console.log('');
      });
      
      // Format as the API would
      const events = assignments.map(a => ({
        id: a.eventId,
        name: a.eventName,
        startDate: a.startDate,
        endDate: a.endDate,
        location: a.location,
        zone: {
          id: a.zoneId,
          name: a.zoneName
        }
      }));
      
      console.log('\n📤 Format API (ce que le frontend devrait recevoir):\n');
      console.log(JSON.stringify({ events }, null, 2));
    }
    
    await conn.end();
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testAPI();
