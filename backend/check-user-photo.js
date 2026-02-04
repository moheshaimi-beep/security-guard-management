const { User } = require('./src/models');
const fs = require('fs');
const path = require('path');

async function checkUserProfilePhoto() {
  try {
    console.log('📸 Vérification de la photo de profil de A303730...\n');
    
    const user = await User.findOne({
      where: { cin: 'A303730' }
    });
    
    if (!user) {
      console.log('❌ Utilisateur A303730 non trouvé');
      return;
    }
    
    console.log(`👤 Utilisateur: ${user.firstName} ${user.lastName}`);
    console.log(`📸 Profile Photo: ${user.profilePhoto ? 'PRÉSENTE ✅' : 'ABSENTE ❌'}`);
    
    if (user.profilePhoto) {
      console.log(`   Photo Length: ${user.profilePhoto.length} caractères`);
      if (user.profilePhoto.startsWith('data:image/')) {
        console.log(`   Format: Base64 image`);
      } else if (user.profilePhoto.startsWith('uploads/')) {
        console.log(`   Format: File path - ${user.profilePhoto}`);
        
        // Vérifier si le fichier existe
        const fullPath = path.join(__dirname, '..', user.profilePhoto);
        const exists = fs.existsSync(fullPath);
        console.log(`   Fichier existe: ${exists ? 'OUI ✅' : 'NON ❌'}`);
      } else {
        console.log(`   Format: URL ou autre - ${user.profilePhoto.substring(0, 50)}...`);
      }
    } else {
      console.log('\n🔧 Ajout d\'une photo de profil de test...');
      
      // Photo de test (petit avatar)
      const testAvatar = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyLli5xc+ZNqoooMCNYl0aKKKAFYKKKKBpOKDyGjP8AU7hUYklR8QvJRRQB//Z';
      
      await user.update({
        profilePhoto: testAvatar
      });
      
      console.log('✅ Photo de profil ajoutée');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

checkUserProfilePhoto();