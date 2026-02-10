-- Garantit que l'utilisateur admin@storepilot.ia a le rôle admin (évite 403 sur les API admin).
-- À exécuter après que le compte existe dans Auth (création manuelle ou premier signup).
INSERT INTO public.profiles (user_id, role, email)
SELECT id, 'admin', email FROM auth.users WHERE email = 'admin@storepilot.ia'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin', email = EXCLUDED.email, updated_at = now();
