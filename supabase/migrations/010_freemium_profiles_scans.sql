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
