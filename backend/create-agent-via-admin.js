const axios = require('axios');

// Configuration
const ADMIN_TOKEN = process.env.JWT_SECRET;
const ADMIN_EMAIL = 'admin@securityguard.com';
const ADMIN_PASSWORD = 'Admin@123';

async function loginAsAdmin() {
  try {
    console.log('=== Connexion en tant qu\'ADMIN pour créer l\'agent de test ===');

    // Login admin
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    if (loginResponse.data.success) {
      const adminToken = loginResponse.data.data.accessToken;
      console.log('✅ Login admin réussi!');

      // Créer l'agent de test
      const facialVector = [];
      for (let i = 0; i < 128; i++) {
        facialVector.push((Math.random() * 2 - 1));
      }

      const agentData = {
        employeeId: 'TEST001',
        cin: 'AB999999',
        firstName: 'Agent',
        lastName: 'Test',
        email: 'agent@test.com',
        password: 'Admin@123', // Mot de passe simple (sera hashé par le modèle)
        phone: '+33612345678',
        whatsappNumber: '+33612345678',
        role: 'agent',
        status: 'active',
        facialVector: facialVector,
        facialVectorUpdatedAt: new Date(),
        supervisorId: null,
        createdByType: 'admin',
        createdByUserId: null
      };

      console.log('Création de l\'agent de test...');

      const createResponse = await axios.post('http://localhost:5000/api/users', agentData, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (createResponse.data.success) {
        console.log('✅ Agent créé avec succès!');
        console.log('ID:', createResponse.data.data.id);
        console.log('CIN:', agentData.cin);
        console.log('Type de vecteur facial:', typeof createResponse.data.data.facialVector);
        console.log('Longueur:', createResponse.data.data.facialVector?.length);

        console.log('=================================');
        console.log('IDENTIFIANTS DE CONNEXION:');
        console.log('------------------------------');
        console.log('CIN        : AB999999');
        console.log('------------------------------');
        console.log('');
        console.log('NOTE: Vous pouvez maintenant utiliser la page Check-In avec:');
        console.log('  - Profil: Agent de sécurité');
        console.log('  - CIN: AB999999');
        console.log('');
        console.log('=================================');
      } else {
        console.error('❌ Erreur lors de la création:', createResponse.data?.message || createResponse.statusText);
      }

    } else {
      console.error('❌ Erreur lors du login admin:', loginResponse.data?.message || loginResponse.statusText);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

loginAsAdmin();
