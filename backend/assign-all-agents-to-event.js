const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });
  
  const supervisorId = '3ae0b39b-81aa-4ed6-99e7-4a49814942fd'; // youssef
  const eventId = '93af38ef-484d-4459-a8d4-06d20593f944'; // italy vs brazil
  
  console.log('\n🔍 Récupération des agents sans affectation...\n');
  
  // Get agents created by supervisor without assignments
  const [agents] = await conn.query(`
    SELECT u.id, u.employeeId, u.firstName, u.lastName
    FROM users u
    WHERE u.supervisorId = ? 
      AND u.role = 'agent'
      AND u.deletedAt IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM assignments a 
        WHERE a.agentId = u.id 
        AND a.deletedAt IS NULL
      )
  `, [supervisorId]);
  
  console.log(`📊 ${agents.length} agent(s) sans affectation trouvé(s)\n`);
  
  if (agents.length === 0) {
    console.log('✅ Tous les agents ont déjà des affectations!');
    await conn.end();
    return;
  }
  
  // Get zones for the event
  const [zones] = await conn.query(`
    SELECT id, name
    FROM zones
    WHERE eventId = ? AND deletedAt IS NULL
  `, [eventId]);
  
  if (zones.length === 0) {
    console.log('❌ Aucune zone trouvée pour cet événement!');
    await conn.end();
    return;
  }
  
  console.log(`✅ ${zones.length} zone(s) disponible(s) pour l'événement "italy vs brazil"\n`);
  
  // Create assignments for all agents (cycling through zones)
  const now = new Date();
  let zoneIndex = 0;
  
  for (const agent of agents) {
    const zone = zones[zoneIndex % zones.length];
    const assignmentId = uuidv4();
    
    console.log(`🔨 Création affectation pour: ${agent.firstName} ${agent.lastName}`);
    console.log(`   → Zone: ${zone.name}`);
    
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
      agent.id,
      eventId,
      zone.id,
      supervisorId,
      'confirmed',
      now,
      now
    ]);
    
    console.log(`   ✅ Affectation créée: ${assignmentId}\n`);
    
    zoneIndex++;
  }
  
  console.log(`\n🎉 ${agents.length} affectation(s) créée(s) avec succès!`);
  console.log('\n💡 Rafraîchissez la page "Historique de Création" pour voir les événements!\n');
  
  await conn.end();
})();
