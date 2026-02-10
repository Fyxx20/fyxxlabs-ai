# StorePilot AI

**Tableau de bord + Coach IA** pour analyser une boutique e-commerce via URL : score /100, recommandations priorisées, et coaching itératif.

## Principes produit

- **Anti-scam** : transparence (sources, limites, ce que l’IA sait/ne sait pas).
- **UX** : simple, rapide — en quelques minutes : score + action prioritaire.
- **MVP** : multi-plateforme via **URL + crawler** (Playwright). Intégrations Shopify/Woo/Meta prévues en architecture, optionnelles pour le MVP.

## Stack (MVP)

- **Front** : Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui, Framer Motion.
- **Auth + DB** : Supabase (Postgres, Auth, RLS).
- **Paiement** : Stripe (Checkout, Customer Portal, Webhooks).
- **Scan** : Playwright (server-side) + Cheerio (extraction HTML).
- **LLM** : OpenAI (gpt-4o-mini) pour scores, issues et conseil unique (trial).
- **Hosting** : Vercel (Next) + Supabase.

## Setup local

1. **Cloner et installer les dépendances**

```bash
npm install
npx playwright install chromium
```

**Si un scan échoue avec** `browserType.launch: Executable doesn't exist` **:** les binaires Playwright ne sont pas installés. Exécuter une fois :

```bash
npm run playwright:install
```

(ou `npx playwright install chromium`).

2. **Variables d’environnement**

Copier `.env.example` vers `.env.local` et renseigner :

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`
- `OPENAI_API_KEY`
- Optionnel : `NEXT_PUBLIC_APP_URL` (ex. `http://localhost:3000`)

3. **Supabase**

- Créer un projet Supabase.
- Exécuter les migrations dans l’ordre : `001_initial_schema.sql`, `002_profiles_and_admin_rls.sql`, `003_stores_onboarding_columns_and_policies.sql`, `004_connectors_and_metrics.sql` (Dashboard Supabase → SQL Editor, ou `supabase link` + `supabase db push`). Si l’app affiche « table stores introuvable », les migrations n’ont pas été appliquées sur le bon projet.
- En dev, la page **/debug** affiche l’état Supabase et un test sur la table `stores` (utile en cas d’erreur « schema cache »).
- Activer Auth (Email) et configurer l’URL de redirection si besoin.
- **Rôles** : table `profiles` (user_id, role, email) avec `role` = `user` ou `admin`. À chaque signup, un profil `user` et un abonnement en trial sont créés.
- **Créer les comptes de base (user + admin)** : exécuter **une fois** `npm run seed:users` (avec `.env.local` configuré). Cela crée `m.harea@storepilot.ia` (user) et `admin@storepilot.ia` (admin) avec des mots de passe complexes générés, affichés dans la console. **Sauvegardez-les en lieu sûr.** Pour un admin manuel : voir `supabase/seed_admin.sql`.
- **Double authentification (2FA)** : disponible dans Paramètres (app user) et Paramètres admin. Les utilisateurs peuvent activer un facteur TOTP (Google Authenticator, Authy, etc.) ; à la connexion suivante, un code à 6 chiffres sera demandé après le mot de passe.

4. **Connexion Google, Facebook, Apple (optionnel)**

- Dans le Dashboard Supabase : **Authentication** → **Providers**.
- **Google** : activer, renseigner Client ID et Client Secret (Google Cloud Console → APIs & Services → Credentials). URL de redirection autorisée : `https://<project-ref>.supabase.co/auth/v1/callback`.
- **Facebook** : activer, renseigner App ID et App Secret (Facebook for Developers). URI de redirection OAuth valide : `https://<project-ref>.supabase.co/auth/v1/callback`.
- **Apple** : activer, renseigner Services ID, Secret Key et Key ID (Apple Developer). URL de retour : `https://<project-ref>.supabase.co/auth/v1/callback`.
- Dans **URL Configuration**, ajouter l’URL de ton site (ex. `http://localhost:3000`, `https://ton-domaine.com`) dans **Redirect URLs**.

5. **Stripe**

- Créer des produits/prix (Pro Monthly, Pro Yearly).
- Webhook : `POST /api/stripe/webhook` avec les événements : `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`.
- En local : `stripe listen --forward-to localhost:3000/api/stripe/webhook` et mettre `STRIPE_WEBHOOK_SECRET` à la valeur affichée.

6. **Lancer le dev**

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Déploiement

- **Vercel** : connecter le repo, définir les env vars (y compris `NEXT_PUBLIC_APP_URL` en prod), déployer.
- **Supabase** : migrations appliquées (Dashboard ou `supabase db push`).
- **Stripe** : webhook en prod pointant vers `https://votredomaine.com/api/stripe/webhook`.

## Architecture (résumé)

- **Landing** (`/`) : hero, CTA unique, avant/après, comment ça marche, tarifs, FAQ.
- **Auth** : `/login`, `/signup` (utilisateurs) ; `/admin/login` (admins, même Auth, rôle vérifié).
- **Onboarding** (`/onboarding`) : nom boutique, URL, objectif → création store + redirect dashboard.
- **App utilisateur** (`/app/*`) : protégé par session + onboarding. Sidebar : Dashboard, Scans, Coach IA, Issues, Settings, Billing. Paywall selon abonnement / trial.
- **App admin** (`/admin/*`) : protégé par session + `profiles.role = 'admin'`. Dashboard (KPIs), Utilisateurs, Boutiques, Scans (liste + détail), Paramètres (feature flags).
- **Scan** : `POST /api/scan/start` → création scan (trigger remplit `user_id`) → pipeline Playwright + Cheerio → LLM (scores + issues ou 1 conseil trial) → mise à jour scan.
- **Monétisation** : essai 3 jours + 1 scan + 1 conseil unique ; puis abonnement Stripe (Pro 39€/390€). Paywall sur coach, issues complètes, rescans.

## Limites MVP

- Un seul scan autorisé pendant l’essai ; rate limit 1 scan / 10 min en Pro.
- Pas d’intégration Google Analytics / Shopify / Meta dans le MVP.
- Lighthouse optionnel (non implémenté dans le MVP pour limiter les coûts).
- Crawl limité à la homepage + quelques pages clés (liens produits/panier/contact, etc.).

## Connectors (multi-plateforme)

StorePilot supporte plusieurs plateformes e-commerce avec un même flow UI + DB.

- **Connectables (OAuth ou API key)** : Shopify, WooCommerce, PrestaShop. Connexion dans **Paramètres → Connexions plateforme**.
- **Autres** : BigCommerce, Magento, Wix, Squarespace, OpenCart, Ecwid, Custom, Autre → diagnostic par **scan URL** uniquement (Google Analytics « bientôt »).

### Variables d’environnement

- `INTEGRATIONS_ENC_KEY` : clé de chiffrement (32 octets recommandés) pour les credentials stockés en base. **Obligatoire** si tu utilises les connecteurs.
- `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET` : pour OAuth Shopify (app Shopify dans le dashboard partenaire).
- `NEXT_PUBLIC_APP_URL` : URL de l’app (pour les redirects OAuth).

### Connecter Shopify

1. Créer une app dans le [Shopify Partner Dashboard](https://partners.shopify.com) (ou app personnalisée).
2. Renseigner `SHOPIFY_CLIENT_ID` et `SHOPIFY_CLIENT_SECRET` dans `.env.local`.
3. URL de redirection autorisée : `https://<ton-domaine>/api/integrations/shopify/callback`.
4. Dans l’app : Paramètres → Connexions plateforme → Shopify → **Connecter** (redirection OAuth). Après autorisation, sync initiale (commandes 30 j, clients, produits).

### Connecter WooCommerce

1. Dans WooCommerce : **Paramètres** → **Avancé** → **REST API** → **Ajouter une clé**.
2. Dans StorePilot : Paramètres → Connexions plateforme → WooCommerce → **Connecter**.
3. Saisir l’URL du site, la **Consumer key** et le **Consumer secret**. Tester et connecter.

### Connecter PrestaShop

1. Dans le Back Office PrestaShop : **Paramètres avancés** → **Web Service** → activer l’API et générer une clé.
2. Dans StorePilot : Paramètres → Connexions plateforme → PrestaShop → **Connecter**.
3. Saisir l’URL du site et la **Clé API**.

Les credentials sont chiffrés (AES-256-GCM) avant stockage. Les métriques (CA, commandes, clients) sont agrégées dans `store_metrics_daily` et affichées sur le dashboard avec le badge **Source: {plateforme}**.

## Roadmap (intégrations)

- Google Analytics (données trafic/conversion réelles).
- Meta Ads (analyse de créatifs / campagnes).
- Lighthouse (performance) derrière plan payant si coût maîtrisé.

## Licence

Propriétaire. Tous droits réservés.
