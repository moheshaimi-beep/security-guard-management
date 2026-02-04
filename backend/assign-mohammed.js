const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });
  
  const agentId = 'd468e666-3f09-41f9-a16d-6e5e0700ddef'; // mohammed eshaimi
  const eventId = '93af38ef-484d-4459-a8d4-06d20593f944'; // italy vs brazil
  const zoneId = '81910016-3684-4630-997a-482aaef278a2'; // zone tata
  const supervisorId = '3ae0b39b-81aa-4ed6-99e7-4a49814942fd'; // youssef
  
  console.log('\n🔨 Création affectation pour mohammed eshaimi...\n');
  
  const now = new Date();
  const assignmentId = uuidv4();
  
  try {
    await conn.query(`
      INSERT INTO assignments (
        id,
        agentId,
        eventId,
        zoneId,
        assignedBy,
        status,
        createdAt,
        updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      assignmentId,
      agentId,
      eventId,
      zoneId,
      supervisorId,
      'confirmed',
      now,
      now
    ]);
    
    console.log('✅ Affectation créée avec succès!');
    console.log(`   ID: ${assignmentId}\n`);
    
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      console.log('ℹ️ Affectation existe déjà pour cet agent');
      
      const [existing] = await conn.query(`
        SELECT 
          a.*,
          e.name as eventName,
          z.name as zoneName
        FROM assignments a
        LEFT JOIN events e ON a.eventId = e.id
        LEFT JOIN zones z ON a.zoneId = z.id
        WHERE a.agentId = ? AND a.deletedAt IS NULL
      `, [agentId]);
      
      console.log('\nAffectations existantes:');
      existing.forEach(a => {
        console.log(`   - ${a.eventName} / ${a.zoneName} (${a.status})`);
      });
      console.log('');
      
    } else {
      throw e;
    }
  }
  
  await conn.end();
})();
