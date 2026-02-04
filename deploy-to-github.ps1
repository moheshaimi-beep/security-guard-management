# ============================================================
# SCRIPT DE DEPLOIEMENT GITHUB
# Prepare et pousse le code sur GitHub
# ============================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Changer vers le repertoire du projet
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "   DEPLOIEMENT GITHUB - ETAPE 1/3" -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "Repertoire de travail: $scriptPath`n" -ForegroundColor Cyan

# Verifier que Git est installe
Write-Host "Verification de Git..." -ForegroundColor Yellow
$git = Get-Command git -ErrorAction SilentlyContinue

if (-not $git) {
    Write-Host "X Git n'est pas installe!" -ForegroundColor Red
    Write-Host "`nTelecharger Git depuis: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "`nAppuyez sur une touche pour quitter..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "OK Git est installe!`n" -ForegroundColor Green

# Demander le nom du depot
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "CONFIGURATION DU DEPOT GITHUB" -ForegroundColor Yellow
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "Allez sur GitHub.com et creez un nouveau depot:" -ForegroundColor Yellow
Write-Host "   1. Connectez-vous a https://github.com" -ForegroundColor Cyan
Write-Host "   2. Cliquez sur '+' puis 'New repository'" -ForegroundColor Cyan
Write-Host "   3. Nom du depot: security-guard-management" -ForegroundColor Cyan
Write-Host "   4. Visibilite: Private (recommande)" -ForegroundColor Cyan
Write-Host "   5. NE cochez PAS 'Initialize with README'" -ForegroundColor Red
Write-Host "   6. Cliquez sur 'Create repository'`n" -ForegroundColor Cyan

$repoCreated = Read-Host "Avez-vous cree le depot sur GitHub? (O/N)"

if ($repoCreated -ne "O" -and $repoCreated -ne "o") {
    Write-Host "`nCreez d'abord le depot sur GitHub puis relancez ce script." -ForegroundColor Yellow
    Write-Host "`nAppuyez sur une touche pour quitter..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 0
}

Write-Host "`nEntrez votre nom d'utilisateur GitHub:" -ForegroundColor Yellow
$username = Read-Host "Username"

if ([string]::IsNullOrWhiteSpace($username)) {
    Write-Host "X Nom d'utilisateur requis!" -ForegroundColor Red
    Write-Host "`nAppuyez sur une touche pour quitter..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

$repoName = "security-guard-management"
$repoURL = "https://github.com/$username/$repoName.git"

Write-Host "`nURL du depot: $repoURL`n" -ForegroundColor Cyan

# Initialiser Git si necessaire
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "INITIALISATION GIT" -ForegroundColor Yellow
Write-Host "============================================================`n" -ForegroundColor Cyan

if (-not (Test-Path ".git")) {
    Write-Host "Initialisation du depot Git..." -ForegroundColor Yellow
    git init
    Write-Host "OK Depot initialise!`n" -ForegroundColor Green
} else {
    Write-Host "OK Depot Git deja initialise!`n" -ForegroundColor Green
}

# Configuration Git
Write-Host "Configuration Git..." -ForegroundColor Yellow
git config user.name "$username" 2>$null
git config user.email "$username@users.noreply.github.com" 2>$null
Write-Host "OK Configuration terminee!`n" -ForegroundColor Green

# Ajouter tous les fichiers
Write-Host "Ajout des fichiers..." -ForegroundColor Yellow
git add .

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK Fichiers ajoutes!`n" -ForegroundColor Green
} else {
    Write-Host "X Erreur lors de l'ajout des fichiers" -ForegroundColor Red
    Write-Host "`nAppuyez sur une touche pour quitter..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Commit initial
Write-Host "Creation du commit initial..." -ForegroundColor Yellow
git commit -m "Initial commit - Security Guard Management System"

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK Commit cree!`n" -ForegroundColor Green
} else {
    Write-Host "! Commit ignore (peut etre deja fait)`n" -ForegroundColor Yellow
}

# Renommer la branche en main
Write-Host "Configuration de la branche principale..." -ForegroundColor Yellow
git branch -M main 2>$null
Write-Host "OK Branche 'main' configuree!`n" -ForegroundColor Green

# Ajouter le remote
Write-Host "Ajout du depot distant..." -ForegroundColor Yellow
git remote remove origin 2>$null
git remote add origin $repoURL

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK Depot distant ajoute!`n" -ForegroundColor Green
} else {
    Write-Host "X Erreur lors de l'ajout du depot distant" -ForegroundColor Red
    Write-Host "`nAppuyez sur une touche pour quitter..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Push vers GitHub
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "PUSH VERS GITHUB" -ForegroundColor Yellow
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "Envoi du code vers GitHub..." -ForegroundColor Yellow
Write-Host "! Vous devrez peut etre vous authentifier" -ForegroundColor Yellow
Write-Host "! Utilisez un Personal Access Token comme mot de passe`n" -ForegroundColor Yellow

git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nOK Code envoye sur GitHub!`n" -ForegroundColor Green
} else {
    Write-Host "`nX Erreur lors du push" -ForegroundColor Red
    Write-Host "`nSi erreur d'authentification:" -ForegroundColor Yellow
    Write-Host "   1. Allez sur GitHub.com > Settings > Developer settings" -ForegroundColor Cyan
    Write-Host "   2. Personal access tokens > Tokens (classic)" -ForegroundColor Cyan
    Write-Host "   3. Generate new token (classic)" -ForegroundColor Cyan
    Write-Host "   4. Cochez 'repo' et 'workflow'" -ForegroundColor Cyan
    Write-Host "   5. Utilisez ce token comme mot de passe`n" -ForegroundColor Cyan
    Write-Host "`nAppuyez sur une touche pour quitter..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Resume
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   ETAPE 1/3 TERMINEE AVEC SUCCES!" -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "RESUME:" -ForegroundColor Yellow
Write-Host "   OK Depot Git initialise" -ForegroundColor Green
Write-Host "   OK Code commite" -ForegroundColor Green
Write-Host "   OK Code envoye sur GitHub" -ForegroundColor Green
Write-Host "   URL: $repoURL`n" -ForegroundColor Cyan

Write-Host "PROCHAINE ETAPE:" -ForegroundColor Yellow
Write-Host "   Deployer le backend sur Render.com" -ForegroundColor Cyan
Write-Host "   Consultez: DEPLOYMENT_GUIDE.md (Etape 2)`n" -ForegroundColor Cyan

Write-Host "ASTUCE:" -ForegroundColor Yellow
Write-Host "   Verifiez votre depot: https://github.com/$username/$repoName`n" -ForegroundColor Cyan

Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "Appuyez sur une touche pour fermer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
