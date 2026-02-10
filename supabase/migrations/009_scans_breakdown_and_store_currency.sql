-- Scans: colonnes pour breakdown, priority_action, checklist, confidence, mode, pages, raw, error_code
ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'playwright',
  ADD COLUMN IF NOT EXISTS pages JSONB,
  ADD COLUMN IF NOT EXISTS breakdown JSONB,
  ADD COLUMN IF NOT EXISTS priority_action JSONB,
  ADD COLUMN IF NOT EXISTS checklist JSONB,
  ADD COLUMN IF NOT EXISTS confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS raw JSONB,
  ADD COLUMN IF NOT EXISTS error_code TEXT;

-- Stores: currency (nullable)
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS currency TEXT;

-- store_integrations: ajouter shopware au check provider si pas déjà présent (extension manuelle si nécessaire)
-- La table 004 a déjà les providers; on ne modifie pas le CHECK pour éviter erreur. Shopware peut être ajouté via ALTER si besoin.
