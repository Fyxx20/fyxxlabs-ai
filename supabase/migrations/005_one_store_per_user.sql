-- StorePilot AI - 1 store max par user (MVP)
-- Empêche les créations multiples de boutiques.

CREATE UNIQUE INDEX IF NOT EXISTS stores_one_per_user
ON public.stores(user_id);
