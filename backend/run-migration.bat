@echo off
echo Applying migration: add_resolution_to_fraud_attempts.sql
echo.

REM Try to find MySQL
set MYSQL_PATH=C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysql.exe
if not exist "%MYSQL_PATH%" set MYSQL_PATH=C:\laragon\bin\mysql\mysql-5.7.24-winx64\bin\mysql.exe
if not exist "%MYSQL_PATH%" set MYSQL_PATH=mysql.exe

echo Using MySQL: %MYSQL_PATH%
echo.

"%MYSQL_PATH%" -u root security_guard_management < migrations\add_resolution_to_fraud_attempts.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Migration applied successfully!
    echo.
) else (
    echo.
    echo Error applying migration. Please run manually via HeidiSQL or phpMyAdmin.
    echo.
)

pause
