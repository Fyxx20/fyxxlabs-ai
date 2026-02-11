-- Corrige le défaut historique: subscriptions.plan = 'pro' pour des comptes en trial.
-- Objectif: les nouveaux comptes trial démarrent en plan "free" et les anciens faux "pro" sont normalisés.

-- 1) Le plan par défaut doit être free (pas pro)
ALTER TABLE public.subscriptions
  ALTER COLUMN plan SET DEFAULT 'free';

-- 2) Normalise les anciens comptes non payants marqués à tort en pro
UPDATE public.subscriptions
SET
  plan = 'free',
  updated_at = now()
WHERE status IN ('trialing', 'canceled')
  AND plan = 'pro'
  AND stripe_subscription_id IS NULL;

-- 3) Garantit que les nouveaux users créés ont un abonnement trial + plan free
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

  INSERT INTO public.subscriptions (
    user_id,
    status,
    trial_start,
    trial_end,
    plan,
    source,
    advice_consumed
  )
  VALUES (
    NEW.id,
    'trialing',
    now(),
    now() + interval '3 days',
    'free',
    'manual',
    false
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'trialing',
    trial_start = now(),
    trial_end = now() + interval '3 days',
    plan = 'free',
    source = 'manual',
    advice_consumed = false,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
