const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('security_guard_db', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
  timezone: '+00:00'
});

async function checkEventDates() {
  try {
    const results = await sequelize.query(
      `SELECT id, name, startDate, endDate, checkInTime, checkOutTime, 
              DATE_FORMAT(startDate, '%Y-%m-%d %H:%i:%s') as startDateFormatted,
              DATE_FORMAT(endDate, '%Y-%m-%d %H:%i:%s') as endDateFormatted
       FROM events WHERE name LIKE '%italy%'`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    console.log('=== Event Data from Database ===');
    console.log(JSON.stringify(results, null, 2));
    
    if (results.length > 0) {
      const event = results[0];
      console.log('\n=== Date Parsing Test ===');
      console.log('startDate raw:', event.startDate);
      console.log('startDate parsed:', new Date(event.startDate));
      console.log('checkInTime:', event.checkInTime);
      console.log('checkOutTime:', event.checkOutTime);
      
      // Test avec la logique du frontend
      const startDate = new Date(event.startDate);
      if (event.checkInTime) {
        const [hours, minutes] = event.checkInTime.split(':');
        startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      console.log('\nstartDate after applying checkInTime:', startDate.toLocaleString());
      console.log('startDate ISO:', startDate.toISOString());
      
      const allowedStart = new Date(startDate.getTime() - (2 * 60 * 60 * 1000));
      console.log('allowedStart (2h avant):', allowedStart.toLocaleString());
      console.log('allowedStart ISO:', allowedStart.toISOString());
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkEventDates();
