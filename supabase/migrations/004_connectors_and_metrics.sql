-- StorePilot AI - Connectors (store_integrations) + métriques agrégées (store_metrics_daily)
-- Permet multi-plateforme avec une seule table d'intégrations et une table de métriques unifiée.

-- 1) store_integrations
CREATE TABLE IF NOT EXISTS public.store_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN (
    'shopify', 'woocommerce', 'prestashop', 'bigcommerce', 'magento',
    'wix', 'squarespace', 'opencart', 'ecwid', 'custom', 'other'
  )),
  status TEXT NOT NULL DEFAULT 'not_connected' CHECK (status IN ('not_connected', 'connected', 'error', 'disconnected')),
  credentials_encrypted TEXT,
  scopes TEXT,
  shop_domain TEXT,
  metadata JSONB DEFAULT '{}',
  connected_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_store_integrations_store_id ON public.store_integrations(store_id);
CREATE INDEX IF NOT EXISTS idx_store_integrations_provider ON public.store_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_store_integrations_status ON public.store_integrations(status);

ALTER TABLE public.store_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_integrations_select_own"
  ON public.store_integrations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "store_integrations_insert_own"
  ON public.store_integrations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
  );

CREATE POLICY "store_integrations_update_own"
  ON public.store_integrations FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "store_integrations_delete_own"
  ON public.store_integrations FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
  );

-- 2) store_metrics_daily (agrégats par store / jour / provider)
CREATE TABLE IF NOT EXISTS public.store_metrics_daily (
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  provider TEXT NOT NULL DEFAULT 'scan',
  revenue NUMERIC(14, 2) NOT NULL DEFAULT 0,
  orders_count INT NOT NULL DEFAULT 0,
  refunds NUMERIC(14, 2) NOT NULL DEFAULT 0,
  aov NUMERIC(14, 2),
  new_customers INT NOT NULL DEFAULT 0,
  total_customers INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, day, provider)
);

CREATE INDEX IF NOT EXISTS idx_store_metrics_daily_store_day ON public.store_metrics_daily(store_id, day DESC);

ALTER TABLE public.store_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_metrics_daily_select_own"
  ON public.store_metrics_daily FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

-- Pas de policy INSERT sur store_metrics_daily : seuls les connectors (service_role) écrivent.

-- Trigger updated_at pour store_integrations
CREATE OR REPLACE FUNCTION public.set_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS store_integrations_updated_at ON public.store_integrations;
CREATE TRIGGER store_integrations_updated_at
  BEFORE UPDATE ON public.store_integrations
  FOR EACH ROW EXECUTE PROCEDURE public.set_integrations_updated_at();
