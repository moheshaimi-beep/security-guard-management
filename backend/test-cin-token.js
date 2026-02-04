const jwt = require('jsonwebtoken');
require('dotenv').config();

// Simuler un login CIN
const testUser = {
  id: '3ae0b39b-81aa-4ed6-99e7-4a49814942fd',
  role: 'supervisor',
  cin: 'BK517312'
};

// Générer les tokens comme dans le code
const accessToken = jwt.sign(
  { id: testUser.id, role: testUser.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

const refreshToken = jwt.sign(
  { id: testUser.id },
  process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
  { expiresIn: '30d' }
);

console.log('🔑 Access Token généré:');
console.log(accessToken);
console.log('\n📋 Contenu décodé:');
console.log(jwt.decode(accessToken));

console.log('\n\n🔑 Refresh Token généré:');
console.log(refreshToken);
console.log('\n📋 Contenu décodé:');
console.log(jwt.decode(refreshToken));
