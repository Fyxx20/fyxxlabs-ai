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
