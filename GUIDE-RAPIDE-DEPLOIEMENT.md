# 🚀 GUIDE RAPIDE DE DÉPLOIEMENT
## Security Guard Management System

**Déploiement en 3 étapes simples!**

---

## ✅ ÉTAPE 0: BASE DE DONNÉES (TERMINÉE!)

- ✅ Railway.dev configuré
- ✅ MySQL déployé
- ✅ Schéma importé
- ✅ 16 migrations importées
- ✅ Admin créé (admin@example.com / Admin@123)

**Variables Railway à noter:**
- `MYSQLHOST` = Depuis Railway Console
- `MYSQL_ROOT_PASSWORD` = Depuis Railway Console
- `MYSQL_DATABASE` = railway

---

## 📋 ÉTAPE 1: GITHUB

### Option A: Script Automatique (Recommandé)

**Double-cliquez sur: `DEPLOY-TO-GITHUB.bat`**

Le script va:
1. Vérifier Git
2. Initialiser le dépôt
3. Ajouter tous les fichiers
4. Commit initial
5. Push vers GitHub

### Option B: Manuel

```bash
# 1. Créer un dépôt sur GitHub.com
#    Nom: security-guard-management
#    Visibilité: Private

# 2. Dans votre terminal:
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/VOTRE-USERNAME/security-guard-management.git
git push -u origin main
```

---

## 🔧 ÉTAPE 2: BACKEND (Render.com)

### 2.1 Créer un compte
1. Allez sur https://render.com
2. "Get Started for Free"
3. Connectez-vous avec GitHub

### 2.2 Créer le service
1. "New +" → "Web Service"
2. Connectez votre dépôt `security-guard-management`
3. Configuration:
   ```
   Name: security-guard-backend
   Region: Frankfurt (EU Central)
   Branch: main
   Root Directory: backend
   Build Command: npm install
   Start Command: node src/server.js
   Instance Type: Free
   ```

### 2.3 Variables d'environnement

**COPIEZ CES VARIABLES DEPUIS RAILWAY:**

```bash
NODE_ENV=production
PORT=5000

# Database (depuis Railway Console)
DB_HOST=<MYSQLHOST depuis Railway>
DB_USER=root
DB_PASSWORD=<MYSQL_ROOT_PASSWORD depuis Railway>
DB_NAME=railway
DB_PORT=3306
DB_SSL=false

# Sécurité (générez des clés fortes)
JWT_SECRET=<générez une clé aléatoire forte>
SESSION_SECRET=<générez une autre clé forte>

# Frontend (vous l'aurez après Vercel)
FRONTEND_URL=https://votre-app.vercel.app
SOCKET_CORS_ORIGIN=https://votre-app.vercel.app
```

**Générer des clés secrètes:**
```bash
# Dans PowerShell:
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | % {[char]$_})
```

### 2.4 Déployer
- Cliquez "Create Web Service"
- Attendez 2-3 minutes
- **Notez l'URL:** `https://security-guard-backend.onrender.com`

---

## 🌐 ÉTAPE 3: FRONTEND (Vercel)

### 3.1 Créer un compte
1. Allez sur https://vercel.com
2. "Sign Up"
3. Connectez-vous avec GitHub

### 3.2 Créer le projet
1. "Add New..." → "Project"
2. Importez `security-guard-management`
3. Configuration:
   ```
   Framework: Create React App
   Root Directory: web-dashboard
   Build Command: npm run build
   Output Directory: build
   ```

### 3.3 Variables d'environnement

```bash
REACT_APP_API_URL=https://security-guard-backend.onrender.com/api
REACT_APP_SOCKET_URL=https://security-guard-backend.onrender.com
REACT_APP_APP_NAME=Security Guard Management
REACT_APP_ENV=production
GENERATE_SOURCEMAP=false
REACT_APP_ENABLE_FACIAL_RECOGNITION=true
REACT_APP_ENABLE_GEOLOCATION=true
REACT_APP_ENABLE_NOTIFICATIONS=true
```

### 3.4 Déployer
- Cliquez "Deploy"
- Attendez 2-3 minutes
- **Votre app est en ligne!** 🎉

---

## 🔄 ÉTAPE 4: CONFIGURATION FINALE

### 4.1 Mettre à jour le Backend
1. Retournez sur Render.com
2. Votre service backend → Environment
3. Mettez à jour:
   ```
   FRONTEND_URL=https://votre-app.vercel.app
   SOCKET_CORS_ORIGIN=https://votre-app.vercel.app
   ```
4. Le service redémarre automatiquement

### 4.2 Tester l'application
1. Ouvrez votre app Vercel
2. Connectez-vous:
   - Email: `admin@example.com`
   - Mot de passe: `Admin@123`
3. Testez toutes les fonctionnalités

---

## 📊 RÉCAPITULATIF

**Vos URLs:**
- 🗄️ Database: Railway Console
- 🔧 Backend: `https://security-guard-backend.onrender.com`
- 🌐 Frontend: `https://votre-app.vercel.app`

**Coût total: 0€/mois - 100% GRATUIT!**

---

## 🆘 AIDE RAPIDE

### Backend ne démarre pas
- Vérifiez les logs: Render.com → Logs
- Vérifiez les variables d'environnement
- Testez la connexion Railway

### Frontend affiche des erreurs
- F12 → Console pour voir les erreurs
- Vérifiez `REACT_APP_API_URL`
- Vérifiez que le backend est bien démarré

### Socket.IO ne fonctionne pas
- Vérifiez `SOCKET_CORS_ORIGIN` dans Render
- Testez: `https://votre-backend.onrender.com/socket.io/socket.io.js`

---

## 🎉 FÉLICITATIONS!

Votre application est maintenant **100% en ligne** et accessible partout dans le monde!

**Guide complet:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

**© 2026 SGM – Security Guard Management System**
