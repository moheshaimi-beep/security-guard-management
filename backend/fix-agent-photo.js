const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

const sequelize = new Sequelize('security_guard_db', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

async function fixAgentPhoto() {
  try {
    // First, list all agents
    const [agents] = await sequelize.query(
      'SELECT id, employeeId, firstName, lastName, cin, profilePhoto FROM users WHERE role = "agent" AND deletedAt IS NULL ORDER BY createdAt DESC'
    );
    
    console.log('\n=== TOUS LES AGENTS ===\n');
    agents.forEach((agent, index) => {
      console.log(`${index + 1}. ${agent.firstName} ${agent.lastName}`);
      console.log(`   ID: ${agent.id}`);
      console.log(`   EmployeeID: ${agent.employeeId}`);
      console.log(`   CIN: ${agent.cin}`);
      console.log(`   Photo: ${agent.profilePhoto || 'NULL'}`);
      console.log('');
    });
    
    // Get all facial photos sorted by date
    const uploadsDir = path.join(__dirname, 'uploads', 'facial');
    const files = fs.readdirSync(uploadsDir).sort().reverse();
    
    if (files.length === 0) {
      console.log('❌ Aucune photo trouvée dans uploads/facial');
      await sequelize.close();
      return;
    }
    
    // Use the most recent photo
    const recentPhoto = files[0];
    const photoPath = `/uploads/facial/${recentPhoto}`;
    
    console.log(`\n📸 Photo sélectionnée: ${photoPath}`);
    
    // Update first agent without photo
    const agentWithoutPhoto = agents.find(a => !a.profilePhoto);
    if (agentWithoutPhoto) {
      const [result] = await sequelize.query(
        'UPDATE users SET profilePhoto = :photoPath WHERE id = :agentId',
        {
          replacements: { photoPath, agentId: agentWithoutPhoto.id }
        }
      );
      
      console.log(`✅ Agent ${agentWithoutPhoto.firstName} ${agentWithoutPhoto.lastName} mis à jour`);
      
      // Verify the update
      const [updated] = await sequelize.query(
        'SELECT id, employeeId, firstName, lastName, profilePhoto FROM users WHERE id = :agentId',
        {
          replacements: { agentId: agentWithoutPhoto.id }
        }
      );
      
      console.log('\n=== AGENT MIS À JOUR ===');
      console.log(JSON.stringify(updated[0], null, 2));
    } else {
      console.log('✅ Tous les agents ont déjà une photo');
    }
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

fixAgentPhoto();
