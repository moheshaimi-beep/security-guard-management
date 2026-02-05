# 🚀 GUIDE: DÉPLOIEMENT FRONTEND SUR VERCEL

**Durée: 3-5 minutes | 100% GRATUIT | AUCUNE carte requise**

---

## ✅ POURQUOI VERCEL?

- ✅ **GRATUIT** - Hébergement illimité
- ✅ **AUCUNE carte bancaire** requise
- ✅ **SSL automatique** - HTTPS inclus
- ✅ **CDN mondial** - Ultra rapide partout
- ✅ **Deploy automatique** - Depuis GitHub
- ✅ **Simple** - 3 clics pour déployer

---

## 📋 ÉTAPE 1: CRÉER UN COMPTE VERCEL

1. Allez sur **https://vercel.com**
2. Cliquez sur **"Sign Up"**
3. Sélectionnez **"Continue with GitHub"**
4. Autorisez Vercel à accéder à votre GitHub

**✅ Vous êtes maintenant connecté!**

---

## 🚀 ÉTAPE 2: IMPORTER LE PROJET

### 2.1 Nouveau projet

1. Dans Vercel Dashboard, cliquez sur **"Add New..."**
2. Sélectionnez **"Project"**

### 2.2 Importer depuis GitHub

1. Cherchez **"security-guard-management"** dans la liste
2. Cliquez sur **"Import"**

### 2.3 Configuration du projet

**Remplissez ces champs:**

```
Project Name: security_guard_dashboard
Framework Preset: Create React App
Root Directory: web-dashboard
Build Command: npm run build
Output Directory: build
Install Command: npm install
```

**⚠️ IMPORTANT:**
- **Project Name:** Lettres, chiffres, underscores (_) seulement. Ne doit PAS commencer par un chiffre
- **Root Directory:** Doit être `web-dashboard` (pas de slash)
- **Framework:** Sélectionnez "Create React App" dans la liste

**NE CLIQUEZ PAS ENCORE SUR "Deploy"**

---

## 🔐 ÉTAPE 3: VARIABLES D'ENVIRONNEMENT

### 3.1 Ouvrir les variables

1. Faites défiler jusqu'à **"Environment Variables"**
2. Vous allez ajouter UNE SEULE variable

### 3.2 Ajouter la variable

**Cliquez sur "Add" et entrez:**

```
Name: REACT_APP_API_URL
Value: https://security-guard-backend.onrender.com
```

**⚠️ ATTENTION:**
- Le nom DOIT commencer par `REACT_APP_`
- PAS de slash `/` à la fin de l'URL
- Utilisez l'URL EXACTE de votre backend Render
- **COLLEZ la valeur DIRECTEMENT** - ne pas utiliser de secret/référence
- Si erreur "references Secret", supprimez et recréez la variable

### 3.3 Environnement

Dans le champ **"Environment"**, sélectionnez:
- ✅ Production
- ✅ Preview
- ✅ Development

**Cliquez sur "Add"**

---

## 🎯 ÉTAPE 4: DÉPLOYER!

### 4.1 Lancer le déploiement

1. Vérifiez que tout est correct:
   - ✅ Root Directory = `web-dashboard`
   - ✅ Framework = Create React App
   - ✅ REACT_APP_API_URL configuré
2. Cliquez sur **"Deploy"**

### 4.2 Attendre le déploiement

Vous allez voir:
- ⏳ **"Building..."** (2-3 minutes)
- ⏳ **"Deploying..."** (30 secondes)
- ✅ **"Success!"** avec des confettis 🎉

**Durée totale: ~3-4 minutes**

### 4.3 Récupérer l'URL

Une fois le déploiement réussi:

1. Vous verrez:
   ```
   https://security-guard-dashboard-xxxxx.vercel.app
   ```
2. **COPIEZ CETTE URL!** Vous devez mettre à jour le backend avec

---

## 🔄 ÉTAPE 5: METTRE À JOUR LE BACKEND

**IMPORTANT:** Vous devez retourner sur Render pour mettre à jour les CORS!

### 5.1 Ouvrir Render

1. Retournez sur **https://render.com**
2. Sélectionnez votre service **"security-guard-backend"**
3. Allez dans **"Environment"**

### 5.2 Modifier 2 variables

**Trouvez et modifiez:**

```
FRONTEND_URL = https://security-guard-dashboard-xxxxx.vercel.app
SOCKET_CORS_ORIGIN = https://security-guard-dashboard-xxxxx.vercel.app
```

**Remplacez `xxxxx` par votre vrai domaine Vercel!**

### 5.3 Sauvegarder

1. Cliquez **"Save Changes"**
2. Le backend redémarrera automatiquement (1 minute)

---

## ✅ ÉTAPE 6: TESTER L'APPLICATION

### 6.1 Ouvrir le dashboard

1. Ouvrez votre URL Vercel dans le navigateur:
   ```
   https://security-guard-dashboard-xxxxx.vercel.app
   ```

### 6.2 Vérifier la connexion

1. Vous devriez voir la page de connexion
2. Essayez de vous connecter avec un compte admin
3. Si ça fonctionne = **SUCCESS!** 🎉

---

## 🎯 RÉCAPITULATIF

**Ce que vous avez maintenant:**

✅ Backend déployé sur Render  
✅ Frontend déployé sur Vercel  
✅ Base de données MySQL sur Railway  
✅ HTTPS automatique (SSL)  
✅ CDN mondial  
✅ 100% Gratuit  

**URLs de votre application:**

```
Backend:  https://security-guard-backend.onrender.com
Frontend: https://security-guard-dashboard-xxxxx.vercel.app
```

---

## 🔧 DÉPANNAGE

### ❌ Le build échoue

**Vérifiez:**
- ✅ Root Directory = `web-dashboard`
- ✅ Framework = Create React App
- ✅ REACT_APP_API_URL est correctement configuré

**Regardez les logs:**
1. Dans Vercel, cliquez sur le déploiement
2. Lisez les erreurs

### ❌ Erreur "react-scripts: command not found"

**Symptôme:**
```
added 32 packages in 2s
react-scripts: command not found
```

**Cause:** Root Directory mal configuré - Vercel installe les packages du root au lieu de web-dashboard

**Solution:**
1. Allez dans **Project Settings > General**
2. Trouvez **Root Directory**
3. Vérifiez que c'est exactement: `web-dashboard` (sans slash)
4. Si ce n'est pas le cas, cliquez **Edit** et corrigez
5. **Redéployez** (Deployments > ... > Redeploy)

**OU recréez le projet** en vous assurant de bien configurer Root Directory dès le début

### ❌ Erreur CORS

**Symptômes:**
- Le frontend charge mais les requêtes API échouent
- Erreur "CORS" dans la console du navigateur

**Solution:**
1. Vérifiez que vous avez mis à jour `FRONTEND_URL` et `SOCKET_CORS_ORIGIN` dans Render
2. Vérifiez que les URLs sont EXACTEMENT les mêmes (sans slash final)
3. Attendez 1-2 minutes que le backend redémarre

### ❌ Page blanche

**Vérifiez:**
- ✅ Le build s'est terminé avec succès
- ✅ REACT_APP_API_URL est correct
- ✅ Ouvrez la console du navigateur (F12) pour voir les erreurs

---

## 💡 ASTUCES

### Deploy automatique

Chaque fois que vous poussez sur GitHub:
1. Vercel détecte automatiquement
2. Redéploie le frontend
3. Aucune action manuelle!

### Domaine personnalisé

Vous pouvez ajouter votre propre domaine:
1. Vercel > Project Settings > Domains
2. Ajoutez votre domaine
3. Configurez les DNS
4. SSL automatique!

### Variables d'environnement multiples

Si vous ajoutez d'autres variables:
- Elles DOIVENT commencer par `REACT_APP_`
- Sinon React ne les verra pas
- Exemple: `REACT_APP_GOOGLE_MAPS_KEY`

---

## 🎯 PROCHAINE ÉTAPE

**Déployer l'application mobile sur Expo!**

Vous aurez besoin de:
- ✅ L'URL de votre backend (déjà prêt)
- ✅ Compte Expo (gratuit)

**Durée estimée: 5 minutes**

---

**© 2026 SGM – Security Guard Management System**
