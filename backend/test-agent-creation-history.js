const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

// Configuration - À remplacer par des tokens valides
const ADMIN_TOKEN = 'votre_token_admin';
const RESPONSABLE_TOKEN = 'votre_token_responsable';

/**
 * Test 1: Vérifier l'accès à l'historique des créations (Admin)
 */
async function testGetCreationHistoryAsAdmin() {
  console.log('\n=== Test 1: GET /api/creation-history/agents (Admin) ===');
  try {
    const response = await axios.get(`${BASE_URL}/creation-history/agents`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    console.log('✅ Succès:', response.data);
    console.log(`Total agents: ${response.data.count}`);
    console.log('Statistiques:', JSON.stringify(response.data.stats, null, 2));
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

/**
 * Test 2: Vérifier l'accès à l'historique des créations (Responsable)
 */
async function testGetCreationHistoryAsResponsable() {
  console.log('\n=== Test 2: GET /api/creation-history/agents (Responsable) ===');
  try {
    const response = await axios.get(`${BASE_URL}/creation-history/agents`, {
      headers: {
        'Authorization': `Bearer ${RESPONSABLE_TOKEN}`
      }
    });

    console.log('✅ Succès:', response.data);
    console.log(`Total agents créés par ce responsable: ${response.data.count}`);
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

/**
 * Test 3: Obtenir les détails d'un agent spécifique
 */
async function testGetAgentDetails(agentId) {
  console.log(`\n=== Test 3: GET /api/creation-history/agents/${agentId} ===`);
  try {
    const response = await axios.get(`${BASE_URL}/creation-history/agents/${agentId}`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    console.log('✅ Succès:', response.data);
    console.log('Agent:', response.data.agent.fullName);
    console.log('Créé par:', response.data.agent.creation.createdBy?.name || 'N/A');
    console.log('Affectations:', response.data.agent.assignments?.length || 0);
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

/**
 * Test 4: Obtenir les statistiques globales (Admin uniquement)
 */
async function testGetGlobalStats() {
  console.log('\n=== Test 4: GET /api/creation-history/stats (Admin) ===');
  try {
    const response = await axios.get(`${BASE_URL}/creation-history/stats`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    console.log('✅ Succès:', response.data);
    console.log('Statistiques globales:', JSON.stringify(response.data.stats, null, 2));
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

/**
 * Test 5: Tester la validation de période pour création d'agent
 */
async function testAgentCreationPeriodValidation() {
  console.log('\n=== Test 5: POST /api/supervisor/create-agent (Hors période) ===');
  
  try {
    const formData = new FormData();
    formData.append('nom', 'Test');
    formData.append('prenom', 'Agent');
    formData.append('telephone', '+212600000000');
    formData.append('supervisorId', 'test-supervisor-id');
    formData.append('selectedZones', JSON.stringify(['zone-id-1']));
    formData.append('eventId', 'event-id-test');
    formData.append('autoAssign', 'true');
    formData.append('faceDescriptor', JSON.stringify([0.1, 0.2, 0.3]));
    
    // Note: Dans un vrai test, ajouter des fichiers pour cinPhoto et facialPhoto
    
    const response = await axios.post(
      `${BASE_URL}/supervisor/create-agent`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${RESPONSABLE_TOKEN}`,
          ...formData.getHeaders()
        }
      }
    );

    console.log('✅ Succès:', response.data);
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('✅ Validation correcte: Création refusée hors période');
      console.log('Message:', error.response.data.message);
    } else {
      console.error('❌ Erreur inattendue:', error.response?.data || error.message);
    }
  }
}

/**
 * Test 6: Vérifier que les champs de traçabilité sont présents
 */
async function testTraceabilityFields() {
  console.log('\n=== Test 6: Vérification des champs de traçabilité ===');
  try {
    const response = await axios.get(`${BASE_URL}/creation-history/agents`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    if (response.data.agents.length > 0) {
      const agent = response.data.agents[0];
      console.log('✅ Premier agent:');
      console.log('  - ID:', agent.id);
      console.log('  - Nom:', agent.fullName);
      console.log('  - Type de création:', agent.creation.type);
      console.log('  - Créé par:', agent.creation.createdBy?.name || 'N/A');
      console.log('  - Statut:', agent.status);
      
      // Vérifier que les champs existent
      if (agent.creation.type && (agent.creation.createdBy || agent.creation.type === 'self_registration')) {
        console.log('✅ Champs de traçabilité présents');
      } else {
        console.log('❌ Champs de traçabilité manquants');
      }
    } else {
      console.log('⚠️ Aucun agent trouvé pour le test');
    }
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

/**
 * Exécuter tous les tests
 */
async function runAllTests() {
  console.log('==========================================================');
  console.log('   Tests - Création d\'agents et Historique centralisé   ');
  console.log('==========================================================');
  
  console.log('\n⚠️ ATTENTION: Assurez-vous de remplacer ADMIN_TOKEN et RESPONSABLE_TOKEN');
  console.log('par des tokens JWT valides avant d\'exécuter ces tests.\n');

  // Attendre quelques secondes pour laisser le temps de lire
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Tests de lecture (sans modification)
  await testGetCreationHistoryAsAdmin();
  await testGetCreationHistoryAsResponsable();
  await testGetGlobalStats();
  await testTraceabilityFields();
  
  // Test de détails (remplacer 'agent-id-test' par un ID réel)
  // await testGetAgentDetails('agent-id-test');
  
  // Test de création (nécessite des fichiers et un événement actif)
  // await testAgentCreationPeriodValidation();

  console.log('\n==========================================================');
  console.log('                    Tests terminés                        ');
  console.log('==========================================================\n');
}

// Exécuter les tests si le fichier est exécuté directement
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testGetCreationHistoryAsAdmin,
  testGetCreationHistoryAsResponsable,
  testGetAgentDetails,
  testGetGlobalStats,
  testAgentCreationPeriodValidation,
  testTraceabilityFields
};
