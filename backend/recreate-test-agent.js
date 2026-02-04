const { User } = require('./src/models');
const bcrypt = require('bcryptjs');

async function createTestAgent() {
  try {
    console.log('=== Création de l\'agent de test ===');

    // Supprimer l'agent de test s'il existe
    const existing = await User.findOne({ where: { employeeId: 'TEST001' } });
    if (existing) {
      console.log('Suppression de l\'agent de test existant...');
      await User.destroy({ where: { employeeId: 'TEST001' }, force: true });
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('Test@123', salt);

    console.log('  Mot de passe hashé avec succès');

    // Créer un vecteur facial de test (128 float values entre -1 et 1)
    const testFacialVector = [];
    for (let i = 0; i < 128; i++) {
      testFacialVector.push((Math.random() * 2 - 1));
    }
    const facialVectorJSON = JSON.stringify(testFacialVector);

    console.log('  Vecteur facial créé:', testFacialVector.length, 'valeurs');
    console.log('  JSON string longueur:', facialVectorJSON.length);

    // Créer l'agent de test avec le vecteur facial
    const testAgent = await User.create({
      employeeId: 'TEST001',
      cin: 'AB999999',
      firstName: 'Agent',
      lastName: 'Test',
      email: 'agent@test.com',
      password: hashedPassword,
      phone: '+33612345678',
      whatsappNumber: '+33612345678',
      role: 'agent',
      status: 'active',
      facialVector: facialVectorJSON, // String JSON déjà formattée
      facialVectorUpdatedAt: new Date(),
      supervisorId: null,
      createdByType: 'admin',
      createdByUserId: null,
    });

    console.log('  Agent créé avec ID:', testAgent.id);
    console.log('  Type de facialVector en DB:', typeof testAgent.facialVector);
    console.log('  Longueur:', testAgent.facialVector?.length);
    console.log('=================================');
    console.log('IDENTIFIANTS DE CONNEXION:');
    console.log('------------------------------');
    console.log('Email      : agent@test.com');
    console.log('Mot de passe: Test@123');
    console.log('CIN        : AB999999');
    console.log('------------------------------');
    console.log('');
    console.log('NOTE: Cet agent a un vecteur facial enregistré.');
    console.log('      Vous pouvez utiliser la page de Check-In avec le CIN "AB999999"');
    console.log('');
    console.log('=================================');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('ERREUR lors de la création de l\'agent de test:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

createTestAgent();
