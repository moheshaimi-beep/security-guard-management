@echo off
chcp 65001 >nul
title Security Guard Management - Démarrage du Projet
color 0A

echo.
echo ================================================================
echo    🚀 SECURITY GUARD MANAGEMENT SYSTEM
echo    Démarrage du projet...
echo ================================================================
echo.

REM Vérifier si Node.js est installé
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERREUR: Node.js n'est pas installé!
    echo Veuillez installer Node.js depuis https://nodejs.org/
    pause
    exit /b 1
)

REM Afficher la version de Node.js
echo ✅ Node.js détecté:
node --version
npm --version
echo.

REM Vérifier si nous sommes dans le bon répertoire
if not exist "backend" (
    echo ❌ ERREUR: Répertoire 'backend' introuvable!
    echo Veuillez exécuter ce script depuis la racine du projet.
    pause
    exit /b 1
)

if not exist "web-dashboard" (
    echo ❌ ERREUR: Répertoire 'web-dashboard' introuvable!
    echo Veuillez exécuter ce script depuis la racine du projet.
    pause
    exit /b 1
)

echo 📦 Vérification des dépendances...
echo.

REM Vérifier si node_modules existe dans backend
if not exist "backend\node_modules" (
    echo ⚠️  Installation des dépendances backend...
    cd backend
    call npm install
    cd ..
    echo ✅ Dépendances backend installées
    echo.
)

REM Vérifier si node_modules existe dans web-dashboard
if not exist "web-dashboard\node_modules" (
    echo ⚠️  Installation des dépendances frontend...
    cd web-dashboard
    call npm install
    cd ..
    echo ✅ Dépendances frontend installées
    echo.
)

echo.
echo ================================================================
echo    🎯 Démarrage des serveurs...
echo ================================================================
echo.
echo 🔧 Backend:  http://localhost:5000
echo 🌐 Frontend: http://localhost:3000
echo 🔌 Socket.IO: ws://localhost:5000
echo.
echo ⚠️  Deux fenêtres vont s'ouvrir:
echo    1. Serveur Backend (Node.js + Socket.IO)
echo    2. Application Frontend (React)
echo.
echo 💡 Pour arrêter: Fermez les fenêtres ou appuyez sur Ctrl+C
echo ================================================================
echo.

timeout /t 3 /nobreak >nul

REM Démarrer le backend dans une nouvelle fenêtre
echo 🔧 Démarrage du Backend...
start "🔧 BACKEND - Security Guard Management" cmd /k "cd /d %~dp0backend && echo ================================================================ && echo    BACKEND SERVER - Port 5000 && echo    Socket.IO activé && echo ================================================================ && echo. && npm run dev"

REM Attendre 5 secondes pour que le backend démarre
echo ⏳ Attente du démarrage du backend (5 secondes)...
timeout /t 5 /nobreak >nul

REM Démarrer le frontend dans une nouvelle fenêtre
echo 🌐 Démarrage du Frontend...
start "🌐 FRONTEND - Security Guard Management" cmd /k "cd /d %~dp0web-dashboard && echo ================================================================ && echo    FRONTEND WEB - Port 3000 && echo    React Application && echo ================================================================ && echo. && npm start"

echo.
echo ================================================================
echo    ✅ PROJET DÉMARRÉ AVEC SUCCÈS!
echo ================================================================
echo.
echo 📊 Statut:
echo    - Backend lancé sur http://localhost:5000
echo    - Frontend lancé sur http://localhost:3000
echo.
echo 🌐 Ouvrir dans le navigateur:
echo    - Application: http://localhost:3000
echo    - API Backend:  http://localhost:5000/api
echo.
echo 📝 Logs disponibles dans les fenêtres ouvertes
echo.
echo 💡 Ce terminal peut être fermé en toute sécurité.
echo    Les serveurs continueront de fonctionner dans leurs fenêtres.
echo.

timeout /t 3 /nobreak >nul

REM Ouvrir automatiquement le navigateur après 10 secondes
echo ⏳ Ouverture du navigateur dans 10 secondes...
timeout /t 10 /nobreak >nul
start http://localhost:3000

echo.
echo ✅ Tout est prêt! Bon développement! 🚀
echo.
pause
