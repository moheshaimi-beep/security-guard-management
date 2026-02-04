/**
 * 🎮 INTÉGRATION SERVEUR WEBSOCKET DANS L'APPLICATION PRINCIPALE
 * Démarrage automatique du WebSocket avec le serveur principal
 */

const express = require('express');
const http = require('http');
const MapWebSocketServer = require('./src/websocket/MapWebSocketServer');

// Modifier le fichier server.js principal pour inclure WebSocket
const setupWebSocketServer = (app) => {
  // Créer le serveur HTTP
  const server = http.createServer(app);
  
  // Initialiser le serveur WebSocket pour la carte
  const mapWS = new MapWebSocketServer(server);
  
  // Stocker la référence pour un arrêt propre
  app.set('mapWebSocket', mapWS);
  
  console.log('🚀 Serveur WebSocket carte initialisé');
  
  return server;
};

// Hook pour arrêt propre
const gracefulShutdown = (app) => {
  const mapWS = app.get('mapWebSocket');
  if (mapWS) {
    console.log('🔄 Arrêt du serveur WebSocket carte...');
    mapWS.shutdown();
  }
};

module.exports = {
  setupWebSocketServer,
  gracefulShutdown
};