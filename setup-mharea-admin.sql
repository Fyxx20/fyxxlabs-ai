-- ============================================
-- Configuration Admin pour m.harea@storepilot.ia
-- Full access + scans illimités
-- ============================================

-- ÉTAPE 1: Vérifier si l'utilisateur existe
DO $$
DECLARE
  user_count INTEGER;
  user_uuid UUID;
BEGIN
  SELECT COUNT(*), id INTO user_count, user_uuid
  FROM auth.users 
  WHERE email = 'm.harea@storepilot.ia'
  LIMIT 1;
  
  IF user_count = 0 THEN
    RAISE NOTICE '❌ ERREUR: Le compte m.harea@storepilot.ia n''existe pas encore!';
    RAISE NOTICE '➡️  ACTION REQUISE: Créer un compte via l''interface de signup d''abord';
    RAISE NOTICE '➡️  URL: http://localhost:3000/signup';
    RAISE NOTICE '➡️  Email: m.harea@storepilot.ia';
    RAISE EXCEPTION 'Compte introuvable. Créer le compte d''abord.';
  ELSE
    RAISE NOTICE '✅ Compte trouvé: %', user_uuid;
  END IF;
END $$;

-- ÉTAPE 2: Mettre à jour le profil avec rôle admin + plan lifetime
INSERT INTO public.profiles (user_id, role, email, plan, scans_used, trial_started_at, trial_ends_at, is_banned)
SELECT 
  id, 
  'admin',
  'm.harea@storepilot.ia',
  'lifetime',
  0,
  now(),
  null,  -- Pas de fin de trial pour lifetime
  false
FROM auth.users 
WHERE email = 'm.harea@storepilot.ia'
ON CONFLICT (user_id) DO UPDATE 
SET 
  role = 'admin',
  plan = 'lifetime',
  scans_used = 0,
  trial_ends_at = null,
  is_banned = false,
  updated_at = now();

-- ÉTAPE 3: Configurer la subscription avec plan lifetime + scans illimités
INSERT INTO public.subscriptions (user_id, status, trial_start, trial_end, plan, ends_at, source)
SELECT 
  id,
  'active',
  now(),
  now() + interval '100 years',  -- Pour compatibilité (mais ends_at = null compte)
  'lifetime',
  null,  -- NULL = jamais d'expiration
  'manual'
FROM auth.users 
WHERE email = 'm.harea@storepilot.ia'
ON CONFLICT (user_id) DO UPDATE 
SET 
  status = 'active',
  plan = 'lifetime',
  ends_at = null,
  source = 'manual',
  updated_at = now();

-- ============================================
-- ÉTAPE 4: Vérification finale
-- ============================================
SELECT 
  '✅ Configuration terminée' as message,
  p.email,
  p.role,
  p.plan as profile_plan,
  p.scans_used,
  p.is_banned,
  p.trial_ends_at,
  s.plan as subscription_plan,
  s.status as subscription_status,
  s.ends_at as subscription_ends_at,
  CASE 
    WHEN p.plan = 'lifetime' AND s.plan = 'lifetime' AND s.status = 'active' 
    THEN '✅ FULL ACCESS - Scans illimités'
    WHEN p.plan = 'lifetime' 
    THEN '⚠️ Profile OK mais subscription à vérifier'
    WHEN s.plan = 'lifetime'
    THEN '⚠️ Subscription OK mais profile à vérifier'
    ELSE '❌ Configuration incorrecte'
  END as access_status
FROM public.profiles p
JOIN public.subscriptions s ON s.user_id = p.user_id
WHERE p.email = 'm.harea@storepilot.ia';

-- ============================================
-- Résultat attendu:
-- ✅ FULL ACCESS - Scans illimités
-- - role: admin (accès panel admin)  
-- - profile_plan: lifetime
-- - subscription_plan: lifetime
-- - subscription_status: active
-- - ends_at: null (ne expire jamais)
-- - is_banned: false
-- - scans_used: 0
-- ============================================
