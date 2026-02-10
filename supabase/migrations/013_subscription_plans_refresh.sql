-- AXIS - Nouveaux plans d'abonnement (starter/pro/elite/lifetime)
-- Conserve la compatibilité legacy avec "business" pendant la transition.

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'starter', 'pro', 'elite', 'business', 'lifetime'));

-- Migration de compatibilité: "business" => "elite" (optionnel mais recommandé)
UPDATE public.subscriptions
SET plan = 'elite'
WHERE plan = 'business';
