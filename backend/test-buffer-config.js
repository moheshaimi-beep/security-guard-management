// Test de la configuration agentCreationBuffer

const testCases = [
  { minutes: 30, label: '30 min avant' },
  { minutes: 60, label: '1h avant' },
  { minutes: 90, label: '1h30 avant' },
  { minutes: 120, label: '2h avant' }
];

// Événement qui commence à 22:30 aujourd'hui
const eventStart = new Date('2026-01-22T22:30:00');
console.log('Événement commence à:', eventStart.toLocaleString());
console.log('\n=== Test des différents délais ===\n');

testCases.forEach(test => {
  const allowedStart = new Date(eventStart.getTime() - (test.minutes * 60 * 1000));
  console.log(`${test.label}:`);
  console.log(`  → Création autorisée dès: ${allowedStart.toLocaleString()}`);
  console.log(`  → Création autorisée jusqu'à: ${eventStart.toLocaleString()}`);
  console.log('');
});

// Test si maintenant on peut créer
const now = new Date();
console.log('\n=== Test avec l\'heure actuelle ===');
console.log('Maintenant:', now.toLocaleString());

testCases.forEach(test => {
  const allowedStart = new Date(eventStart.getTime() - (test.minutes * 60 * 1000));
  const canCreate = now >= allowedStart && now <= eventStart;
  console.log(`\n${test.label}: ${canCreate ? '✅ AUTORISÉ' : '❌ NON AUTORISÉ'}`);
  console.log(`  Autorisé de ${allowedStart.toLocaleTimeString()} à ${eventStart.toLocaleTimeString()}`);
});
