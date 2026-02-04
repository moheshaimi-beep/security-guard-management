const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });
  
  // IDs
  const agentId = 'b623e135-2be9-4976-9f96-7c1c61f07c5a'; // TAZI THAMI
  const eventId = '93af38ef-484d-4459-a8d4-06d20593f944'; // italy vs brazil
  const supervisorId = '3ae0b39b-81aa-4ed6-99e7-4a49814942fd'; // youssef
  
  console.log('\n📋 Récupération des zones de l\'événement "italy vs brazil"...\n');
  
  // Get zones for this event
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
  
  console.log(`✅ ${zones.length} zone(s) trouvée(s):`);
  zones.forEach((zone, idx) => {
    console.log(`   ${idx + 1}. ${zone.name} (${zone.id})`);
  });
  
  // Use first zone
  const zoneId = zones[0].id;
  
  console.log(`\n🔨 Création de l'affectation pour TAZI THAMI...\n`);
  console.log(`   Agent: TAZI THAMI`);
  console.log(`   Événement: italy vs brazil`);
  console.log(`   Zone: ${zones[0].name}`);
  console.log(`   Superviseur: youssef`);
  
  const assignmentId = uuidv4();
  const now = new Date();
  
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
  
  console.log(`\n✅ Affectation créée avec succès!`);
  console.log(`   ID: ${assignmentId}\n`);
  
  // Verify
  const [result] = await conn.query(`
    SELECT 
      a.id,
      a.status,
      u.firstName,
      u.lastName,
      e.name as eventName,
      z.name as zoneName
    FROM assignments a
    JOIN users u ON a.agentId = u.id
    JOIN events e ON a.eventId = e.id
    JOIN zones z ON a.zoneId = z.id
    WHERE a.id = ?
  `, [assignmentId]);
  
  if (result.length > 0) {
    const r = result[0];
    console.log('✅ Vérification:');
    console.log(`   Agent: ${r.firstName} ${r.lastName}`);
    console.log(`   Événement: ${r.eventName}`);
    console.log(`   Zone: ${r.zoneName}`);
    console.log(`   Status: ${r.status}`);
  }
  
  console.log('\n🎉 Vous pouvez maintenant rafraîchir la page "Historique de Création" pour voir l\'événement!\n');
  
  await conn.end();
})();
