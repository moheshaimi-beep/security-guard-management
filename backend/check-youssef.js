const mysql = require('mysql2/promise');

async function checkAgent() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });

  try {
    const [users] = await conn.query(
      'SELECT id, firstName, lastName, email, cin, role FROM users WHERE cin = ?',
      ['BK517312']
    );

    console.log('\n🔍 Agent BK517312 (youssef ibenboubkeur):\n');
    
    if (users.length > 0) {
      const user = users[0];
      console.log('ID:', user.id);
      console.log('Nom:', user.firstName, user.lastName);
      console.log('Email:', user.email);
      console.log('CIN:', user.cin);
      console.log('Role:', user.role);

      const [assignments] = await conn.query(
        'SELECT * FROM assignments WHERE agentId = ?',
        [user.id]
      );

      console.log(`\n📋 Affectations: ${assignments.length}`);
      assignments.forEach(a => {
        console.log(`  - Event: ${a.eventId}, Status: ${a.status}`);
      });

      if (assignments.length === 0) {
        console.log('\n⚠️ Cet agent n\'a AUCUNE affectation!');
        console.log('   Création des affectations...\n');

        const [admin] = await conn.query('SELECT id FROM users WHERE role = "admin" LIMIT 1');
        const adminId = admin[0].id;

        const [events] = await conn.query(`
          SELECT id, name 
          FROM events 
          WHERE endDate >= CURDATE() 
          AND status IN ('scheduled', 'active', 'published')
        `);

        const { v4: uuidv4 } = require('uuid');

        for (const event of events) {
          const newId = uuidv4();
          await conn.query(
            'INSERT INTO assignments (id, agentId, eventId, status, assignedBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
            [newId, user.id, event.id, 'confirmed', adminId]
          );
          console.log(`✅ Créé: ${user.firstName} ${user.lastName} → ${event.name}`);
        }

        console.log('\n✅ Affectations créées! Reconnectez-vous avec cet email:', user.email);
      }

    } else {
      console.log('❌ Agent non trouvé');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    await conn.end();
  }
}

checkAgent();
