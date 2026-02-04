@echo off
title Deploiement GitHub - Etape 1

REM Banniere
echo.
echo ================================================================
echo    DEPLOIEMENT GITHUB - ETAPE 1/3
echo    Creation du depot et push du code
echo ================================================================
echo.

REM Executer le script PowerShell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-to-github.ps1"

echo.
echo Appuyez sur une touche pour fermer...
pause > nul
