-- ============================================
-- SCRIPT UNIQUE - RESET COMPLET + MIGRATIONS
-- ============================================
-- Copie-colle CE SCRIPT UNIQUEMENT dans Supabase SQL Editor
-- Il nettoie tout et réapplique les migrations proprement
-- ============================================

-- ============================================
-- PARTIE 1: NETTOYAGE COMPLET
-- ============================================

-- Désactiver temporairement RLS pour le nettoyage (seulement si elles existent)
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('ALTER TABLE ' || schemaname || '.' || tablename || ' DISABLE ROW LEVEL SECURITY;', E'\n')
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN (
      'scan_events', 'store_metrics_daily', 'store_integrations', 
      'admin_audit_logs', 'admin_settings', 'coach_messages', 
      'scans', 'stores', 'subscriptions', 'profiles', 
      'user_onboarding', 'audit_events'
    )
  );
END $$;

-- Supprimer tous les triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS stores_updated_at ON public.stores;
DROP TRIGGER IF EXISTS scans_updated_at ON public.scans;
DROP TRIGGER IF EXISTS set_scan_user_id_trigger ON public.scans;
DROP TRIGGER IF EXISTS store_integrations_updated_at ON public.store_integrations;

-- Supprimer toutes les fonctions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.set_scan_user_id() CASCADE;
DROP FUNCTION IF EXISTS public.set_integrations_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.sync_profile_plan() CASCADE;

-- Supprimer les tables (order matters pour FK)
DROP TABLE IF EXISTS public.scan_events CASCADE;
DROP TABLE IF EXISTS public.store_metrics_daily CASCADE;
DROP TABLE IF EXISTS public.store_integrations CASCADE;
DROP TABLE IF EXISTS public.admin_audit_logs CASCADE;
DROP TABLE IF EXISTS public.admin_settings CASCADE;
DROP TABLE IF EXISTS public.coach_messages CASCADE;
DROP TABLE IF EXISTS public.scans CASCADE;
DROP TABLE IF EXISTS public.stores CASCADE;
DROP TABLE IF EXISTS public.user_onboarding CASCADE;
DROP TABLE IF EXISTS public.audit_events CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================
-- PARTIE 2: RECRÉATION COMPLÈTE
-- ============================================

-- Profiles (doit être créé EN PREMIER pour is_admin)
CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  email TEXT,
  plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'free', 'pro', 'lifetime')),
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  scans_used INT NOT NULL DEFAULT 0,
  last_paywall_shown_at TIMESTAMPTZ,
  paywall_show_count_today INT NOT NULL DEFAULT 0,
  paywall_show_day DATE,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_is_banned ON public.profiles(is_banned) WHERE is_banned = true;

-- Fonction is_admin (AVANT les policies)
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = uid AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Stores
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  goal TEXT NOT NULL CHECK (goal IN ('sales', 'roas', 'conversion', 'traffic', 'trust', 'other')),
  platform TEXT NOT NULL DEFAULT 'unknown',
  stage TEXT NOT NULL DEFAULT 'unknown',
  traffic_source TEXT NOT NULL DEFAULT 'unknown',
  aov_bucket TEXT NOT NULL DEFAULT 'unknown',
  country TEXT NOT NULL DEFAULT 'FR',
  currency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX stores_one_per_user ON public.stores(user_id);

-- Subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
  trial_start TIMESTAMPTZ NOT NULL,
  trial_end TIMESTAMPTZ NOT NULL,
  advice_consumed BOOLEAN NOT NULL DEFAULT false,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'pro' CHECK (plan IN ('free', 'pro', 'business', 'lifetime')),
  current_period_end TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  source TEXT DEFAULT 'stripe' CHECK (source IN ('stripe', 'manual')),
  scan_count_trial INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scans
CREATE TABLE public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
  error_code TEXT,
  mode TEXT DEFAULT 'playwright',
  pages JSONB,
  breakdown JSONB,
  priority_action JSONB,
  checklist JSONB,
  confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')),
  raw JSONB,
  progress INT NOT NULL DEFAULT 0,
  step TEXT,
  debug JSONB,
  free_preview BOOLEAN NOT NULL DEFAULT false,
  result_preview JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scans_store_id ON public.scans(store_id);
CREATE INDEX idx_scans_user_id ON public.scans(user_id);
CREATE INDEX idx_scans_created_at ON public.scans(created_at DESC);
CREATE INDEX idx_scans_status ON public.scans(status);

-- Coach messages
CREATE TABLE public.coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coach_messages_store_user ON public.coach_messages(store_id, user_id, created_at);

-- User onboarding
CREATE TABLE public.user_onboarding (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit events
CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_events_user_created ON public.audit_events(user_id, created_at DESC);

-- Admin settings
CREATE TABLE public.admin_settings (
  key TEXT PRIMARY KEY,
  value_json JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin audit logs
CREATE TABLE public.admin_audit_logs (
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

CREATE INDEX idx_admin_audit_logs_admin_user_id ON public.admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_target ON public.admin_audit_logs(target_type, target_id);
CREATE INDEX idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

-- Store integrations
CREATE TABLE public.store_integrations (
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

CREATE INDEX idx_store_integrations_store_id ON public.store_integrations(store_id);
CREATE INDEX idx_store_integrations_provider ON public.store_integrations(provider);
CREATE INDEX idx_store_integrations_status ON public.store_integrations(status);

-- Store metrics daily
CREATE TABLE public.store_metrics_daily (
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

CREATE INDEX idx_store_metrics_daily_store_day ON public.store_metrics_daily(store_id, day DESC);

-- Scan events
CREATE TABLE public.scan_events (
  id BIGSERIAL PRIMARY KEY,
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warn', 'error', 'metric')),
  message TEXT NOT NULL,
  payload JSONB
);

CREATE INDEX idx_scan_events_scan_id_ts ON public.scan_events(scan_id, ts DESC);

-- ============================================
-- PARTIE 3: RLS + POLICIES
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Stores policies
CREATE POLICY "stores_select_own" ON public.stores
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "stores_insert_own" ON public.stores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stores_update_own" ON public.stores
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "stores_delete_own" ON public.stores
  FOR DELETE USING (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "subscriptions_update_own" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Scans policies
CREATE POLICY "scans_select_own" ON public.scans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = scans.store_id AND s.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "scans_insert_own" ON public.scans
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
  );

CREATE POLICY "scans_update_own" ON public.scans
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = scans.store_id AND s.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

-- Coach messages policies
CREATE POLICY "coach_messages_crud_own" ON public.coach_messages
  FOR ALL USING (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
  );

CREATE POLICY "coach_messages_admin" ON public.coach_messages
  FOR SELECT USING (public.is_admin(auth.uid()));

-- User onboarding policies
CREATE POLICY "user_onboarding_own" ON public.user_onboarding
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_onboarding_admin" ON public.user_onboarding
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Audit events policies
CREATE POLICY "audit_events_insert_own" ON public.audit_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "audit_events_select_own" ON public.audit_events
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Admin settings (admin only)
CREATE POLICY "admin_settings_admin_only" ON public.admin_settings
  FOR ALL USING (public.is_admin(auth.uid()));

-- Admin audit logs (admin only)
CREATE POLICY "admin_audit_logs_admin_only" ON public.admin_audit_logs
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Store integrations policies
CREATE POLICY "store_integrations_select_own" ON public.store_integrations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "store_integrations_insert_own" ON public.store_integrations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
  );

CREATE POLICY "store_integrations_update_own" ON public.store_integrations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "store_integrations_delete_own" ON public.store_integrations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
  );

-- Store metrics daily (read only for users)
CREATE POLICY "store_metrics_daily_select_own" ON public.store_metrics_daily
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

-- Scan events (read only for users)
CREATE POLICY "scan_events_select_own" ON public.scan_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scans s
      JOIN public.stores st ON st.id = s.store_id
      WHERE s.id = scan_events.scan_id AND st.user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
  );

-- ============================================
-- PARTIE 4: FONCTIONS + TRIGGERS
-- ============================================

-- Fonction: updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction: set scan user_id from store
CREATE OR REPLACE FUNCTION public.set_scan_user_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT user_id INTO NEW.user_id
  FROM public.stores
  WHERE id = NEW.store_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction: handle new user (profile + subscription)
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

-- Triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER set_scan_user_id_trigger
  BEFORE INSERT ON public.scans
  FOR EACH ROW EXECUTE PROCEDURE public.set_scan_user_id();

CREATE TRIGGER store_integrations_updated_at
  BEFORE UPDATE ON public.store_integrations
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ============================================
-- PARTIE 5: DATA INITIALE
-- ============================================

-- Admin settings
INSERT INTO public.admin_settings (key, value_json)
VALUES ('feature_flags', '{"enable_lighthouse_paid": false, "scan_rate_limit_minutes": 10, "max_pages_per_scan": 8, "max_scans_per_day_paid": 50}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Backfill profiles pour utilisateurs existants
INSERT INTO public.profiles (user_id, role, email, plan, trial_started_at, trial_ends_at, scans_used)
SELECT 
  id, 
  'user', 
  email,
  'trial',
  now(),
  now() + interval '3 days',
  0
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT (user_id) DO NOTHING;

-- Garantir admin@storepilot.ia est admin
INSERT INTO public.profiles (user_id, role, email, plan)
SELECT id, 'admin', email, 'lifetime'
FROM auth.users 
WHERE email = 'admin@storepilot.ia'
ON CONFLICT (user_id) DO UPDATE 
SET role = 'admin', plan = 'lifetime', updated_at = now();

-- ============================================
-- FIN - TOUT EST PRÊT!
-- ============================================
SELECT 'Migration terminée! Base de données prête.' as message;
