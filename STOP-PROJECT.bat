@echo off
chcp 65001 >nul
title Security Guard Management - Arrêt du Projet
color 0C

echo.
echo ================================================================
echo    🛑 SECURITY GUARD MANAGEMENT SYSTEM
echo    Arrêt du projet...
echo ================================================================
echo.

echo 🔍 Recherche des processus Node.js...
echo.

REM Arrêter tous les processus Node.js (Backend et Frontend)
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ⚠️  Processus Node.js détectés. Arrêt en cours...
    taskkill /F /IM node.exe /T >nul 2>&1
    echo ✅ Tous les processus Node.js ont été arrêtés.
) else (
    echo ℹ️  Aucun processus Node.js en cours d'exécution.
)

echo.
echo ================================================================
echo    ✅ PROJET ARRÊTÉ!
echo ================================================================
echo.
echo 💡 Pour redémarrer le projet:
echo    - Double-cliquez sur START-PROJECT.bat
echo    - Ou utilisez le raccourci sur le bureau
echo.
pause
