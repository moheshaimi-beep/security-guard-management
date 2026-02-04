// Test de la nouvelle logique de parsing des dates

const currentEvent = {
  startDate: "2026-01-22T00:00:00.000Z",
  endDate: "2026-01-22T00:00:00.000Z",
  checkInTime: "22:30:00",
  checkOutTime: "00:00:00"
};

console.log('=== Test Nouvelle Logique ===\n');

const startDateStr = currentEvent.startDate.split('T')[0]; // '2026-01-22'
const endDateStr = (currentEvent.endDate || currentEvent.startDate).split('T')[0];

console.log('startDateStr:', startDateStr);
console.log('endDateStr:', endDateStr);

let startDate, endDate;

if (currentEvent.checkInTime) {
  const [hours, minutes, seconds] = currentEvent.checkInTime.split(':');
  startDate = new Date(`${startDateStr}T${hours}:${minutes}:${seconds || '00'}`);
}

if (currentEvent.checkOutTime) {
  const [hours, minutes, seconds] = currentEvent.checkOutTime.split(':');
  // Si c'est minuit (00:00), c'est le lendemain
  if (hours === '00' && minutes === '00') {
    // Ajouter 1 jour
    const nextDay = new Date(endDateStr);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];
    endDate = new Date(`${nextDayStr}T${hours}:${minutes}:59`);
  } else {
    endDate = new Date(`${endDateStr}T${hours}:${minutes}:59`);
  }
}

console.log('\nstartDate:', startDate.toLocaleString());
console.log('startDate ISO:', startDate.toISOString());

console.log('\nendDate:', endDate.toLocaleString());
console.log('endDate ISO:', endDate.toISOString());

const allowedStartTime = new Date(startDate.getTime() - (2 * 60 * 60 * 1000));
console.log('\nallowedStart (2h avant):', allowedStartTime.toLocaleString());
console.log('allowedStart ISO:', allowedStartTime.toISOString());

console.log('\nallowedEnd:', endDate.toLocaleString());
console.log('allowedEnd ISO:', endDate.toISOString());

const now = new Date();
console.log('\nnow:', now.toLocaleString());
console.log('now ISO:', now.toISOString());

const withinPeriod = now >= allowedStartTime && now <= endDate;
console.log('\nwithinPeriod:', withinPeriod);
