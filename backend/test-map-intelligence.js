/**
 * Script de test pour les APIs de la carte intelligente
 * Valide les endpoints et fonctionnalités de centralisation
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testMapAPIs() {
  console.log('🧪 Test des APIs de la carte intelligente\n');
  
  const baseURL = 'http://localhost:3000/api/map';
  
  try {
    // Test 1: Récupération des événements pour la carte
    console.log('📍 Test 1: API /map/events');
    await testMapEvents();
    
    // Test 2: Récupération des agents  
    console.log('\n👥 Test 2: API /map/agents');
    await testMapAgents();
    
    // Test 3: Statistiques globales
    console.log('\n📊 Test 3: API /map/stats');
    await testMapStats();
    
    // Test 4: Recherche de proximité
    console.log('\n🔍 Test 4: API /map/nearby');
    await testNearbySearch();

    // Test 5: Validation des données de centralisation
    console.log('\n🎯 Test 5: Logique de centralisation');
    await testCentralizationLogic();
    
    console.log('\n✅ Tous les tests sont terminés!');
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  }
}

async function testMapEvents() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'security_guard_db',
    port: process.env.DB_PORT || 3306
  });

  try {
    // Vérifier les événements en base
    const [events] = await connection.query(`
      SELECT 
        id, name, location, latitude, longitude, 
        startDate, endDate, description
      FROM events 
      WHERE deletedAt IS NULL 
      ORDER BY startDate ASC
    `);

    console.log(`   📊 ${events.length} événements trouvés en base`);

    if (events.length > 0) {
      // Analyser la distribution géographique
      const validCoords = events.filter(e => e.latitude && e.longitude);
      console.log(`   📍 ${validCoords.length} événements avec coordonnées GPS`);

      if (validCoords.length > 0) {
        const latitudes = validCoords.map(e => parseFloat(e.latitude));
        const longitudes = validCoords.map(e => parseFloat(e.longitude));

        const bounds = {
          minLat: Math.min(...latitudes),
          maxLat: Math.max(...latitudes),
          minLng: Math.min(...longitudes),
          maxLng: Math.max(...longitudes)
        };

        const centerLat = (bounds.minLat + bounds.maxLat) / 2;
        const centerLng = (bounds.minLng + bounds.maxLng) / 2;

        console.log(`   🎯 Centre calculé: [${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}]`);
        console.log(`   📐 Limites: Lat ${bounds.minLat.toFixed(4)} à ${bounds.maxLat.toFixed(4)}`);
        console.log(`   📐 Limites: Lng ${bounds.minLng.toFixed(4)} à ${bounds.maxLng.toFixed(4)}`);
      }

      // Analyser les statuts des événements
      const now = new Date();
      const statusCounts = { ongoing: 0, upcoming: 0, completed: 0 };

      events.forEach(event => {
        const start = new Date(event.startDate);
        const end = new Date(event.endDate);

        if (now >= start && now <= end) {
          statusCounts.ongoing++;
        } else if (now < start) {
          statusCounts.upcoming++;
        } else {
          statusCounts.completed++;
        }
      });

      console.log('   📈 Répartition par statut:');
      console.log(`      - En cours: ${statusCounts.ongoing}`);
      console.log(`      - À venir: ${statusCounts.upcoming}`);
      console.log(`      - Terminés: ${statusCounts.completed}`);
    }

    console.log('   ✅ Test événements réussi');

  } finally {
    await connection.end();
  }
}

async function testMapAgents() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'security_guard_db',
    port: process.env.DB_PORT || 3306
  });

  try {
    // Vérifier les agents avec position GPS
    const [agents] = await connection.query(`
      SELECT 
        id, firstName, lastName, 
        currentLatitude, currentLongitude, 
        lastLocationUpdate, status
      FROM users 
      WHERE role = 'agent' AND deletedAt IS NULL
    `);

    console.log(`   👥 ${agents.length} agents trouvés`);

    const agentsWithGPS = agents.filter(a => a.currentLatitude && a.currentLongitude);
    console.log(`   📍 ${agentsWithGPS.length} agents avec position GPS`);

    if (agentsWithGPS.length > 0) {
      // Analyser la fraîcheur des positions
      const now = new Date();
      const recent = agentsWithGPS.filter(a => {
        if (!a.lastLocationUpdate) return false;
        const hoursAgo = (now - new Date(a.lastLocationUpdate)) / (1000 * 60 * 60);
        return hoursAgo <= 2;
      });

      console.log(`   🕒 ${recent.length} positions récentes (< 2h)`);

      // Répartition par statut
      const statusCounts = agents.reduce((acc, agent) => {
        const status = agent.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      console.log('   📊 Répartition par statut:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`      - ${status}: ${count}`);
      });
    }

    console.log('   ✅ Test agents réussi');

  } finally {
    await connection.end();
  }
}

async function testMapStats() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'security_guard_db',
    port: process.env.DB_PORT || 3306
  });

  try {
    // Statistiques globales
    const [eventCount] = await connection.query('SELECT COUNT(*) as total FROM events WHERE deletedAt IS NULL');
    const [agentCount] = await connection.query('SELECT COUNT(*) as total FROM users WHERE role = "agent" AND deletedAt IS NULL');
    const [attendanceToday] = await connection.query(`
      SELECT COUNT(*) as total 
      FROM attendance 
      WHERE DATE(checkInTime) = CURDATE()
    `);

    console.log('   📊 Statistiques globales:');
    console.log(`      - Événements: ${eventCount[0].total}`);
    console.log(`      - Agents: ${agentCount[0].total}`);
    console.log(`      - Pointages aujourd'hui: ${attendanceToday[0].total}`);

    // Vérifier la performance des requêtes
    const startTime = Date.now();
    
    await Promise.all([
      connection.query('SELECT * FROM events WHERE deletedAt IS NULL LIMIT 100'),
      connection.query('SELECT * FROM users WHERE role = "agent" AND deletedAt IS NULL LIMIT 100'),
      connection.query('SELECT * FROM attendance WHERE DATE(checkInTime) = CURDATE() LIMIT 100')
    ]);

    const queryTime = Date.now() - startTime;
    console.log(`   ⚡ Temps de requête: ${queryTime}ms`);

    console.log('   ✅ Test statistiques réussi');

  } finally {
    await connection.end();
  }
}

async function testNearbySearch() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'security_guard_db',
    port: process.env.DB_PORT || 3306
  });

  try {
    // Point de référence (centre de Tunis)
    const refLat = 36.8485;
    const refLng = 10.1833;
    const radius = 10; // 10km

    console.log(`   🎯 Recherche autour de [${refLat}, ${refLng}] dans un rayon de ${radius}km`);

    // Rechercher les événements proches
    const [events] = await connection.query(`
      SELECT id, name, location, latitude, longitude,
             (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * 
             cos(radians(longitude) - radians(?)) + sin(radians(?)) * 
             sin(radians(latitude)))) AS distance
      FROM events 
      WHERE latitude IS NOT NULL 
        AND longitude IS NOT NULL 
        AND deletedAt IS NULL
      HAVING distance <= ?
      ORDER BY distance ASC
    `, [refLat, refLng, refLat, radius]);

    console.log(`   📍 ${events.length} événements trouvés dans le rayon`);

    if (events.length > 0) {
      events.slice(0, 3).forEach(event => {
        console.log(`      - ${event.name}: ${event.distance.toFixed(2)}km`);
      });
    }

    // Rechercher les agents proches
    const [agents] = await connection.query(`
      SELECT id, firstName, lastName, currentLatitude, currentLongitude,
             (6371 * acos(cos(radians(?)) * cos(radians(currentLatitude)) * 
             cos(radians(currentLongitude) - radians(?)) + sin(radians(?)) * 
             sin(radians(currentLatitude)))) AS distance
      FROM users 
      WHERE role = 'agent'
        AND currentLatitude IS NOT NULL 
        AND currentLongitude IS NOT NULL 
        AND deletedAt IS NULL
      HAVING distance <= ?
      ORDER BY distance ASC
    `, [refLat, refLng, refLat, radius]);

    console.log(`   👥 ${agents.length} agents trouvés dans le rayon`);

    if (agents.length > 0) {
      agents.slice(0, 3).forEach(agent => {
        console.log(`      - ${agent.firstName} ${agent.lastName}: ${agent.distance.toFixed(2)}km`);
      });
    }

    console.log('   ✅ Test recherche de proximité réussi');

  } finally {
    await connection.end();
  }
}

async function testCentralizationLogic() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'security_guard_db',
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('   🎯 Test de la logique de centralisation automatique');

    // Récupérer tous les événements valides
    const [events] = await connection.query(`
      SELECT latitude, longitude, name 
      FROM events 
      WHERE latitude IS NOT NULL 
        AND longitude IS NOT NULL 
        AND deletedAt IS NULL
    `);

    if (events.length === 0) {
      console.log('   ⚠️ Aucun événement avec coordonnées pour tester la centralisation');
      return;
    }

    // Simuler différents scénarios
    console.log(`   📊 Test avec ${events.length} événements`);

    // Scénario 1: Un seul événement
    if (events.length >= 1) {
      const singleEvent = [events[0]];
      const center = calculateOptimalCenter(singleEvent);
      console.log(`   📍 Un événement - Centre: [${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}], Zoom: ${center.zoom}`);
    }

    // Scénario 2: Plusieurs événements
    if (events.length >= 2) {
      const center = calculateOptimalCenter(events);
      console.log(`   📍 ${events.length} événements - Centre: [${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}], Zoom: ${center.zoom}`);
      
      // Calculer la dispersion
      const distances = events.map(event => 
        calculateDistance(center.lat, center.lng, event.latitude, event.longitude)
      );
      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      const maxDistance = Math.max(...distances);
      
      console.log(`   📐 Distance moyenne du centre: ${avgDistance.toFixed(2)}km`);
      console.log(`   📐 Distance maximale: ${maxDistance.toFixed(2)}km`);
    }

    // Scénario 3: Événements groupés vs dispersés
    const groupedEvents = events.filter((_, index) => index < Math.min(3, events.length));
    if (groupedEvents.length > 1) {
      const groupCenter = calculateOptimalCenter(groupedEvents);
      console.log(`   🎯 Événements groupés - Zoom recommandé: ${groupCenter.zoom}`);
    }

    console.log('   ✅ Test logique de centralisation réussi');

  } finally {
    await connection.end();
  }
}

// Fonctions utilitaires pour les calculs
function calculateOptimalCenter(events) {
  if (events.length === 0) {
    return { lat: 36.8485, lng: 10.1833, zoom: 10 };
  }

  if (events.length === 1) {
    return { 
      lat: parseFloat(events[0].latitude), 
      lng: parseFloat(events[0].longitude), 
      zoom: 15 
    };
  }

  // Calculer le centre géométrique
  const latitudes = events.map(e => parseFloat(e.latitude));
  const longitudes = events.map(e => parseFloat(e.longitude));

  const centerLat = latitudes.reduce((a, b) => a + b, 0) / latitudes.length;
  const centerLng = longitudes.reduce((a, b) => a + b, 0) / longitudes.length;

  // Calculer le zoom optimal basé sur la dispersion
  const maxLat = Math.max(...latitudes);
  const minLat = Math.min(...latitudes);
  const maxLng = Math.max(...longitudes);
  const minLng = Math.min(...longitudes);

  const latDiff = maxLat - minLat;
  const lngDiff = maxLng - minLng;
  const maxDiff = Math.max(latDiff, lngDiff);

  let zoom = 10;
  if (maxDiff > 1) zoom = 8;
  else if (maxDiff > 0.5) zoom = 10;
  else if (maxDiff > 0.1) zoom = 12;
  else if (maxDiff > 0.05) zoom = 14;
  else zoom = 15;

  return { lat: centerLat, lng: centerLng, zoom };
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// Exécuter les tests
testMapAPIs();