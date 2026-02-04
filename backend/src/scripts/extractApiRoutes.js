/**
 * Script pour extraire automatiquement toutes les routes API
 * Ce script analyse les fichiers de routes et génère une documentation complète
 */

const fs = require('fs');
const path = require('path');

// Définition des catégories d'API
const API_CATEGORIES = {
  auth: { name: 'Authentification', description: 'Gestion de l\'authentification et des utilisateurs' },
  users: { name: 'Utilisateurs', description: 'Gestion des utilisateurs et profils' },
  events: { name: 'Événements', description: 'Gestion des événements de sécurité' },
  assignments: { name: 'Affectations', description: 'Affectation des agents aux événements' },
  attendance: { name: 'Pointage', description: 'Gestion du pointage des agents' },
  tracking: { name: 'Géolocalisation', description: 'Suivi GPS des agents' },
  incidents: { name: 'Incidents', description: 'Signalement et gestion des incidents' },
  notifications: { name: 'Notifications', description: 'Système de notifications' },
  messages: { name: 'Messages', description: 'Messagerie interne' },
  reports: { name: 'Rapports', description: 'Génération de rapports' },
  sos: { name: 'SOS', description: 'Alertes d\'urgence SOS' },
  badges: { name: 'Badges', description: 'Système de badges et récompenses' },
  documents: { name: 'Documents', description: 'Gestion des documents' },
  zones: { name: 'Zones', description: 'Gestion des zones géographiques' },
  supervisor: { name: 'Superviseurs', description: 'Gestion des superviseurs' },
  permissions: { name: 'Permissions', description: 'Système de permissions' },
  maintenance: { name: 'Maintenance', description: 'Outils de maintenance système' },
  audit: { name: 'Audit', description: 'Logs d\'audit et traçabilité' },
  analytics: { name: 'Analytique', description: 'Analyses et statistiques avancées' },
  faceRecognition: { name: 'Reconnaissance Faciale', description: 'Système de reconnaissance faciale' },
  adminNotifications: { name: 'Notifications Admin', description: 'Gestion avancée des notifications' },
  databaseBackup: { name: 'Sauvegardes', description: 'Sauvegardes de base de données' },
  map: { name: 'Carte', description: 'Services de cartographie' },
  whatsapp: { name: 'WhatsApp', description: 'Intégration WhatsApp' },
  diagnostic: { name: 'Diagnostic', description: 'Outils de diagnostic système' },
  quickAdd: { name: 'Ajout Rapide', description: 'Ajout rapide d\'agents' },
  creationHistory: { name: 'Historique', description: 'Historique de création des agents' },
  attendanceDuplicate: { name: 'Anti-Doublons', description: 'Détection de doublons de pointage' }
};

// Routes principales depuis index.js
const MAIN_ROUTES = {
  '/api/auth': 'auth',
  '/api/users': 'users',
  '/api/events': 'events',
  '/api/assignments': 'assignments',
  '/api/attendance': 'attendance',
  '/api/notifications': 'notifications',
  '/api/reports': 'reports',
  '/api/incidents': 'incidents',
  '/api/badges': 'badges',
  '/api/documents': 'documents',
  '/api/tracking': 'tracking',
  '/api/messages': 'messages',
  '/api/quick-add': 'quickAdd',
  '/api/sos': 'sos',
  '/api/permissions': 'permissions',
  '/api/zones': 'zones',
  '/api/supervisor': 'supervisor',
  '/api/maintenance': 'maintenance',
  '/api/creation-history': 'creationHistory',
  '/api/admin-notifications': 'adminNotifications',
  '/api/audit': 'audit',
  '/api/analytics': 'analytics',
  '/api/face-recognition': 'faceRecognition',
  '/api/database-backup': 'databaseBackup',
  '/api/map': 'map',
  '/api/whatsapp': 'whatsapp',
  '/api/diagnostic': 'diagnostic',
  '/api/attendance-duplicate': 'attendanceDuplicate'
};

/**
 * Extrait les routes d'un fichier de route
 */
function extractRoutesFromFile(filePath, basePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const routes = [];

  // Regex pour extraire les routes
  const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const [, method, routePath] = match;
    
    // Construire le chemin complet
    const fullPath = basePath + (routePath === '/' ? '' : routePath);
    
    // Essayer d'extraire des commentaires ou contexte
    const lineStart = content.lastIndexOf('\n', match.index);
    const lineEnd = content.indexOf('\n', match.index);
    const line = content.substring(lineStart, lineEnd);
    
    // Déterminer si authentification requise
    const requiresAuth = content.substring(Math.max(0, match.index - 200), match.index)
      .includes('authenticate') || 
      content.substring(Math.max(0, match.index - 200), match.index)
      .includes('authorize');
    
    // Essayer d'extraire les rôles autorisés
    const authorizeMatch = content.substring(Math.max(0, match.index - 300), match.index)
      .match(/authorize\s*\(\s*['"`]([^'"`]+)['"`](?:,\s*['"`]([^'"`]+)['"`])?\)/);
    
    const roles = authorizeMatch ? 
      [authorizeMatch[1], authorizeMatch[2]].filter(Boolean) : 
      (requiresAuth ? ['authenticated'] : ['public']);
    
    routes.push({
      method: method.toUpperCase(),
      path: fullPath,
      requiresAuth,
      roles,
      file: path.basename(filePath)
    });
  }

  return routes;
}

/**
 * Génère la documentation complète des API
 */
function generateApiDocumentation() {
  const routesDir = path.join(__dirname, '../routes');
  const apiDoc = {
    generatedAt: new Date().toISOString(),
    baseUrl: 'http://localhost:3000',
    version: '1.0.0',
    categories: {},
    totalRoutes: 0
  };

  // Parcourir toutes les routes principales
  Object.entries(MAIN_ROUTES).forEach(([basePath, category]) => {
    const categoryInfo = API_CATEGORIES[category] || { 
      name: category, 
      description: `Routes ${category}` 
    };
    
    // Trouver le fichier de route correspondant
    const routeFiles = {
      auth: 'auth.js',
      users: 'users.js',
      events: 'events.js',
      assignments: 'assignments.js',
      attendance: 'attendance.js',
      notifications: 'notifications.js',
      reports: 'reports.js',
      incidents: 'incidents.js',
      badges: 'badges.js',
      documents: 'documents.js',
      tracking: 'tracking.js',
      messages: 'messages.js',
      quickAdd: 'quickAdd.js',
      sos: 'sos.js',
      permissions: 'permissions.js',
      zones: 'zones.js',
      supervisor: 'supervisor.js',
      maintenance: 'maintenance.js',
      creationHistory: 'creationHistory.js',
      adminNotifications: 'adminNotifications.js',
      audit: 'audit.js',
      analytics: 'analyticsRoutes.js',
      faceRecognition: 'faceRecognitionRoutes.js',
      databaseBackup: 'databaseBackup.js',
      map: 'mapRoutes.js',
      whatsapp: 'whatsappRoutes.js',
      diagnostic: 'diagnostic.js',
      attendanceDuplicate: 'attendanceDuplicateRoutes.js'
    };

    const routeFile = routeFiles[category];
    if (routeFile) {
      const filePath = path.join(routesDir, routeFile);
      
      if (fs.existsSync(filePath)) {
        const routes = extractRoutesFromFile(filePath, basePath);
        
        apiDoc.categories[category] = {
          ...categoryInfo,
          basePath,
          routes,
          count: routes.length
        };
        
        apiDoc.totalRoutes += routes.length;
      }
    }
  });

  return apiDoc;
}

// Exécution
if (require.main === module) {
  const doc = generateApiDocumentation();
  
  // Sauvegarder dans un fichier JSON
  const outputPath = path.join(__dirname, '../../api-documentation.json');
  fs.writeFileSync(outputPath, JSON.stringify(doc, null, 2));
  
  console.log('✅ Documentation API générée avec succès!');
  console.log(`📁 Fichier: ${outputPath}`);
  console.log(`📊 Total de routes: ${doc.totalRoutes}`);
  console.log(`📦 Catégories: ${Object.keys(doc.categories).length}`);
  
  // Afficher un résumé
  console.log('\n📋 Résumé par catégorie:');
  Object.entries(doc.categories).forEach(([key, cat]) => {
    console.log(`  - ${cat.name}: ${cat.count} routes`);
  });
}

module.exports = { generateApiDocumentation, API_CATEGORIES };
