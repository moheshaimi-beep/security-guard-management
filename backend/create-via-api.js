const axios = require('axios');
const bcrypt = require('bcryptjs');

async function createAgentViaAPI() {
  try {
    console.log('=== Création de l\'agent de test via API ===');

    // D'abord, supprimer l'agent s'il existe
    console.log('Suppression de l\'agent existant...');
    try {
      await axios.delete('http://localhost:5000/api/users/TEST001', {
        headers: {
          'Authorization': 'Bearer admin-token-to-replace'
        }
      });
      console.log('Agent supprimé');
    } catch (err) {
      console.log('Agent non existant ou erreur de suppression:', err.response?.data || err.message);
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('Test@123', salt);

    console.log('Mot de passe hashé');

    // Créer un vecteur facial de test (128 float values entre -1 et 1)
    const testFacialVector = [];
    for (let i = 0; i < 128; i++) {
      testFacialVector.push((Math.random() * 2 - 1));
    }

    console.log('Vecteur facial créé:', testFacialVector.length, 'valeurs');

    // Créer l'agent avec login admin (bypass password hash)
    const agentData = {
      employeeId: 'TEST001',
      cin: 'AB999999',
      firstName: 'Agent',
      lastName: 'Test',
      email: 'agent@test.com',
      phone: '+33612345678',
      whatsappNumber: '+33612345678',
      role: 'agent',
      status: 'active',
      facialVector: testFacialVector,
      facialVectorUpdatedAt: new Date(),
      supervisorId: null,
      createdByType: 'admin',
      createdByUserId: null
    };

    console.log('Données de l\'agent prêtes');
    console.log(JSON.stringify(agentData, null, 2));

    // Créer l'agent
    const createResponse = await axios.post('http://localhost:5000/api/users', agentData, {
      headers: {
        'Authorization': 'Bearer admin-token-to-replace' // À remplacer par votre vrai token admin
      }
    });

    if (createResponse.data.success) {
      console.log('Agent créé avec succès! ID:', createResponse.data.data.id);
      console.log('Type de facialVector:', typeof createResponse.data.data.facialVector);
      console.log('Longueur:', createResponse.data.data.facialVector?.length);
      console.log('=================================');
      console.log('IDENTIFIANTS DE CONNEXION:');
      console.log('------------------------------');
      console.log('CIN        : AB999999');
      console.log('------------------------------');
      console.log('NOTE: Utilisez le formulaire Admin pour modifier l\'agent et ajouter une photo si besoin.');
      console.log('=================================');
    } else {
      console.error('Erreur lors de la création:', createResponse.data?.message || createResponse.statusText);
    }

    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
}

createAgentViaAPI();
