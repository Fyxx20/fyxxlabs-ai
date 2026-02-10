-- Scans: progression en temps réel (progress %, step, debug)
ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS progress INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS step TEXT,
  ADD COLUMN IF NOT EXISTS debug JSONB;

COMMENT ON COLUMN public.scans.progress IS '0-100';
COMMENT ON COLUMN public.scans.step IS 'QUEUED|FETCH_HOME|DISCOVER_PAGES|EXTRACT|SCORE|AI_SUMMARY|DONE';
COMMENT ON COLUMN public.scans.debug IS 'Données techniques en cas d''échec';

-- Journal des événements par scan (logs UI)
CREATE TABLE IF NOT EXISTS public.scan_events (
  id BIGSERIAL PRIMARY KEY,
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warn', 'error', 'metric')),
  message TEXT NOT NULL,
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_scan_events_scan_id_ts ON public.scan_events(scan_id, ts DESC);

ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;

-- Lecture : utilisateur peut voir les events des scans de ses boutiques
CREATE POLICY "Users can read scan_events of own stores"
  ON public.scan_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scans s
      JOIN public.stores st ON st.id = s.store_id
      WHERE s.id = scan_events.scan_id AND st.user_id = auth.uid()
    )
  );

-- Insert : uniquement service_role (backend)
-- Pas de policy INSERT pour anon/authenticated → seul le service role peut insérer
