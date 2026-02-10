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
