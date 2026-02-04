const { sequelize } = require('./src/models');

const supervisorId = '3ae0b39b-81aa-4ed6-99e7-4a49814942fd';

sequelize.query(`
  SELECT 
    z.id, 
    z.name as zoneName, 
    e.id as eventId, 
    e.name as eventName, 
    e.status, 
    e.startDate, 
    e.endDate,
    e.checkInTime,
    e.checkOutTime
  FROM zones z 
  LEFT JOIN events e ON z.eventId = e.id 
  WHERE z.deletedAt IS NULL 
    AND JSON_CONTAINS(z.supervisors, ?)
  ORDER BY e.startDate
`, {
  replacements: [JSON.stringify(supervisorId)],
  type: sequelize.QueryTypes.SELECT
})
.then(zones => {
  console.log('\n=== TOUTES LES ZONES DU RESPONSABLE ===\n');
  
  const eventMap = {};
  
  zones.forEach(z => {
    if (z.eventId) {
      if (!eventMap[z.eventId]) {
        eventMap[z.eventId] = {
          id: z.eventId,
          name: z.eventName,
          status: z.status,
          startDate: z.startDate,
          endDate: z.endDate,
          checkInTime: z.checkInTime,
          checkOutTime: z.checkOutTime,
          zones: []
        };
      }
      eventMap[z.eventId].zones.push(z.zoneName);
    }
  });
  
  console.log(`Total événements: ${Object.keys(eventMap).length}\n`);
  
  Object.values(eventMap).forEach(e => {
    console.log(`📅 ${e.name}`);
    console.log(`   Status: ${e.status}`);
    console.log(`   Date: ${e.startDate?.toISOString().split('T')[0]} - ${e.endDate?.toISOString().split('T')[0]}`);
    console.log(`   Horaire: ${e.checkInTime} - ${e.checkOutTime}`);
    console.log(`   Zones (${e.zones.length}): ${e.zones.join(', ')}\n`);
  });
  
  process.exit();
})
.catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});
