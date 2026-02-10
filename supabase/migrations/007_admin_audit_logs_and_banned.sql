-- StorePilot AI - Admin audit logs + is_banned sur profiles
-- Ne jamais exposer les secrets ; audit uniquement pour les actions admin.

-- 1) profiles: colonne is_banned (soft ban)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned) WHERE is_banned = true;

-- 2) admin_audit_logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'store', 'subscription', 'scan', 'integration', 'profile')),
  target_id TEXT,
  before_state JSONB,
  after_state JSONB,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id ON public.admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON public.admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent lire les logs (via policy avec is_admin)
CREATE POLICY "Admins can read admin_audit_logs"
  ON public.admin_audit_logs FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Insert uniquement côté serveur (service_role ou trigger) ; pas de policy INSERT pour anon
-- Les API admin utilisent service_role pour insérer.
