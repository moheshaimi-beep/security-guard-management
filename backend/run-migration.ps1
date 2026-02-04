# Script de migration pour ajouter les colonnes de résolution
Write-Host "Exécution de la migration: add_resolution_to_fraud_attempts" -ForegroundColor Cyan

$mysqlPath = "C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysql.exe"
$scriptPath = "c:\laragon\www\security-guard-management\backend\migrations\add_resolution_to_fraud_attempts.sql"

# Vérifier si MySQL existe
if (-not (Test-Path $mysqlPath)) {
    # Chercher MySQL dans d'autres chemins possibles
    $possiblePaths = @(
        "C:\laragon\bin\mysql\mysql-5.7.24-winx64\bin\mysql.exe",
        "C:\laragon\bin\mysql\mysql-8.0.31-winx64\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $mysqlPath = $path
            break
        }
    }
}

if (-not (Test-Path $mysqlPath)) {
    Write-Host "MySQL non trouvé. Utilisation de la commande globale 'mysql'" -ForegroundColor Yellow
    $command = "mysql -u root security_guard_management"
} else {
    Write-Host "MySQL trouvé: $mysqlPath" -ForegroundColor Green
    $command = "& '$mysqlPath' -u root security_guard_management"
}

# Exécuter la migration
try {
    Get-Content $scriptPath | Invoke-Expression $command
    Write-Host "✓ Migration exécutée avec succès!" -ForegroundColor Green
} catch {
    Write-Host "✗ Erreur lors de l'exécution de la migration: $_" -ForegroundColor Red
    Write-Host "Essayez de l'exécuter manuellement via HeidiSQL ou phpMyAdmin" -ForegroundColor Yellow
    exit 1
}
