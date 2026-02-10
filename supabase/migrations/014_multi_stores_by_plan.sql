-- AXIS - Multi-boutiques selon abonnement
-- Supprime la contrainte "1 boutique max / user".

DROP INDEX IF EXISTS public.stores_one_per_user;
