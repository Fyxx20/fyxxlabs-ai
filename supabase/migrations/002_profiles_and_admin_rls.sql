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
