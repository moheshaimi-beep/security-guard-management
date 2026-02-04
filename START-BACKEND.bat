@echo off
color 0A
cls
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║           DEMARRAGE SERVEUR BACKEND                       ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 🚀 Demarrage du serveur backend sur le port 5000...
echo.

cd /d "C:\laragon\www\security-guard-management\backend"

echo 📂 Repertoire: %CD%
echo.

node src/server.js

pause
