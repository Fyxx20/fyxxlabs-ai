# FyxxLabs Next-Gen Rollout (MVP -> Phase 2)

## Objectif
Déployer progressivement les nouvelles briques (digital builder, image optimizer, smart pricing, scan improve) sans casser le flow historique.

## Pré-requis
- Migrations Supabase appliquées jusqu'à `019_digital_builder_and_ai_ops.sql`
- Variables d'environnement next-gen renseignées (`DIGITAL_DOWNLOAD_URL_TTL_SECONDS`, `IMAGE_OPTIMIZER_PROVIDER`, etc.)
- Flags admin accessibles via `/admin/settings`

## Ordre de mise en production (MVP)
1. Activer `enable_ai_image_optimizer=true` sur un faible trafic interne.
2. Activer `enable_smart_pricing=true` sur un sous-ensemble d'utilisateurs payants.
3. Activer `enable_scan_image_improve=true` pour vérifier les jobs d'optimisation scan.
4. Activer `enable_digital_builder=true` et monitorer upload + publish Shopify.
5. Activer `enforce_generation_limits=true` (si pas déjà actif) pour protéger la capacité.

## Monitoring recommandé
- Table `generation_jobs` (succès/erreur, durée, progression)
- Table `image_optimizations` (scores qualité avant/après)
- Table `digital_deliveries` (liens expirés, ouvertures, erreurs)
- Logs `scan_events` pour l'action "Améliorer les images avec IA"

## Rollback rapide
- Désactiver un module via les flags runtime:
  - `enable_digital_builder`
  - `enable_ai_image_optimizer`
  - `enable_smart_pricing`
  - `enable_scan_image_improve`
  - `enforce_generation_limits`

## Phase 2 (après stabilisation MVP)
- Mockups 3D avancés (ebook/laptop/phone/box avec providers externes)
- Scraping marché enrichi multi-source + normalisation devise
- Pipeline asynchrone queue-first pour batch re-optimization images
- Tests E2E complets (create physical, create digital, signed delivery flow)
