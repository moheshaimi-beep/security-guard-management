const { sequelize } = require('./src/models');

const supervisorId = '3ae0b39b-81aa-4ed6-99e7-4a49814942fd';

const query = `
  SELECT DISTINCT 
    e.id, 
    e.name, 
    e.status, 
    e.startDate, 
    e.endDate, 
    e.checkInTime, 
    e.checkOutTime, 
    e.agentCreationBuffer,
    (SELECT COUNT(*) 
     FROM zones z 
     WHERE z.eventId = e.id 
     AND z.deletedAt IS NULL 
     AND JSON_CONTAINS(z.supervisors, ?)) as managedZones
  FROM events e
  INNER JOIN zones z ON e.id = z.eventId
  WHERE e.deletedAt IS NULL
    AND z.deletedAt IS NULL
    AND JSON_CONTAINS(z.supervisors, ?)
    AND e.status NOT IN (?, ?)
    AND CONCAT(e.endDate, ' ', IFNULL(e.checkOutTime, '23:59:59')) >= NOW()
  ORDER BY e.startDate
`;

sequelize.query(query, {
  replacements: [
    JSON.stringify(supervisorId),
    JSON.stringify(supervisorId),
    'cancelled',
    'terminated'
  ],
  type: sequelize.QueryTypes.SELECT
})
.then(events => {
  console.log('\n📊 Événements retournés par API:', events.length);
  console.log('Heure actuelle:', new Date().toLocaleString('fr-FR'), '\n');
  
  events.forEach(e => {
    const now = new Date();
    const checkInStart = new Date(`${e.startDate.toISOString().split('T')[0]} ${e.checkInTime || '00:00:00'}`);
    const bufferHours = (e.agentCreationBuffer || 120) / 60;
    checkInStart.setHours(checkInStart.getHours() - bufferHours);
    const checkOutEnd = new Date(`${e.endDate.toISOString().split('T')[0]} ${e.checkOutTime || '23:59:59'}`);
    
    let computedStatus = 'scheduled';
    if (now > checkOutEnd) {
      computedStatus = 'completed';
    } else if (now >= checkInStart && now <= checkOutEnd) {
      computedStatus = 'active';
    }
    
    console.log(`📅 ${e.name}`);
    console.log(`   DB Status: ${e.status}`);
    console.log(`   Computed Status: ${computedStatus}`);
    console.log(`   Start: ${e.startDate.toISOString().split('T')[0]} ${e.checkInTime}`);
    console.log(`   Zones gérées: ${e.managedZones}`);
    console.log(`   Fenêtre check-in: ${checkInStart.toLocaleString('fr-FR')}`);
    console.log(`   Devrait s'afficher: ${!['completed', 'terminated', 'cancelled'].includes(computedStatus) ? 'OUI ✅' : 'NON ❌'}\n`);
  });
  
  process.exit();
})
.catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});
