const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'security_guard_db'
  });

  try {
    const email = 'moheshaimi@gmail.com';  // Agent de test
    const newPassword = 'test123';  // Nouveau mot de passe simple

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const [result] = await conn.query(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, email]
    );

    if (result.affectedRows > 0) {
      console.log('✅ Mot de passe réinitialisé avec succès!\n');
      console.log('📧 Email:', email);
      console.log('🔑 Nouveau mot de passe:', newPassword);
      console.log('\n⚠️ Utilisez ces identifiants pour vous connecter comme AGENT');
    } else {
      console.log('❌ Utilisateur non trouvé');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await conn.end();
  }
}

resetPassword();
