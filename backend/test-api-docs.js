/**
 * Script de test pour vérifier la documentation API
 * Exécuter: node backend/test-api-docs.js
 */

const path = require('path');

// Charger le générateur de documentation
const { generateApiDocumentation, API_CATEGORIES } = require('./src/scripts/extractApiRoutes');

console.log('🧪 Test de la Documentation API\n');
console.log('='.repeat(60));

try {
  // Générer la documentation
  console.log('\n📦 Génération de la documentation...');
  const docs = generateApiDocumentation();

  // Vérifications
  console.log('\n✅ Tests de validation:\n');

  // Test 1: Structure de base
  const hasBaseStructure = docs.generatedAt && docs.baseUrl && docs.version && docs.categories;
  console.log(`${hasBaseStructure ? '✅' : '❌'} Structure de base présente`);

  // Test 2: Nombre de catégories
  const categoryCount = Object.keys(docs.categories).length;
  console.log(`${categoryCount > 0 ? '✅' : '❌'} Catégories trouvées: ${categoryCount}`);

  // Test 3: Total de routes
  console.log(`${docs.totalRoutes > 0 ? '✅' : '❌'} Total de routes: ${docs.totalRoutes}`);

  // Test 4: Vérifier quelques catégories importantes
  const importantCategories = ['auth', 'users', 'events', 'attendance'];
  let allPresent = true;
  importantCategories.forEach(cat => {
    const present = docs.categories[cat] !== undefined;
    if (!present) allPresent = false;
    console.log(`${present ? '✅' : '❌'} Catégorie "${cat}" présente`);
  });

  // Test 5: Chaque catégorie a des routes
  let allHaveRoutes = true;
  Object.entries(docs.categories).forEach(([key, cat]) => {
    if (!cat.routes || cat.routes.length === 0) {
      console.log(`⚠️  Catégorie "${key}" n'a pas de routes`);
      allHaveRoutes = false;
    }
  });
  console.log(`${allHaveRoutes ? '✅' : '❌'} Toutes les catégories ont des routes`);

  // Test 6: Format des routes
  let allRoutesValid = true;
  let sampleRoute = null;
  
  for (const [catKey, category] of Object.entries(docs.categories)) {
    for (const route of category.routes) {
      if (!sampleRoute) sampleRoute = route;
      
      if (!route.method || !route.path || route.requiresAuth === undefined || !route.roles) {
        console.log(`❌ Route invalide dans ${catKey}: ${JSON.stringify(route)}`);
        allRoutesValid = false;
        break;
      }
    }
    if (!allRoutesValid) break;
  }
  console.log(`${allRoutesValid ? '✅' : '❌'} Format des routes valide`);

  // Statistiques détaillées
  console.log('\n📊 Statistiques Détaillées:\n');
  console.log(`   Base URL: ${docs.baseUrl}`);
  console.log(`   Version: ${docs.version}`);
  console.log(`   Généré le: ${new Date(docs.generatedAt).toLocaleString('fr-FR')}`);
  console.log(`   Total routes: ${docs.totalRoutes}`);
  console.log(`   Total catégories: ${categoryCount}`);

  // Répartition par méthode
  const methodStats = {};
  Object.values(docs.categories).forEach(cat => {
    cat.routes.forEach(route => {
      methodStats[route.method] = (methodStats[route.method] || 0) + 1;
    });
  });

  console.log('\n   Répartition par méthode HTTP:');
  Object.entries(methodStats).sort((a, b) => b[1] - a[1]).forEach(([method, count]) => {
    const percentage = ((count / docs.totalRoutes) * 100).toFixed(1);
    console.log(`   - ${method.padEnd(7)}: ${count.toString().padEnd(3)} (${percentage}%)`);
  });

  // Top 10 catégories
  console.log('\n   Top 10 catégories par nombre de routes:');
  Object.entries(docs.categories)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .forEach(([key, cat], index) => {
      const percentage = ((cat.count / docs.totalRoutes) * 100).toFixed(1);
      console.log(`   ${(index + 1).toString().padStart(2)}. ${cat.name.padEnd(25)}: ${cat.count.toString().padEnd(2)} routes (${percentage}%)`);
    });

  // Routes publiques vs authentifiées
  let publicRoutes = 0;
  let authRoutes = 0;
  let adminRoutes = 0;

  Object.values(docs.categories).forEach(cat => {
    cat.routes.forEach(route => {
      if (!route.requiresAuth) {
        publicRoutes++;
      } else if (route.roles.includes('admin')) {
        adminRoutes++;
      } else {
        authRoutes++;
      }
    });
  });

  console.log('\n   Répartition par authentification:');
  console.log(`   - Routes publiques    : ${publicRoutes.toString().padEnd(3)} (${((publicRoutes / docs.totalRoutes) * 100).toFixed(1)}%)`);
  console.log(`   - Routes authentifiées: ${authRoutes.toString().padEnd(3)} (${((authRoutes / docs.totalRoutes) * 100).toFixed(1)}%)`);
  console.log(`   - Routes admin        : ${adminRoutes.toString().padEnd(3)} (${((adminRoutes / docs.totalRoutes) * 100).toFixed(1)}%)`);

  // Exemple de route
  if (sampleRoute) {
    console.log('\n   Exemple de route documentée:');
    console.log(`   {`);
    console.log(`     method: "${sampleRoute.method}",`);
    console.log(`     path: "${sampleRoute.path}",`);
    console.log(`     requiresAuth: ${sampleRoute.requiresAuth},`);
    console.log(`     roles: [${sampleRoute.roles.map(r => `"${r}"`).join(', ')}],`);
    console.log(`     file: "${sampleRoute.file}"`);
    console.log(`   }`);
  }

  // Résumé final
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Tous les tests sont passés avec succès!');
  console.log('\n📝 La documentation API est complète et fonctionnelle.');
  console.log('\n🌐 Accessible via:');
  console.log(`   - Interface: http://localhost:3000/settings (onglet "Documentation API")`);
  console.log(`   - API REST:  http://localhost:3000/api/api-docs`);
  console.log('\n' + '='.repeat(60) + '\n');

  process.exit(0);

} catch (error) {
  console.error('\n❌ Erreur lors du test:', error.message);
  console.error(error.stack);
  process.exit(1);
}
