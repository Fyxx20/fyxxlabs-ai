# 🔧 Correctifs Bugs - AXIS (StorePilot AI)

## Date: 9 février 2026

---

## ✅ Bugs Réparés

### 1. **[CRITIQUE] Scan charge à l'infini - Polling bloqué**

**Problème:**
- Le composant `ScanProgressLive` continuait à faire du polling indéfiniment même après une erreur 404
- Aucune gestion des erreurs réseau ou timeouts
- Les utilisateurs voyaient "Analyse introuvable" mais pas de message d'erreur clair

**Corrections appliquées:**
- ✅ Ajouté gestion d'erreur complète dans `scan-progress-live.tsx`
- ✅ Ajouté affichage d'erreur explicite si le scan est introuvable
- ✅ Ajouté timeout de 10s sur chaque requête fetch
- ✅ Ajouté compteur d'échecs (stocke 3 attempts failed = affiche erreur)
- ✅ Affichage du scan ID pour le débogage

**Fichiers modifiés:**
- `src/components/analysis/scan-progress-live.tsx`

---

### 2. **Playwright Fetch reste suspendu - Browser cleanup hanging**

**Problème:**
- `browser.close()` pouvait rester suspendu indéfiniment pendant le scan en arrière-plan
- Cela causait une accumulation de processus Playwright
- Les scans ne terminaient jamais correctement

**Corrections appliquées:**
- ✅ Ajouté timeout de 5s sur `browser.close()`
- ✅ Ajouté timeout sur `page.close()`
- ✅ Wrapper Promise.race() pour forcer la fermeture même en cas de problème
- ✅ Gestion d'erreur silent pour les close failures

**Fichiers modifiés:**
- `src/lib/scan/playwright-fetch.ts`

---

### 3. **OpenAI API appel sans timeout explicite**

**Problème:**
- Pas de timeout sur les appels OpenAI
- L'API pouvait rester suspendue indéfiniment
- Aucune gestion de timeout explicite

**Corrections appliquées:**
- ✅ Ajouté timeout de 30s au client OpenAI
- ✅ Ajouté double-check timeout de 35s avec AbortController
- ✅ Meilleure détection des erreurs de timeout
- ✅ Messages d'erreur clairs en cas de timeout

**Fichiers modifiés:**
- `src/lib/ai/openaiClient.ts`

---

### 4. **ScanRunner pas de timeout global**

**Problème:**
- Aucun timeout global sur le scan entier
- Playwright + Cheerio + OpenAI combinés pouvaient bloquer pour toujours
- Les scans ne terminaient jamais

**Corrections appliquées:**
- ✅ Ajouté wrapper `runScan` avec timeout global de 90s
- ✅ Refactorisé en `runScanInternalImpl` interne
- ✅ Gestion d'erreur au niveau global
- ✅ Timeouts clairs pour chaque phase (fetch 25s, OpenAI 35s)

**Fichiers modifiés:**
- `src/lib/scan/scanRunner.ts`

---

### 5. **Shopify OAuth Callback - Gestion d'erreur insuffisante**

**Problème:**
- Pas de validation du `storeId` retourné
- Erreurs d'URL non gérées correctement
- Messages d'erreur cryptés et incompréhensibles

**Corrections appliquées:**
- ✅ Ajouté validation que le callback retourne un `storeId`
- ✅ Logging des erreurs pour débogage
- ✅ URL de redirection d'erreur claire et lisible
- ✅ Truncation des messages d'erreur pour éviter les URLs trop longues

**Fichiers modifiés:**
- `src/app/api/integrations/shopify/callback/route.ts`

---

### 6. **Shopify Start Route - Validation de domaine manquante**

**Problème:**
- Aucune validation du domaine Shopify fourni
- URLs mal formées causaient des erreurs silencieuses
- Redirection utilisateur vers des URLs invalides

**Corrections appliquées:**
- ✅ Ajouté validation du format domaine (doit contenir un point)
- ✅ Extraction correcte du hostname avec `new URL()`
- ✅ Fallback redirect vers `/app/settings` au lieu de `/onboarding`
- ✅ Essayer/attraper bloc pour les erreurs d'URL
- ✅ Messages d'erreur explicites

**Fichiers modifiés:**
- `src/app/api/integrations/shopify/start/route.ts`

---

## 📊 Résumé des modifications

| Catégorie | Fichiers | Changements |
|-----------|----------|------------|
| **UI/Composants** | 1 | Gestion d'erreur, timeouts, affichage d'erreur |
| **Scan/Backend** | 3 | Timeouts Playwright, OpenAI, scanRunner wrapper |
| **Intégrations** | 2 | Validation Shopify, gestion d'erreur OAuth |
| **Total** | 6 fichiers | ~150 lignes ajoutées/modifiées |

---

## 🚀 Étapes de déploiement

1. **Déployer sur Vercel:**
   ```bash
   git add .
   git commit -m "Fix: scan infinite loading, timeouts, Shopify OAuth errors"
   git push
   ```

2. **Vérifier les variables d'environnement dans Vercel:**
   - `NEXT_PUBLIC_APP_URL` doit être défini
   - `SHOPIFY_CLIENT_ID` et `SHOPIFY_CLIENT_SECRET` doivent être présents

3. **Tester:**
   - Créer un scan et vérifier que la progression s'affiche correctement
   - Si erreur 404, vérifié que le message d'erreur s'affiche maintenant
   - Tester Shopify OAuth (`/app/settings` → Shopify)

---

## 🔍 Vérification après déploiement

- [ ] Scan se complète en < 90 secondes
- [ ] Message d'erreur clair si scan introuvable
- [ ] Pas d'accumulation de processus Playwright
- [ ] OpenAI API timeouts gérés correctement
- [ ] Shopify OAuth flow fonctionne correctement

---

## 📝 Notes

- Tous les timeouts ont des délais généreux pour éviter les faux positifs
- Les erreurs réseau sont silencieusement ignorées lors du fetch des événements (moins critique)
- Les erreurs critiques (scan data, OAuth) sont maintenant explicitement affichées

