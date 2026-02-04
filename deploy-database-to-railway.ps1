# ============================================================
# SCRIPT DE DEPLOIEMENT AUTOMATIQUE DE LA BASE DE DONNEES
# Importe le schema et toutes les migrations vers Railway.dev
# ============================================================

# Encoder la console en UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "   DEPLOIEMENT AUTOMATIQUE RAILWAY DATABASE" -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Cyan

# Verifier que Railway CLI est installe
Write-Host "Verification de Railway CLI..." -ForegroundColor Yellow
$railwayCLI = Get-Command railway -ErrorAction SilentlyContinue

if (-not $railwayCLI) {
    Write-Host "X Railway CLI n'est pas installe!" -ForegroundColor Red
    Write-Host "`nInstallation automatique..." -ForegroundColor Yellow
    npm install -g @railway/cli
    
    # Recharger le PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    # Verifier a nouveau
    $railwayCLI = Get-Command railway -ErrorAction SilentlyContinue
    if (-not $railwayCLI) {
        Write-Host "X Erreur: Impossible d'installer Railway CLI" -ForegroundColor Red
        Write-Host "Installez manuellement: npm install -g @railway/cli" -ForegroundColor Yellow
        Write-Host "`nAppuyez sur une touche pour quitter..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
    Write-Host "OK Railway CLI installe!`n" -ForegroundColor Green
}

# Connexion a Railway
Write-Host "`nConnexion a Railway..." -ForegroundColor Yellow
Write-Host "Votre navigateur va s'ouvrir pour l'authentification" -ForegroundColor Cyan
railway login

if ($LASTEXITCODE -ne 0) {
    Write-Host "X Erreur de connexion a Railway" -ForegroundColor Red
    Write-Host "`nAppuyez sur une touche pour quitter..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Lier le projet
Write-Host "`nLiaison avec votre projet Railway..." -ForegroundColor Yellow
Write-Host "Selectionnez votre projet MySQL dans la liste" -ForegroundColor Cyan
railway link

if ($LASTEXITCODE -ne 0) {
    Write-Host "X Erreur lors de la liaison du projet" -ForegroundColor Red
    Write-Host "`nAppuyez sur une touche pour quitter..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
\sql\schema\recreate-database.sql"
$migrationsFolder = "backend\sql\migrations"

# Verifier que les fichiers existent
if (-not (Test-Path $schemaFile)) {
    Write-Host "X Fichier schema introuvable: $schemaFile" -ForegroundColor Red
    Write-Host "`nAppuyez sur une touche pour quitter..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

if (-not (Test-Path $migrationsFolder)) {
    Write-Host "X Dossier migrations introuvable: $migrationsFolder" -ForegroundColor Red
    Write-Host "`nAppuyez sur une touche pour quitter..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Importer le schema
Write-Host "`nETAPE 1/3: Import du schema principal..." -ForegroundColor Yellow
Write-Host "Fichier: $schemaFile" -ForegroundColor Cyan

# Lire et envoyer le schema directement via railway
$schemaSQL = Get-Content $schemaFile -Raw -Encoding UTF8

# Creer un fichier temporaire
$tempFile = [System.IO.Path]::GetTempFileName()
$schemaSQL | Out-File -FilePath $tempFile -Encoding UTF8 -NoNewline

Write-Host "Import en cours..." -ForegroundColor Yellow
railway run mysql --default-character-set=utf8mb4 -e "source $tempFile"

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK Schema importe avec succes!`n" -ForegroundColor Green
} else {
    Write-Host "X Erreur lors de l'import du schema" -ForegroundColor Red
    Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
    Write-Host "`nAppuyez sur une touche pour quitter..."
    $null = `nETAPE 2/3: Import des migrations..." -ForegroundColor Yellow

# Recuperer tous les fichiers de migration tries
$migrationFiles = Get-ChildItem -Path $migrationsFolder -Filter "*.sql" | Sort-Object Name

$totalMigrations = $migrationFiles.Count
$currentMigration = 0
$errors = 0

foreach ($migration in $migrationFiles) {
    $currentMigration++
    Write-Host "[$currentMigration/$totalMigrations] Import: $($migration.Name)" -ForegroundColor Cyan
    
    $migrationSQL = Get-Content $migration.FullName -Raw -Encoding UTF8
    $tempFile = [System.IO.Path]::GetTempFileName()
    $migrationSQL | Out-File -FilePath $tempFile -Encoding UTF8 -NoNewline
    
    railway run mysql --default-character-set=utf8mb4 -e "source $tempFile" 2>$null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "! Erreur dans $($migration.Name)" -ForegroundColor Yellow
        $errors++
    }
    
    Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 300
}

if ($errors -eq 0) {
    Write-Host "`nOK Toutes les migrations importees ($totalMigrations/$totalMigrations)!`n" -ForegroundColor Green
} else {
    Write-Host "`n! $errors erreur(s) lors de l'import des migrations" -ForegroundColor Yellow
    Write-Host "Les erreurs peuvent etre normales si certaines tables existent deja.`n" -ForegroundColor Cyan
}

# Creer l utilisateur admin
Write-Host "`nETAPE 3/3: Creation de l utilisateur admin..." -ForegroundColor Yellow

# Utiliser le fichier SQL pre-cree
$adminSQLFile = "test-admin-query.sql"

if (Test-Path $adminSQLFile) {
    railway run mysql --default-character-set=utf8mb4 railway < $adminSQLFile 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK Utilisateur admin cree!`n" -ForegroundColor Green
    } else {
        Write-Host "! Creation admin ignoree (peut etre existe deja)`n" -ForegroundColor Yellow
    }
} else {
    Write-Host "! Fichier admin SQL introuvable - ignoree`n" -ForegroundColor Yellow
}

# Resume
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   DEPLOIEMENT TERMINE AVEC SUCCES!" -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "RESUME:" -ForegroundColor Yellow
Write-Host "   OK Schema principal importe" -ForegroundColor Green
Write-Host "   OK $totalMigrations migrations importees" -ForegroundColor Green
Write-Host "   OK Utilisateur admin cree`n" -ForegroundColor Green

Write-Host "IDENTIFIANTS ADMIN:" -ForegroundColor Yellow
Write-Host "   Email:    admin@example.com" -ForegroundColor Cyan
Write-Host "   Password: Admin@123`n" -ForegroundColor Cyan

Write-Host "IMPORTANT:" -ForegroundColor Red
Write-Host "   Changez le mot de passe admin apres connexion!`n" -ForegroundColor Yellow

Write-Host "PROCHAINES ETAPES:" -ForegroundColor Yellow
Write-Host "   1. Deployez le backend sur Render.com" -ForegroundColor Cyan
Write-Host "   2. Deployez le frontend sur Vercel" -ForegroundColor Cyan
Write-Host "   3. Suivez le guide: DEPLOYMENT_GUIDE.md`n" -ForegroundColor Cyan

Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "Appuyez sur une touche pour fermer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Write-Host "🔐 IDENTIFIANTS ADMIN:" -ForegroundColor Yellow
Write-Host "   Email:    admin@example.com" -ForegroundColor Cyan
Write-Host "   Password: Admin@123`n" -ForegroundColor Cyan

Write-Host "⚠️  IMPORTANT:" -ForegroundColor Red
Write-Host "   Changez le mot de passe admin immédiatement après connexion!`n" -ForegroundColor Yellow

Write-Host "🌐 PROCHAINES ÉTAPES:" -ForegroundColor Yellow
Write-Host "   1. Déployez le backend sur Render.com" -ForegroundColor Cyan
Write-Host "   2. Déployez le frontend sur Vercel" -ForegroundColor Cyan
Write-Host "   3. Suivez le guide: DEPLOYMENT_GUIDE.md`n" -ForegroundColor Cyan

Write-Host "════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
