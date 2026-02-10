# Configuration OAuth - Google, Facebook, Apple

Les connexions OAuth ne fonctionnent pas car **les providers ne sont pas encore configurés dans Supabase**.

## 🔧 Configuration requise dans Supabase Dashboard

### 📍 URL à whitelister d'abord
Aller dans **Supabase Dashboard → Authentication → URL Configuration**

Ajouter ces **Redirect URLs** :
```
http://localhost:3000/auth/callback
https://YOUR-DOMAIN.com/auth/callback
```

---

## 1️⃣ Google OAuth

### Étape A: Créer les credentials Google
1. Aller sur https://console.cloud.google.com/
2. Créer un nouveau projet ou sélectionner un existant
3. Activer **Google+ API**
4. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://YOUR-DOMAIN.com
   ```
7. Authorized redirect URIs:
   ```
   https://efgfktednxrhomeonhac.supabase.co/auth/v1/callback
   ```
8. Copier **Client ID** et **Client Secret**

### Étape B: Configurer dans Supabase
1. **Supabase Dashboard → Authentication → Providers**
2. Activer **Google**
3. Coller **Client ID** et **Client Secret**
4. Sauvegarder

---

## 2️⃣ Facebook OAuth

### Étape A: Créer une app Facebook
1. Aller sur https://developers.facebook.com/
2. **My Apps → Create App → Consumer**
3. Ajouter **Facebook Login** product
4. **Facebook Login → Settings**
5. Valid OAuth Redirect URIs:
   ```
   https://efgfktednxrhomeonhac.supabase.co/auth/v1/callback
   ```
6. Copier **App ID** et **App Secret** depuis **Settings → Basic**

### Étape B: Configurer dans Supabase
1. **Supabase Dashboard → Authentication → Providers**
2. Activer **Facebook**
3. Coller **Facebook App ID** et **Facebook App Secret**
4. Sauvegarder

---

## 3️⃣ Apple OAuth (plus complexe)

### Étape A: Apple Developer Account (nécessaire!)
1. Avoir un **Apple Developer Account** ($99/an)
2. Aller sur https://developer.apple.com/account/
3. **Certificates, Identifiers & Profiles → Identifiers → + (Add)**
4. Sélectionner **App IDs** → Continue
5. **Sign in with Apple** (cocher)
6. Enregistrer

### Étape B: Créer Service ID
1. **Identifiers → + → Services IDs**
2. Description: "StorePilot AI Web Auth"
3. Identifier: `com.storepilot.webapp`
4. **Sign in with Apple** (activer)
5. Configure:
   - Primary App ID: (celui créé à l'étape A)
   - Domains: `efgfktednxrhomeonhac.supabase.co`
   - Return URLs: `https://efgfktednxrhomeonhac.supabase.co/auth/v1/callback`

### Étape C: Créer Private Key
1. **Keys → + → Sign in with Apple**
2. Télécharger la key (.p8 file)
3. Noter le **Key ID**
4. Noter le **Team ID** (dans Membership)

### Étape D: Configurer dans Supabase
1. **Supabase Dashboard → Authentication → Providers**
2. Activer **Apple**
3. Remplir:
   - Services ID: `com.storepilot.webapp`
   - Team ID: (trouvé à l'étape C)
   - Key ID: (trouvé à l'étape C)
   - Private Key: (contenu du fichier .p8)
4. Sauvegarder

---

## ⚡ Solution rapide : Désactiver les providers non configurés

Si tu ne veux pas configurer tous les providers maintenant, tu peux **les masquer dans le code** :

### Fichier: `src/components/auth-oauth-buttons.tsx`

```typescript
const providers: { id: Provider; label: string; icon: React.ReactNode }[] = [
  {
    id: "google",
    label: "Continuer avec Google",
    icon: /* ... */
  },
  // Commenter Facebook et Apple temporairement
  // {
  //   id: "facebook",
  //   label: "Continuer avec Facebook",
  //   icon: /* ... */
  // },
  // {
  //   id: "apple",
  //   label: "Continuer avec Apple",
  //   icon: /* ... */
  // },
];
```

Puis redémarrer le serveur :
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
npm run dev
```

---

## ✅ Vérification que ça fonctionne

Après configuration dans Supabase Dashboard :

1. Aller sur http://localhost:3000/login
2. Cliquer sur "Continuer avec Google" (ou autre)
3. Si configuré : Redirection vers Google
4. Se connecter
5. Retour sur /app/dashboard avec session active

---

## 🚨 Erreurs courantes

### "Invalid OAuth state"
- Vérifier que les **Redirect URLs** sont whitelistés dans Supabase

### "Provider not enabled"
- Aller dans **Supabase Dashboard → Authentication → Providers**
- Vérifier que le provider est **activé** (toggle ON)

### "Invalid client_id"
- Vérifier les credentials copiés dans Supabase
- Pas d'espaces avant/après

### "Redirect URI mismatch"
- Vérifier que `https://PROJECT_ID.supabase.co/auth/v1/callback` est bien ajouté dans Google/Facebook/Apple console

---

## 🎯 Ordre de priorité recommandé

1. **Google** - Le plus simple à configurer, le plus utilisé
2. **Facebook** - Moyennement simple
3. **Apple** - Complexe, nécessite compte payant

**Configure Google en premier pour tester que tout fonctionne!**
