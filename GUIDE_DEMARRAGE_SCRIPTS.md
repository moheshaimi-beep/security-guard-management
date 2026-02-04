# 🚀 SCRIPTS DE DÉMARRAGE DU PROJET

## 📋 Fichiers Créés

### 1. **START-PROJECT.bat** (Racine du projet)
Script principal qui démarre le projet complet.

**Emplacement:** `c:\laragon\www\security-guard-management\START-PROJECT.bat`

**Fonctionnalités:**
- ✅ Vérifie que Node.js est installé
- ✅ Vérifie les dépendances (node_modules)
- ✅ Installe automatiquement les dépendances si manquantes
- ✅ Lance le backend (port 5000)
- ✅ Lance le frontend (port 3000)
- ✅ Ouvre automatiquement le navigateur
- ✅ Affiche les URLs d'accès

---

### 2. **STOP-PROJECT.bat** (Racine du projet)
Script pour arrêter tous les serveurs.

**Emplacement:** `c:\laragon\www\security-guard-management\STOP-PROJECT.bat`

**Fonctionnalités:**
- ✅ Arrête tous les processus Node.js
- ✅ Ferme le backend et le frontend
- ✅ Nettoie proprement les processus

---

### 3. **Demarrer-Security-Guard.bat** (Bureau)
Raccourci sur le bureau pour démarrage rapide.

**Emplacement:** `C:\Users\[VotreNom]\Desktop\Demarrer-Security-Guard.bat`

**Fonctionnalités:**
- ✅ Lance le projet depuis n'importe où
- ✅ Pointe vers le script principal
- ✅ Double-clic pour démarrer

---

## 🎯 Utilisation

### Démarrage Rapide

**Option 1: Depuis le bureau**
```
Double-cliquez sur: Demarrer-Security-Guard.bat
```

**Option 2: Depuis le projet**
```
Double-cliquez sur: START-PROJECT.bat
```

### Arrêt du Projet

```
Double-cliquez sur: STOP-PROJECT.bat
```

Ou fermez simplement les fenêtres de terminal.

---

## 📊 Ce qui se passe au démarrage

1. **Vérification** - Node.js et structure du projet
2. **Installation** - Dépendances si manquantes (automatique)
3. **Backend** - Démarre sur http://localhost:5000
   - API REST
   - Socket.IO pour temps réel
4. **Frontend** - Démarre sur http://localhost:3000
   - Application React
   - Connexion automatique au backend
5. **Navigateur** - S'ouvre automatiquement après 10 secondes

---

## 🔧 Configuration

### Ports par défaut

- **Backend:** 5000
- **Frontend:** 3000
- **Socket.IO:** 5000 (même port que backend)

### Modifier les ports

**Backend** - `backend/.env`:
```env
PORT=5000
```

**Frontend** - `web-dashboard/.env`:
```env
PORT=3000
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

## 🆘 Dépannage

### Problème: "Port déjà utilisé"

**Solution:**
1. Exécutez `STOP-PROJECT.bat`
2. Ou manuellement:
```powershell
# Arrêter tous les processus Node.js
taskkill /F /IM node.exe /T
```

### Problème: "Node.js introuvable"

**Solution:**
1. Installez Node.js: https://nodejs.org/
2. Redémarrez votre ordinateur
3. Relancez le script

### Problème: "Dépendances manquantes"

**Solution:**
Le script installe automatiquement les dépendances.

Si problème persiste:
```powershell
# Backend
cd backend
npm install

# Frontend
cd web-dashboard
npm install
```

### Problème: "Module introuvable"

**Solution:**
```powershell
# Nettoyer et réinstaller
cd backend
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json
npm install

cd ..\web-dashboard
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json
npm install
```

---

## 🎨 Personnalisation

### Changer le nom du raccourci desktop

Renommez simplement le fichier:
```
Demarrer-Security-Guard.bat → MonProjet.bat
```

### Créer un raccourci avec icône

1. Clic droit sur `START-PROJECT.bat`
2. "Créer un raccourci"
3. Clic droit sur le raccourci → "Propriétés"
4. "Changer d'icône"
5. Sélectionner une icône
6. Déplacer sur le bureau

### Démarrage automatique Windows

1. Appuyez sur `Win + R`
2. Tapez: `shell:startup`
3. Copiez `Demarrer-Security-Guard.bat` dans ce dossier

⚠️ **Attention:** Le projet démarrera à chaque démarrage de Windows.

---

## 📝 Logs et Debugging

### Voir les logs

Les logs s'affichent dans les fenêtres de terminal:
- **Fenêtre 1:** Backend (API + Socket.IO)
- **Fenêtre 2:** Frontend (React)

### Activer le mode debug

**Backend** - `backend/.env`:
```env
NODE_ENV=development
DEBUG=*
```

**Frontend** - `web-dashboard/.env`:
```env
REACT_APP_DEBUG=true
```

---

## 🚀 Commandes Avancées

### Démarrage manuel

**Backend uniquement:**
```powershell
cd backend
npm run dev
```

**Frontend uniquement:**
```powershell
cd web-dashboard
npm start
```

**Mode production:**
```powershell
# Backend
cd backend
npm start

# Frontend (build puis serve)
cd web-dashboard
npm run build
npx serve -s build -l 3000
```

---

## ✅ Checklist de Démarrage

- [ ] Node.js installé (v14 ou supérieur)
- [ ] MySQL/MariaDB démarré (Laragon)
- [ ] Base de données créée
- [ ] Fichiers `.env` configurés
- [ ] Double-clic sur `Demarrer-Security-Guard.bat`

---

## 🔗 URLs Importantes

Après démarrage, accédez à:

- **Application Web:** http://localhost:3000
- **API Backend:** http://localhost:5000/api
- **Documentation API:** http://localhost:5000/api-docs
- **Health Check:** http://localhost:5000/health

---

## 💡 Conseils Pro

1. **Ne fermez pas ce terminal** - Il contient des informations utiles
2. **Gardez les fenêtres backend/frontend ouvertes** - Pour voir les logs
3. **Utilisez Ctrl+C** dans les fenêtres pour arrêter proprement
4. **Vérifiez Laragon** - MySQL doit être démarré avant le backend

---

## 🏆 Bon Développement!

Votre projet est maintenant facile à démarrer avec un simple double-clic! 🚀

**Questions?** Consultez la documentation dans le répertoire du projet.
