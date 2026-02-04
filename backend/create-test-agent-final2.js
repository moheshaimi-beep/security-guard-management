const { User } = require('./src/models');
const bcrypt = require('bcryptjs');

async function createTestAgent() {
  try {
    // Supprimer l'agent de test s'il existe
    const existing = await User.findOne({ where: { employeeId: 'TEST001' } });
    if (existing) {
      console.log('Suppression de l\'agent de test existant...');
      await User.destroy({ where: { employeeId: 'TEST001' }, force: true });
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('Test@123', salt);

    // Créer un vecteur facial de test (128 float values entre -1 et 1)
    const testFacialVector = [];
    for (let i = 0; i < 128; i++) {
      testFacialVector.push((Math.random() * 2 - 1));
    }
    const facialVectorJSON = JSON.stringify(testFacialVector);

    console.log('Vecteur facial JSON string (length):', facialVectorJSON.length);

    // Créer l'agent de test en passant le vecteur facial déjà encrypté (pour éviter le double chiffrement)
    // On crée l'objet sans facialVector, puis on le met à jour avec hooks activés
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
      supervisorId: null,
      createdByType: 'admin',
      createdByUserId: null,
    }, { hooks: false }); // SANS hook - l'objet sera créé sans chiffrement

    // Maintenant mettre à jour avec le vecteur facial (hooks activés)
    console.log('Tentative de mise à jour du vecteur facial...');
    await testAgent.update({ facialVector: facialVectorJSON }, { hooks: true });

    // Vérifier le résultat
    const updatedAgent = await User.findOne({ where: { employeeId: 'TEST001' } });
    console.log('FacialVector après mise à jour:');
    console.log('  Type:', typeof updatedAgent.facialVector);
    console.log('  Longueur:', updatedAgent.facialVector?.length);
    console.log('  Préfixe:', updatedAgent.facialVector?.substring(0, 50));

    console.log('=================================');
    console.log('Agent de test créé avec succès!');
    console.log('=================================');
    console.log('');
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
    console.error('Erreur lors de la création de l\'agent de test:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

createTestAgent();
