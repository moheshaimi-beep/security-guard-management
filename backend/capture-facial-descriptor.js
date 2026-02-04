/**
 * Script pour capturer et sauvegarder le descripteur facial de test
 * Instructions:
 * 1. Se connecter à http://localhost:3000/checkin en tant que Youssef
 * 2. Dans la console du navigateur, exécuter ce code:
 * 
 * fetch('http://localhost:5000/api/auth/profile/update-descriptor', {
 *   method: 'PATCH',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': `Bearer ${localStorage.getItem('token')}`
 *   },
 *   body: JSON.stringify({
 *     facialDescriptor: Array.from(detectedDescriptor)
 *   })
 * })
 * .then(r => r.json())
 * .then(d => console.log('✅ Descripteur sauvegardé:', d))
 */

// Script helper pour générer des descripteurs de test réalistes
// Les vrais descripteurs de face-api.js sont 128 valeurs entre -1 et 1

function generateRealisticDescriptor() {
  const descriptor = new Float32Array(128);
  
  // Générer 128 valeurs aléatoires entre -1 et 1 (comme face-api.js)
  for (let i = 0; i < 128; i++) {
    descriptor[i] = (Math.random() * 2) - 1;
  }
  
  return descriptor;
}

function generateDescriptorVariation(baseDescriptor, variation = 0.05) {
  // Créer une variation du descripteur (pour tester la reconnaissance)
  const descriptor = new Float32Array(128);
  
  for (let i = 0; i < 128; i++) {
    const noise = (Math.random() * 2 - 1) * variation;
    descriptor[i] = Math.max(-1, Math.min(1, baseDescriptor[i] + noise));
  }
  
  return descriptor;
}

console.log(`
╔══════════════════════════════════════════════════════════════╗
║     FACIAL DESCRIPTOR GENERATION - FOR TESTING ONLY         ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║ OPTION 1: USE REAL FACIAL RECOGNITION                       ║
║  1. Open DevTools (F12) on CheckIn-V2 page                  ║
║  2. Capture your face (detection.descriptor will be logged) ║
║  3. Copy the descriptor from console logs                    ║
║  4. Update database: UPDATE Users SET facialDescriptor =... ║
║                                                              ║
║ OPTION 2: USE TEST DESCRIPTOR (for demo)                    ║
║  const testDesc = generateRealisticDescriptor();            ║
║  console.log(JSON.stringify(Array.from(testDesc)));         ║
║  Then save to database via API endpoint                     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateRealisticDescriptor,
    generateDescriptorVariation
  };
}
