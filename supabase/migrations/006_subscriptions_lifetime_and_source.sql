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
