-- ============================================
-- SCRIPT DE NETTOYAGE AVANT MIGRATIONS
-- Exécuter ce script EN PREMIER dans Supabase SQL Editor
-- ============================================

-- 1. Supprimer toutes les policies existantes pour éviter les conflits
-- =====================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Stores policies
DROP POLICY IF EXISTS "stores_select_own" ON public.stores;
DROP POLICY IF EXISTS "stores_insert_own" ON public.stores;
DROP POLICY IF EXISTS "stores_update_own" ON public.stores;
DROP POLICY IF EXISTS "stores_delete_own" ON public.stores;
DROP POLICY IF EXISTS "Users can read own stores" ON public.stores;
DROP POLICY IF EXISTS "Users can insert own stores" ON public.stores;
DROP POLICY IF EXISTS "Users can update own stores" ON public.stores;
DROP POLICY IF EXISTS "Users can delete own stores" ON public.stores;
DROP POLICY IF EXISTS "Admins can read all stores" ON public.stores;

-- Scans policies
DROP POLICY IF EXISTS "scans_select_own" ON public.scans;
DROP POLICY IF EXISTS "scans_insert_own" ON public.scans;
DROP POLICY IF EXISTS "scans_update_own" ON public.scans;
DROP POLICY IF EXISTS "Users can read own scans" ON public.scans;
DROP POLICY IF EXISTS "Users can insert own scans" ON public.scans;
DROP POLICY IF EXISTS "Users can update own scans" ON public.scans;
DROP POLICY IF EXISTS "Admins can read all scans" ON public.scans;

-- Subscriptions policies
DROP POLICY IF EXISTS "Users can read/update own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_own" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can read all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON public.subscriptions;

-- Connectors policies
DROP POLICY IF EXISTS "connectors_select_own" ON public.connectors;
DROP POLICY IF EXISTS "connectors_insert_own" ON public.connectors;
DROP POLICY IF EXISTS "connectors_update_own" ON public.connectors;
DROP POLICY IF EXISTS "connectors_delete_own" ON public.connectors;
DROP POLICY IF EXISTS "Users can manage own connectors" ON public.connectors;

-- Metrics policies
DROP POLICY IF EXISTS "metrics_select_own" ON public.metrics;
DROP POLICY IF EXISTS "metrics_insert_own" ON public.metrics;
DROP POLICY IF EXISTS "Users can read own metrics" ON public.metrics;
DROP POLICY IF EXISTS "Users can insert own metrics" ON public.metrics;

-- Audit events policies
DROP POLICY IF EXISTS "audit_events_admin_only" ON public.audit_events;
DROP POLICY IF EXISTS "Admins can read audit events" ON public.audit_events;
DROP POLICY IF EXISTS "Service role can insert audit events" ON public.audit_events;

-- Scan events policies
DROP POLICY IF EXISTS "scan_events_select_own" ON public.scan_events;
DROP POLICY IF EXISTS "scan_events_insert_service" ON public.scan_events;
DROP POLICY IF EXISTS "Users can read own scan events" ON public.scan_events;

-- 2. Supprimer les index potentiellement existants
-- ================================================
DROP INDEX IF EXISTS public.stores_one_per_user;
DROP INDEX IF EXISTS public.idx_scans_store_id;
DROP INDEX IF EXISTS public.idx_scans_status;
DROP INDEX IF EXISTS public.idx_connectors_store_id;
DROP INDEX IF EXISTS public.idx_metrics_store_id;
DROP INDEX IF EXISTS public.idx_scan_events_scan_id;

-- 3. Gérer les stores dupliqués AVANT de créer l'index unique
-- ===========================================================
-- Garder seulement le store le plus récent pour chaque user_id

-- D'abord, voir les doublons (ne fait rien, juste pour info)
-- SELECT user_id, COUNT(*) as cnt FROM public.stores GROUP BY user_id HAVING COUNT(*) > 1;

-- Supprimer les stores en double (garder le plus récent par created_at)
DELETE FROM public.stores
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.stores
  ORDER BY user_id, created_at DESC
);

-- 4. Supprimer les triggers existants
-- ===================================
DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS stores_updated_at ON public.stores;
DROP TRIGGER IF EXISTS scans_updated_at ON public.scans;
DROP TRIGGER IF EXISTS connectors_updated_at ON public.connectors;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 5. Supprimer les fonctions existantes (si elles seront recréées)
-- ================================================================
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.sync_profile_plan() CASCADE;

-- ============================================
-- FIN DU NETTOYAGE
-- Maintenant tu peux exécuter MIGRATIONS-COMBINED.sql
-- ============================================
SELECT 'Nettoyage terminé! Exécute maintenant MIGRATIONS-COMBINED.sql' as message;
