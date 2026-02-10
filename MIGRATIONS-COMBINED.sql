-- ========================================
-- AXIS / StorePilot AI - All Migrations
-- ========================================
-- Exécute toutes les migrations d'un coup
-- Copie-colle tout ça dans Supabase SQL Editor
-- ========================================

-- StorePilot AI - Schema initial
-- Stores
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  goal TEXT NOT NULL CHECK (goal IN ('sales', 'roas', 'conversion', 'traffic', 'trust', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscriptions (1 per user)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
  trial_start TIMESTAMPTZ NOT NULL,
  trial_end TIMESTAMPTZ NOT NULL,
  advice_consumed BOOLEAN NOT NULL DEFAULT false,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'pro' CHECK (plan IN ('pro', 'business')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scans
CREATE TABLE IF NOT EXISTS public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  score_global INTEGER,
  scores_json JSONB,
  issues_json JSONB,
  trial_single_advice TEXT,
  scan_data_json JSONB,
  summary TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scans_store_id ON public.scans(store_id);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON public.scans(created_at DESC);

-- Coach messages
CREATE TABLE IF NOT EXISTS public.coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_messages_store_user ON public.coach_messages(store_id, user_id, created_at);

-- User onboarding flag
CREATE TABLE IF NOT EXISTS public.user_onboarding (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit events (debug)
CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_user_created ON public.audit_events(user_id, created_at DESC);

-- RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Policies: users see only their data
CREATE POLICY "Users can CRUD own stores" ON public.stores
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can read/update own subscription" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can read scans of own stores" ON public.scans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = scans.store_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Users can insert scans for own stores" ON public.scans
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Users can update scans of own stores" ON public.scans
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = scans.store_id AND s.user_id = auth.uid())
  );

CREATE POLICY "Users can CRUD coach_messages for own stores" ON public.coach_messages
  FOR ALL USING (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
  );

CREATE POLICY "Users can read/update own onboarding" ON public.user_onboarding
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit_events" ON public.audit_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own audit_events" ON public.audit_events
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything (for webhooks / server)
-- No policy = service role bypasses RLS by default in Supabase

-- Function: create subscription on signup (trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, trial_start, trial_end)
  VALUES (
    NEW.id,
    now(),
    now() + interval '3 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger after auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function: update subscriptions.updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
-- StorePilot AI - Profiles (roles) + Admin RLS
-- Profiles: one row per auth user, role = 'user' | 'admin'
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- is_admin(uid) - doit exister AVANT les policies qui l'utilisent
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = uid AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- User can read own profile; admin can read all
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Only service role / backend can insert/update profiles (no public signup as admin)
-- We allow insert for own row so trigger can run with SECURITY DEFINER
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add user_id to scans (redundant for RLS convenience)
ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_scans_user_id ON public.scans(user_id);

-- Backfill scans.user_id from store
UPDATE public.scans s
SET user_id = st.user_id
FROM public.stores st
WHERE s.store_id = st.id AND s.user_id IS NULL;

-- Policy: admin can read all scans
CREATE POLICY "Admins can read all scans" ON public.scans
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Policy: admin can read all stores
CREATE POLICY "Admins can read all stores" ON public.stores
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Policy: admin can read all subscriptions
CREATE POLICY "Admins can read all subscriptions" ON public.subscriptions
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Policy: admin can read all coach_messages
CREATE POLICY "Admins can read all coach_messages" ON public.coach_messages
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Policy: admin can read all audit_events
CREATE POLICY "Admins can read all audit_events" ON public.audit_events
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Policy: admin can read all user_onboarding
CREATE POLICY "Admins can read all user_onboarding" ON public.user_onboarding
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Update handle_new_user: also insert profile (role=user) and set scans.user_id on insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role, email)
  VALUES (NEW.id, 'user', NEW.email);
  INSERT INTO public.subscriptions (user_id, trial_start, trial_end)
  VALUES (
    NEW.id,
    now(),
    now() + interval '3 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to set scans.user_id on insert
CREATE OR REPLACE FUNCTION public.set_scan_user_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT user_id INTO NEW.user_id
  FROM public.stores
  WHERE id = NEW.store_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_scan_user_id_trigger ON public.scans;
CREATE TRIGGER set_scan_user_id_trigger
  BEFORE INSERT ON public.scans
  FOR EACH ROW EXECUTE PROCEDURE public.set_scan_user_id();

-- Feature flags / admin settings (optional table for scan_rate_limit_minutes, etc.)
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key TEXT PRIMARY KEY,
  value_json JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write
CREATE POLICY "Admins can manage admin_settings" ON public.admin_settings
  FOR ALL USING (public.is_admin(auth.uid()));

INSERT INTO public.admin_settings (key, value_json)
VALUES ('feature_flags', '{"enable_lighthouse_paid": false, "scan_rate_limit_minutes": 10, "max_pages_per_scan": 8, "max_scans_per_day_paid": 50}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Backfill profiles for existing auth users (no profile yet)
INSERT INTO public.profiles (user_id, role, email)
SELECT id, 'user', email FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT (user_id) DO NOTHING;
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
-- StorePilot AI - Connectors (store_integrations) + métriques agrégées (store_metrics_daily)
-- Permet multi-plateforme avec une seule table d'intégrations et une table de métriques unifiée.

-- 1) store_integrations
CREATE TABLE IF NOT EXISTS public.store_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN (
    'shopify', 'woocommerce', 'prestashop', 'bigcommerce', 'magento',
    'wix', 'squarespace', 'opencart', 'ecwid', 'custom', 'other'
  )),
  status TEXT NOT NULL DEFAULT 'not_connected' CHECK (status IN ('not_connected', 'connected', 'error', 'disconnected')),
  credentials_encrypted TEXT,
  scopes TEXT,
  shop_domain TEXT,
  metadata JSONB DEFAULT '{}',
  connected_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_store_integrations_store_id ON public.store_integrations(store_id);
CREATE INDEX IF NOT EXISTS idx_store_integrations_provider ON public.store_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_store_integrations_status ON public.store_integrations(status);

ALTER TABLE public.store_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_integrations_select_own"
  ON public.store_integrations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "store_integrations_insert_own"
  ON public.store_integrations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
  );

CREATE POLICY "store_integrations_update_own"
  ON public.store_integrations FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "store_integrations_delete_own"
  ON public.store_integrations FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
  );

-- 2) store_metrics_daily (agrégats par store / jour / provider)
CREATE TABLE IF NOT EXISTS public.store_metrics_daily (
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  provider TEXT NOT NULL DEFAULT 'scan',
  revenue NUMERIC(14, 2) NOT NULL DEFAULT 0,
  orders_count INT NOT NULL DEFAULT 0,
  refunds NUMERIC(14, 2) NOT NULL DEFAULT 0,
  aov NUMERIC(14, 2),
  new_customers INT NOT NULL DEFAULT 0,
  total_customers INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, day, provider)
);

CREATE INDEX IF NOT EXISTS idx_store_metrics_daily_store_day ON public.store_metrics_daily(store_id, day DESC);

ALTER TABLE public.store_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_metrics_daily_select_own"
  ON public.store_metrics_daily FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

-- Pas de policy INSERT sur store_metrics_daily : seuls les connectors (service_role) écrivent.

-- Trigger updated_at pour store_integrations
CREATE OR REPLACE FUNCTION public.set_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS store_integrations_updated_at ON public.store_integrations;
CREATE TRIGGER store_integrations_updated_at
  BEFORE UPDATE ON public.store_integrations
  FOR EACH ROW EXECUTE PROCEDURE public.set_integrations_updated_at();
-- StorePilot AI - 1 store max par user (MVP)
-- Empêche les créations multiples de boutiques.

CREATE UNIQUE INDEX IF NOT EXISTS stores_one_per_user
ON public.stores(user_id);
-- StorePilot AI - Abonnements: plan lifetime, ends_at, source
-- Un abonnement lifetime: plan = 'lifetime', status = 'active', ends_at = NULL, source = 'manual'

-- 1) Étendre plan pour inclure 'free' et 'lifetime'
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'pro', 'business', 'lifetime'));

-- 2) Ajouter ends_at (NULL = à vie)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

-- 3) Ajouter source ('stripe' | 'manual')
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'stripe';
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_source_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_source_check
  CHECK (source IN ('stripe', 'manual'));

-- Commentaire: pour lifetime, utiliser plan='lifetime', status='active', ends_at=NULL, source='manual'
-- StorePilot AI - Admin audit logs + is_banned sur profiles
-- Ne jamais exposer les secrets ; audit uniquement pour les actions admin.

-- 1) profiles: colonne is_banned (soft ban)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned) WHERE is_banned = true;

-- 2) admin_audit_logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'store', 'subscription', 'scan', 'integration', 'profile')),
  target_id TEXT,
  before_state JSONB,
  after_state JSONB,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id ON public.admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON public.admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent lire les logs (via policy avec is_admin)
CREATE POLICY "Admins can read admin_audit_logs"
  ON public.admin_audit_logs FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Insert uniquement côté serveur (service_role ou trigger) ; pas de policy INSERT pour anon
-- Les API admin utilisent service_role pour insérer.
-- Garantit que l'utilisateur admin@storepilot.ia a le rôle admin (évite 403 sur les API admin).
-- À exécuter après que le compte existe dans Auth (création manuelle ou premier signup).
INSERT INTO public.profiles (user_id, role, email)
SELECT id, 'admin', email FROM auth.users WHERE email = 'admin@storepilot.ia'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin', email = EXCLUDED.email, updated_at = now();
-- Scans: colonnes pour breakdown, priority_action, checklist, confidence, mode, pages, raw, error_code
ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'playwright',
  ADD COLUMN IF NOT EXISTS pages JSONB,
  ADD COLUMN IF NOT EXISTS breakdown JSONB,
  ADD COLUMN IF NOT EXISTS priority_action JSONB,
  ADD COLUMN IF NOT EXISTS checklist JSONB,
  ADD COLUMN IF NOT EXISTS confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS raw JSONB,
  ADD COLUMN IF NOT EXISTS error_code TEXT;

-- Stores: currency (nullable)
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS currency TEXT;

-- store_integrations: ajouter shopware au check provider si pas déjà présent (extension manuelle si nécessaire)
-- La table 004 a déjà les providers; on ne modifie pas le CHECK pour éviter erreur. Shopware peut être ajouté via ALTER si besoin.
-- StorePilot AI - Freemium: profiles (plan, trial, scans_used, paywall) + scans (free_preview, result_preview)

-- 1) Profiles: plan, trial, scans_used, paywall
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'trial'
    CHECK (plan IN ('trial', 'free', 'pro', 'lifetime'));
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS scans_used INT NOT NULL DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_paywall_shown_at TIMESTAMPTZ;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS paywall_show_count_today INT NOT NULL DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS paywall_show_day DATE;

-- 2) Scans: free_preview, result_preview
ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS free_preview BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS result_preview JSONB;

-- 3) Trigger: on signup set profile trial + sync from subscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role, email, plan, trial_started_at, trial_ends_at, scans_used)
  VALUES (
    NEW.id,
    'user',
    NEW.email,
    'trial',
    now(),
    now() + interval '3 days',
    0
  );
  INSERT INTO public.subscriptions (user_id, trial_start, trial_end)
  VALUES (
    NEW.id,
    now(),
    now() + interval '3 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Backfill existing profiles: set plan/trial from subscription if not set
UPDATE public.profiles p
SET
  plan = CASE
    WHEN s.plan = 'lifetime' AND s.status = 'active' THEN 'lifetime'
    WHEN s.plan IN ('pro', 'business') AND s.status = 'active' THEN 'pro'
    WHEN s.status = 'trialing' AND s.trial_end >= now() THEN 'trial'
    ELSE 'free'
  END,
  trial_started_at = COALESCE(p.trial_started_at, s.trial_start),
  trial_ends_at = COALESCE(p.trial_ends_at, s.trial_end),
  scans_used = COALESCE(p.scans_used, 0)
FROM public.subscriptions s
WHERE s.user_id = p.user_id
  AND (p.trial_started_at IS NULL OR p.plan = 'trial');

-- 5) RLS: users can read own profile (already exist). Service role updates plan/scans_used via API/webhook.
-- 0) Garantir que la colonne plan existe sur profiles (au cas où la 010 n'a pas été exécutée)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'trial'
  CHECK (plan IN ('trial', 'free', 'pro', 'lifetime'));
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS scans_used INT NOT NULL DEFAULT 0;

-- 1) Synchroniser profiles.plan avec subscriptions pour lifetime/pro
-- L'app lit les droits depuis profiles.plan ; si seul subscriptions est mis à jour (ex: seed_admin),
-- le user n'a pas l'accès.
UPDATE public.profiles
SET
  plan = CASE
    WHEN s.plan = 'lifetime' THEN 'lifetime'
    ELSE 'pro'
  END,
  updated_at = now()
FROM public.subscriptions s
WHERE s.user_id = profiles.user_id
  AND s.status = 'active'
  AND s.plan IN ('lifetime', 'pro', 'business');

-- 2) Nouveaux utilisateurs : utiliser ON CONFLICT pour que le trial soit bien appliqué
-- même si le profil existe déjà (évite "déjà utilisé" pour un nouveau compte).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role, email, plan, trial_started_at, trial_ends_at, scans_used)
  VALUES (
    NEW.id,
    'user',
    NEW.email,
    'trial',
    now(),
    now() + interval '3 days',
    0
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = 'trial',
    trial_started_at = now(),
    trial_ends_at = now() + interval '3 days',
    scans_used = 0,
    updated_at = now();
  INSERT INTO public.subscriptions (user_id, trial_start, trial_end)
  VALUES (
    NEW.id,
    now(),
    now() + interval '3 days'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    trial_start = now(),
    trial_end = now() + interval '3 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Scans: progression en temps réel (progress %, step, debug)
ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS progress INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS step TEXT,
  ADD COLUMN IF NOT EXISTS debug JSONB;

COMMENT ON COLUMN public.scans.progress IS '0-100';
COMMENT ON COLUMN public.scans.step IS 'QUEUED|FETCH_HOME|DISCOVER_PAGES|EXTRACT|SCORE|AI_SUMMARY|DONE';
COMMENT ON COLUMN public.scans.debug IS 'Données techniques en cas d''échec';

-- Journal des événements par scan (logs UI)
CREATE TABLE IF NOT EXISTS public.scan_events (
  id BIGSERIAL PRIMARY KEY,
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warn', 'error', 'metric')),
  message TEXT NOT NULL,
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_scan_events_scan_id_ts ON public.scan_events(scan_id, ts DESC);

ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;

-- Lecture : utilisateur peut voir les events des scans de ses boutiques
CREATE POLICY "Users can read scan_events of own stores"
  ON public.scan_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scans s
      JOIN public.stores st ON st.id = s.store_id
      WHERE s.id = scan_events.scan_id AND st.user_id = auth.uid()
    )
  );

-- Insert : uniquement service_role (backend)
-- Pas de policy INSERT pour anon/authenticated → seul le service role peut insérer
