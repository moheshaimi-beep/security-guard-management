@echo off
title Deploiement Automatique Railway Database

REM Banniere
echo.
echo ================================================================
echo    DEPLOIEMENT AUTOMATIQUE RAILWAY DATABASE
echo    Import du schema et des migrations vers Railway.dev
echo ================================================================
echo.

REM Executer le script PowerShell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-database-to-railway.ps1"

echo.
echo Appuyez sur une touche pour fermer...
pause > nul
