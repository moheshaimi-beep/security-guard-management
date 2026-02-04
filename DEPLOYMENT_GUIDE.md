# 🚀 GUIDE DE DÉPLOIEMENT GRATUIT
# Security Guard Management System

Ce guide vous aidera à déployer votre application complète GRATUITEMENT.

## 📋 ARCHITECTURE DE DÉPLOIEMENT

```
Frontend (React)     →  Vercel        (100% Gratuit Forever)
Backend (Node.js)    →  Render.com    (100% Gratuit - 750h/mois)
Database (MySQL)     →  Railway.dev   (100% Gratuit - 5$/mois crédit)
```

**💯 TOUT EST 100% GRATUIT - AUCUNE CARTE BANCAIRE REQUISE!**

---

## 🗄️ ÉTAPE 1: DÉPLOYER LA BASE DE DONNÉES (Railway.dev)

### 1.1 Créer un compte Railway (GRATUIT - Aucune carte requise)
1. Allez sur https://railway.app/
2. Cliquez sur "Start a New Project"
3. Connectez-vous avec GitHub
4. **IMPORTANT:** Vous recevez **5$ de crédit GRATUIT chaque mois**

### 1.2 Créer la base de données MySQL
1. Cliquez sur "New Project"
2. Sélectionnez "Provision MySQL"
3. Attendez 30 secondes que la base soit créée
4. Cliquez sur votre base MySQL

### 1.3 Récupérer les informations de connexion
1. Cliquez sur l'onglet "Variables"
2. **Railway génère automatiquement ces variables:**
   ```
   MYSQLHOST=${{RAILWAY_PRIVATE_DOMAIN}}
   MYSQLPORT=3306
   MYSQLUSER=root
   MYSQL_ROOT_PASSWORD=xxxxxxxxxxxx (généré automatiquement)
   MYSQL_DATABASE=railway
   MYSQL_PUBLIC_URL=mysql://root:password@xxx.railway.app:port/railway
   ```
3. **Pour se connecter depuis votre PC, utilisez:**
   - Copiez la valeur de `MYSQL_PUBLIC_URL`
   - OU utilisez: Host=`RAILWAY_TCP_PROXY_DOMAIN`, Port=`RAILWAY_TCP_PROXY_PORT`

### 1.4 Importer le schéma

**🚀 Option 1: AUTOMATIQUE (Recommandé) - Double-clic!**
1. Double-cliquez sur: `DEPLOY-TO-RAILWAY.bat`
2. Le script fait TOUT automatiquement:
   - ✅ Installe Railway CLI si nécessaire
   - ✅ Se connecte à votre compte Railway
   - ✅ Importe le schéma principal
   - ✅ Importe les 16 migrations dans l'ordre
   - ✅ Crée l'utilisateur admin
3. **C'est tout! Prenez un café ☕**

**Option 2: Depuis Railway Console (Manuel)**
1. Cliquez sur votre base MySQL → Data
2. Cliquez sur "Query"
3. Copiez-collez le contenu de `backend/sql/schema/recreate-database.sql`
4. Cliquez sur "Run"
5. Répétez pour chaque migration (001 à 016)

**Option 3: MySQL Workbench**
1. Téléchargez MySQL Workbench
2. Nouvelle connexion:
   - Hostname: Copiez `RAILWAY_TCP_PROXY_DOMAIN` depuis Railway
   - Port: Copiez `RAILWAY_TCP_PROXY_PORT`
   - Username: `root`
   - Password: Copiez `MYSQL_ROOT_PASSWORD`
3. Exécutez `backend/sql/schema/recreate-database.sql`
4. Exécutez chaque migration (001 à 016)

**Option 4: Railway CLI (Manuel)**
```bash
npm install -g @railway/cli
railway login
railway link
railway connect
# Puis dans le shell MySQL:
source C:/laragon/www/security-guard-management/backend/sql/schema/recreate-database.sql
```

**💡 ASTUCE:** L'option 1 (automatique) est la plus rapide et évite toute erreur!

---

## 🔧 ÉTAPE 2: DÉPLOYER LE BACKEND (Render.com)

### 2.1 Préparer le code
1. Créez un dépôt GitHub:
   ```bash
   cd c:\laragon\www\security-guard-management
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/VOTRE-USERNAME/security-guard-management.git
   git push -u origin main
   ```

### 2.2 Créer un compte Render
1. Allez sur https://render.com/
2. Cliquez sur "Get Started for Free"
3. Connectez-vous avec GitHub

### 2.3 Déployer le backend
1. Cliquez sur "New +" → "Web Service"
2. Connectez votre dépôt GitHub
3. Sélectionnez `security-guard-management`
4. **Configuration:**
   ```
   Name: security-guard-backend
   Region: Frankfurt (EU Central)
   Branch: main
   Root Directory: backend
   Runtime: Node
   Build Command: npm install
   Start Command: node src/server.js
   Instance Type: Free
   ```

### 2.4 Variables d'environnement
Ajoutez ces variables dans "Environment":

```bash
NODE_ENV=production
PORT=5000

# Base de données Railway.dev (utilisez les variables Railway)
DB_HOST=${{RAILWAY_PRIVATE_DOMAIN}}
DB_USER=root
DB_PASSWORD=${{MYSQL_ROOT_PASSWORD}}
DB_NAME=railway
DB_PORT=3306
DB_SSL=false

# OU utilisez directement MYSQL_URL
DATABASE_URL=${{MYSQL_URL}}

# JWT Secret (générez une clé aléatoire forte)
JWT_SECRET=votre-secret-jwt-ultra-securise-changez-moi

# Session Secret
SESSION_SECRET=votre-secret-session-ultra-securise

# Frontend URL (vous l'aurez après le déploiement Vercel)
FRONTEND_URL=https://votre-app.vercel.app
SOCKET_CORS_ORIGIN=https://votre-app.vercel.app
```

5. Cliquez sur "Create Web Service"
6. Attendez 2-3 minutes que le déploiement se termine
7. **NOTEZ L'URL:** `https://security-guard-backend.onrender.com`

**💡 ASTUCE:** Vous pouvez utiliser les variables Railway directement:
```bash
DB_HOST=${{RAILWAY.MYSQLHOST}}
DB_PASSWORD=${{RAILWAY.MYSQL_ROOT_PASSWORD}}
DB_NAME=${{RAILWAY.MYSQL_DATABASE}}
```

---

## 🌐 ÉTAPE 3: DÉPLOYER LE FRONTEND (Vercel)

### 3.1 Créer un compte Vercel
1. Allez sur https://vercel.com/
2. Cliquez sur "Sign Up"
3. Connectez-vous avec GitHub

### 3.2 Déployer le frontend
1. Cliquez sur "Add New..." → "Project"
2. Importez votre dépôt GitHub `security-guard-management`
3. **Configuration:**
   ```
   Framework Preset: Create React App
   Root Directory: web-dashboard
   Build Command: npm run build
   Output Directory: build
   ```

### 3.3 Variables d'environnement
Ajoutez ces variables:

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

4. Cliquez sur "Deploy"
5. Attendez 2-3 minutes
6. **VOTRE APP EST EN LIGNE:** `https://votre-app.vercel.app`

---

## 🔄 ÉTAPE 4: FINALISATION

### 4.1 Mettre à jour le Backend avec l'URL Frontend
1. Retournez sur Render.com
2. Allez dans votre service backend
3. Mettez à jour ces variables:
   ```
   FRONTEND_URL=https://votre-app.vercel.app
   SOCKET_CORS_ORIGIN=https://votre-app.vercel.app
   ```
4. Le service redémarrera automatiquement

### 4.2 Créer un compte admin
1. Connectez-vous à Railway Console → MySQL → Data
2. Exécutez cette requête SQL:
   ```sql
   INSERT INTO users (firstName, lastName, email, password, role, cin, phone, createdAt, updatedAt)
   VALUES (
     'Admin',
     'System',
     'admin@example.com',
     '$2a$10$XxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ',
     'admin',
     'ADMIN001',
     '+212600000000',
     NOW(),
     NOW()
   );
   ```
3. Mot de passe par défaut: `Admin@123`

---

## ✅ ÉTAPE 5: TESTER L'APPLICATION

1. Ouvrez: `https://votre-app.vercel.app`
2. Connectez-vous avec:
   - Email: `admin@example.com`
   - Mot de passe: `Admin@123`
3. Testez toutes les fonctionnalités:
   - ✓ Création d'agents
   - ✓ Gestion d'événements
   - ✓ Check-in/Check-out
   - ✓ Suivi GPS en temps réel
   - ✓ Notifications Socket.IO

---

## 🔒 SÉCURITÉ POST-DÉPLOIEMENT

### Important - À faire immédiatement:

1. **Changez le mot de passe admin:**
   ```sql
   UPDATE users 
   SET password = '$2a$10$NOUVEAU_HASH_ICI'
   WHERE email = 'admin@example.com';
   ```

2. **Activez HTTPS uniquement** (déjà fait automatiquement par Vercel/Render)

3. **Sécurisez Railway:**
   - Settings → Disable Public Networking si non nécessaire
   - Utilisez les variables d'environnement Railway

---

## 📊 LIMITES GRATUITES (100% GRATUIT!)

### Railway.dev (Database) 💯
- ✅ **5$/mois de crédit GRATUIT**
- ✅ ~500MB de stockage (largement suffisant)
- ✅ Backups automatiques
- ✅ Aucune carte bancaire requise
- ⚠️ Le crédit se renouvelle chaque mois
- 💡 **Astuce:** Supprimez les anciens logs pour économiser l'espace

### Render.com (Backend) 💯
- ✅ **750 heures/mois GRATUIT** (suffisant pour 1 instance)
- ⚠️ Se met en veille après 15 min d'inactivité
- ⚠️ Redémarre en ~30 secondes à la première requête
- 💡 **Astuce:** Utilisez un service de ping (UptimeRobot) pour éviter la veille

### Vercel (Frontend) 💯
- ✅ **Bande passante illimitée**
- ✅ **Déploiements illimités**
- ✅ CDN mondial
- ✅ SSL automatique
- ✅ 100% gratuit FOREVER

**💰 COÛT TOTAL: 0€/mois - FOREVER!**

---

## 🚨 DÉPANNAGE

### Backend ne démarre pas
1. Vérifiez les logs sur Render.com (Logs tab)
2. Vérifiez que toutes les variables d'environnement sont définies
3. Testez la connexion Railway:
   - Depuis Railway Console → MySQL → Data → Query
   - Ou MySQL Workbench avec `MYSQL_PUBLIC_URL`
4. Vérifiez que les variables Railway sont bien copiées

### Frontend ne se connecte pas au backend
1. Vérifiez que `REACT_APP_API_URL` est correct
2. Vérifiez les CORS dans le backend (variable `SOCKET_CORS_ORIGIN`)
3. Ouvrez la console du navigateur (F12) pour voir les erreurs
4. Vérifiez que le backend est bien démarré sur Render.com

### Socket.IO ne fonctionne pas
1. Vérifiez `REACT_APP_SOCKET_URL` dans Vercel
2. Vérifiez `SOCKET_CORS_ORIGIN` dans Render.com
3. Testez avec: `https://votre-backend.onrender.com/socket.io/socket.io.js`
4. Vérifiez les logs en temps réel sur Render.com

### Base de données inaccessible
1. Vérifiez que Railway MySQL est bien démarré
2. Testez la connexion depuis Railway Console → Data
3. Vérifiez les variables: `MYSQL_ROOT_PASSWORD`, `MYSQLHOST`, `MYSQLPORT`
4. Si erreur SSL, mettez `DB_SSL=false` dans Render.com

---

## 📞 SUPPORT

### Si vous avez des problèmes:
1. **Logs Backend:** Render.com → Votre service → Logs
2. **Logs Frontend:** Vercel → Votre projet → Deployments → Logs
3. **Base de données:** Railway → MySQL → Metrics
4. **Console navigateur:** F12 → Console (pour erreurs JavaScript)

### Variables Railway importantes:
```bash
MYSQL_PUBLIC_URL   # Pour connexion externe (MySQL Workbench)
MYSQL_URL          # Pour connexion interne (Render backend)
MYSQLHOST          # Host privé Railway
MYSQL_ROOT_PASSWORD # Mot de passe auto-généré
RAILWAY_TCP_PROXY_DOMAIN # Pour connexion TCP publique
RAILWAY_TCP_PROXY_PORT   # Port TCP public
```

---

## 🎉 FÉLICITATIONS!

Votre application Security Guard Management est maintenant **100% GRATUITE** et accessible partout dans le monde!

**URLs importantes:**
- 🌐 **Frontend:** https://votre-app.vercel.app
- 🔧 **Backend API:** https://security-guard-backend.onrender.com/api
- 🗄️ **Database:** Railway.app Console

**💰 COÛT MENSUEL: 0€ (VRAIMENT GRATUIT!)**
- ✅ Aucune carte bancaire requise
- ✅ Aucune limite de temps
- ✅ Service professionnel 24/7
- ✅ SSL/HTTPS automatique
- ✅ Backups automatiques

---

**Créé avec ❤️ - Security Guard Management System**
**© 2026 SGM – Security Guard | Système de gestion**
