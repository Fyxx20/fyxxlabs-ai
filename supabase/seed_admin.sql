-- StorePilot - Seed admin + lifetime (exécuter dans SQL Editor Supabase)
-- Prérequis : les utilisateurs admin@storepilot.ia et m.harea@storepilot.ia existent dans Auth.
-- Si tu as "Réservé aux admins" (403) ou 0 utilisant sur la page Utilisateurs, exécute ce script.

-- 1) admin@storepilot.ia → role = admin
UPDATE public.profiles p
SET role = 'admin', email = u.email, updated_at = now()
FROM auth.users u
WHERE p.user_id = u.id AND u.email = 'admin@storepilot.ia';

-- Si le profil n'existe pas encore (trigger pas encore exécuté), l'insert sera fait au prochain login ou on peut :
INSERT INTO public.profiles (user_id, role, email)
SELECT id, 'admin', email FROM auth.users WHERE email = 'admin@storepilot.ia'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin', email = EXCLUDED.email, updated_at = now();

-- 2) m.harea@storepilot.ia → abonnement à vie (lifetime)
INSERT INTO public.subscriptions (user_id, plan, status, ends_at, source, trial_start, trial_end)
SELECT u.id, 'lifetime', 'active', NULL, 'manual', now(), now()
FROM auth.users u
WHERE u.email = 'm.harea@storepilot.ia'
ON CONFLICT (user_id) DO UPDATE SET
  plan = 'lifetime',
  status = 'active',
  ends_at = NULL,
  source = 'manual',
  updated_at = now();

-- 2b) Synchroniser profiles.plan avec l'abonnement lifetime (l'app lit les droits depuis profiles.plan)
UPDATE public.profiles p
SET plan = 'lifetime', updated_at = now()
FROM auth.users u
WHERE p.user_id = u.id AND u.email = 'm.harea@storepilot.ia';
