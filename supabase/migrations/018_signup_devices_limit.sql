-- Limit signup to one account per recorded device fingerprint hash.
CREATE TABLE IF NOT EXISTS public.signup_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  device_hash TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signup_devices_user_id ON public.signup_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_signup_devices_created_at ON public.signup_devices(created_at DESC);

ALTER TABLE public.signup_devices ENABLE ROW LEVEL SECURITY;

-- No public access; service role is used by API routes.
