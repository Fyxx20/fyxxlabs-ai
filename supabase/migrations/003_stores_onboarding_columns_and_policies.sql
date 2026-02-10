-- StorePilot AI - Colonnes onboarding (stores) + renforcement RLS
-- Résout "table public.stores not in schema cache" si migrations 001/002 déjà appliquées :
-- on s'assure que stores a toutes les colonnes attendues et que les policies sont complètes.

-- 1) Colonnes supplémentaires sur stores (compatibles avec 001 existant)
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS traffic_source TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS aov_bucket TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'FR';

-- 2) subscriptions: colonne scan_count_trial si manquante
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS scan_count_trial INT NOT NULL DEFAULT 0;

-- 3) scans: alias error pour compatibilité (garder error_message)
-- La table 001 a déjà error_message; pas de colonne "error". On ne change rien.

-- 4) RLS stores: policy avec WITH CHECK pour INSERT/UPDATE (explicite)
DROP POLICY IF EXISTS "Users can CRUD own stores" ON public.stores;
CREATE POLICY "stores_select_own"
  ON public.stores FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "stores_insert_own"
  ON public.stores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stores_update_own"
  ON public.stores FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "stores_delete_own"
  ON public.stores FOR DELETE
  USING (auth.uid() = user_id);

-- 5) profiles: permettre à l'utilisateur de mettre à jour son propre profil
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6) subscriptions: policy UPDATE pour l'utilisateur (webhooks utilisent service_role)
-- 001 a déjà "Users can read/update own subscription" FOR ALL USING (auth.uid() = user_id).
-- On ajoute une policy UPDATE explicite si besoin (FOR ALL couvre déjà UPDATE).
-- Rien à faire si la policy existante est FOR ALL.

-- 7) audit_events: user_id nullable pour événements système (optionnel)
ALTER TABLE public.audit_events
  ALTER COLUMN user_id DROP NOT NULL;

-- Après migration : supabase db push (ou link + push) pour appliquer.
-- En local Supabase : le schema cache est rechargé automatiquement.
