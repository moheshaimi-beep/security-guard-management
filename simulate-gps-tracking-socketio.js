/**
 * 🎯 SIMULATION GPS TRACKING EN TEMPS RÉEL AVEC SOCKET.IO
 * 
 * Ce script simule des agents se déplaçant en temps réel
 * pour tester le système de tracking Socket.IO
 * 
 * USAGE:
 * node simulate-gps-tracking-socketio.js
 */

const io = require('socket.io-client');
const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

// Credentials pour se connecter
const ADMIN_EMAIL = 'admin@securityguard.com';
const ADMIN_PASSWORD = 'Admin@2024';

// Coordonnées de Salé (zone de l'événement)
const EVENT_CENTER = {
  latitude: 34.0531,
  longitude: -6.7985
};

// Rayon de déplacement (en degrés, ~500m)
const MOVEMENT_RADIUS = 0.005;

// Agents à simuler (IDs réels de votre base de données)
const AGENTS_TO_SIMULATE = [
  {
    id: 'b5f51f16-bdb5-4e17-8cd0-9fb15b1de3c0', // youssef ibenboubkeur
    name: 'Youssef Ibenboubkeur',
    speed: 0.0001, // Vitesse de déplacement
    batteryDrain: 0.5 // Perte de batterie par update (%)
  },
  {
    id: '0b1e66b4-fd88-4638-8f52-2adb4a1eae1d', // mohammed eshaimi
    name: 'Mohammed Eshaimi',
    speed: 0.00015,
    batteryDrain: 0.3
  }
];

let authToken = null;
let eventId = '9527ecd8-4b89-4ae7-ab59-70ac1f805e3e'; // maroc vs algerie

// État des agents simulés
const agentStates = AGENTS_TO_SIMULATE.map(agent => ({
  ...agent,
  latitude: EVENT_CENTER.latitude + (Math.random() - 0.5) * MOVEMENT_RADIUS,
  longitude: EVENT_CENTER.longitude + (Math.random() - 0.5) * MOVEMENT_RADIUS,
  battery: 100,
  accuracy: 10 + Math.random() * 10,
  isMoving: true,
  direction: Math.random() * 2 * Math.PI, // Direction en radians
  socket: null,
  connected: false
}));

/**
 * Authentification admin
 */
async function authenticate() {
  try {
    console.log('🔐 Authentification admin...');
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    authToken = response.data.data.token;
    console.log('✅ Authentifié avec succès');
    return authToken;
  } catch (error) {
    console.error('❌ Erreur authentification:', error.response?.data || error.message);
    process.exit(1);
  }
}

/**
 * Connecter un agent via Socket.IO
 */
function connectAgent(agent) {
  return new Promise((resolve, reject) => {
    console.log(`🔌 Connexion Socket.IO pour ${agent.name}...`);
    
    // Créer une connexion Socket.IO pour cet agent
    const socket = io(SOCKET_URL, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      auth: {
        token: authToken
      }
    });
    
    agent.socket = socket;
    
    socket.on('connect', () => {
      console.log(`✅ ${agent.name} connecté (Socket ID: ${socket.id})`);
      
      // Authentifier l'agent
      socket.emit('auth', {
        userId: agent.id,
        role: 'agent',
        eventId: eventId,
        token: authToken
      });
    });
    
    socket.on('auth:success', (data) => {
      console.log(`🔐 ${agent.name} authentifié avec succès`);
      agent.connected = true;
      resolve();
    });
    
    socket.on('auth:error', (error) => {
      console.error(`❌ Erreur authentification ${agent.name}:`, error);
      reject(error);
    });
    
    socket.on('tracking:position_ack', (data) => {
      // Position confirmée par le serveur
    });
    
    socket.on('tracking:error', (error) => {
      console.error(`❌ Erreur tracking ${agent.name}:`, error);
    });
    
    socket.on('disconnect', () => {
      console.log(`❌ ${agent.name} déconnecté`);
      agent.connected = false;
    });
    
    socket.on('error', (error) => {
      console.error(`❌ Erreur Socket.IO ${agent.name}:`, error);
    });
    
    // Timeout de connexion
    setTimeout(() => {
      if (!agent.connected) {
        reject(new Error(`Timeout connexion pour ${agent.name}`));
      }
    }, 5000);
  });
}

/**
 * Générer une nouvelle position pour un agent
 */
function moveAgent(agent) {
  // Changer de direction aléatoirement (10% de chance)
  if (Math.random() < 0.1) {
    agent.direction = Math.random() * 2 * Math.PI;
  }
  
  // Déplacer l'agent dans sa direction
  agent.latitude += Math.cos(agent.direction) * agent.speed;
  agent.longitude += Math.sin(agent.direction) * agent.speed;
  
  // Garder l'agent dans la zone de l'événement
  const distanceFromCenter = Math.sqrt(
    Math.pow(agent.latitude - EVENT_CENTER.latitude, 2) +
    Math.pow(agent.longitude - EVENT_CENTER.longitude, 2)
  );
  
  if (distanceFromCenter > MOVEMENT_RADIUS) {
    // Inverser la direction pour revenir vers le centre
    agent.direction += Math.PI;
  }
  
  // Réduire la batterie
  agent.battery = Math.max(0, agent.battery - agent.batteryDrain);
  
  // Variation de précision
  agent.accuracy = 10 + Math.random() * 10;
  
  // Parfois l'agent s'arrête (20% de chance)
  if (Math.random() < 0.2) {
    agent.isMoving = !agent.isMoving;
  }
}

/**
 * Envoyer une mise à jour de position via Socket.IO
 */
function sendLocationUpdate(agent) {
  if (!agent.socket || !agent.connected) {
    console.error(`❌ ${agent.name} non connecté`);
    return;
  }
  
  const payload = {
    latitude: agent.latitude,
    longitude: agent.longitude,
    accuracy: agent.accuracy,
    speed: agent.isMoving ? agent.speed * 100000 : 0, // Convertir en m/s approximatif
    heading: agent.direction * (180 / Math.PI), // Convertir en degrés
    batteryLevel: Math.round(agent.battery),
    isMoving: agent.isMoving,
    timestamp: Date.now()
  };
  
  agent.socket.emit('tracking:position', payload);
  
  console.log(`📍 ${agent.name}: (${agent.latitude.toFixed(6)}, ${agent.longitude.toFixed(6)}) - Batterie: ${Math.round(agent.battery)}% - ${agent.isMoving ? '🏃 En mouvement' : '🛑 Arrêté'}`);
}

/**
 * Boucle principale de simulation
 */
async function startSimulation() {
  console.log('\n🎯 ════════════════════════════════════════════════════════');
  console.log('🎯 SIMULATION GPS TRACKING SOCKET.IO - DÉMARRAGE');
  console.log('🎯 ════════════════════════════════════════════════════════\n');
  
  await authenticate();
  
  console.log(`\n📊 Simulation de ${agentStates.length} agents:`);
  agentStates.forEach(agent => {
    console.log(`   - ${agent.name} (${agent.id})`);
  });
  
  // Connecter tous les agents
  console.log('\n🔌 Connexion des agents via Socket.IO...\n');
  
  for (const agent of agentStates) {
    try {
      await connectAgent(agent);
    } catch (error) {
      console.error(`❌ Impossible de connecter ${agent.name}:`, error.message);
    }
  }
  
  console.log(`\n📍 Centre événement: ${EVENT_CENTER.latitude}, ${EVENT_CENTER.longitude}`);
  console.log(`📡 Rayon de déplacement: ~${(MOVEMENT_RADIUS * 111).toFixed(0)}m`);
  console.log(`⏱️  Fréquence mise à jour: toutes les 3 secondes`);
  
  console.log('\n🚀 Simulation démarrée! Appuyez sur Ctrl+C pour arrêter.\n');
  console.log('════════════════════════════════════════════════════════\n');
  
  // Boucle de simulation - mise à jour toutes les 3 secondes
  setInterval(() => {
    agentStates.forEach(agent => {
      // Déplacer l'agent
      moveAgent(agent);
      
      // Envoyer la position
      sendLocationUpdate(agent);
    });
    
    console.log(''); // Ligne vide pour séparer chaque update
  }, 3000);
}

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
  console.log('\n\n🛑 Arrêt de la simulation...');
  
  // Déconnecter tous les agents
  agentStates.forEach(agent => {
    if (agent.socket) {
      agent.socket.disconnect();
    }
  });
  
  console.log('✅ Simulation terminée\n');
  process.exit(0);
});

// Démarrer la simulation
startSimulation().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
