@echo off
color 0D
cls
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║           REDEMARRAGE COMPLET DES SERVEURS                ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo [1/3] 🛑 Arret de tous les serveurs...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo ✅ Serveurs arretes
echo.

echo [2/3] 🚀 Demarrage du backend...
start "Backend Server - Port 5000" cmd /k "cd /d C:\laragon\www\security-guard-management\backend && color 0A && node src/server.js"
timeout /t 5 /nobreak >nul
echo ✅ Backend demarre
echo.

echo [3/3] 🌐 Demarrage du frontend...
start "Frontend React - Port 3000" cmd /k "cd /d C:\laragon\www\security-guard-management\web-dashboard && color 0B && npm start"
echo ✅ Frontend demarre
echo.

echo ═══════════════════════════════════════════════════════════
echo ✅ REDEMARRAGE TERMINE !
echo.
echo 📝 Verifiez les 2 fenetres:
echo    - Backend (vert)  : http://localhost:5000
echo    - Frontend (bleu) : http://localhost:3000
echo ═══════════════════════════════════════════════════════════
echo.
timeout /t 10 /nobreak
exit
