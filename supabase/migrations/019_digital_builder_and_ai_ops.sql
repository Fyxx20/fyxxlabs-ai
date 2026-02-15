-- FyxxLabs - Digital builder + AI ops schema (idempotent)
-- Step 1: DB schema + migrations only

-- =====================================================
-- 1) generation_jobs (async orchestration + logs)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  job_kind TEXT NOT NULL CHECK (job_kind IN ('physical_create', 'digital_create', 'scan_optimize')),
  source TEXT NOT NULL DEFAULT 'builder' CHECK (source IN ('builder', 'scan', 'api')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  step TEXT,
  progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  input_payload JSONB NOT NULL DEFAULT '{}',
  output_payload JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_created_at
  ON public.generation_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_store_created_at
  ON public.generation_jobs(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status
  ON public.generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_kind
  ON public.generation_jobs(job_kind);

ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own generation jobs" ON public.generation_jobs;
CREATE POLICY "Users can read own generation jobs"
  ON public.generation_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================
-- 2) digital_assets (uploaded digital files)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.digital_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  asset_kind TEXT NOT NULL DEFAULT 'other' CHECK (asset_kind IN ('ebook', 'template', 'course', 'bundle', 'other')),
  title TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes >= 0),
  checksum_sha256 TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private')),
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'ready', 'archived', 'failed')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_digital_assets_user_created_at
  ON public.digital_assets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_digital_assets_store_created_at
  ON public.digital_assets(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_digital_assets_status
  ON public.digital_assets(status);

ALTER TABLE public.digital_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own digital assets" ON public.digital_assets;
DROP POLICY IF EXISTS "Users can insert own digital assets" ON public.digital_assets;
DROP POLICY IF EXISTS "Users can update own digital assets" ON public.digital_assets;
DROP POLICY IF EXISTS "Users can delete own digital assets" ON public.digital_assets;
CREATE POLICY "Users can read own digital assets"
  ON public.digital_assets FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own digital assets"
  ON public.digital_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own digital assets"
  ON public.digital_assets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own digital assets"
  ON public.digital_assets FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 3) digital_deliveries (signed links + delivery logs)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.digital_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.digital_assets(id) ON DELETE CASCADE,
  order_ref TEXT,
  customer_email TEXT NOT NULL,
  signed_url TEXT,
  expires_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  download_count INT NOT NULL DEFAULT 0 CHECK (download_count >= 0),
  max_downloads INT NOT NULL DEFAULT 3 CHECK (max_downloads > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'expired', 'revoked', 'failed')),
  provider_message_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_digital_deliveries_user_created_at
  ON public.digital_deliveries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_digital_deliveries_asset_status
  ON public.digital_deliveries(asset_id, status, created_at DESC);

ALTER TABLE public.digital_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own digital deliveries" ON public.digital_deliveries;
DROP POLICY IF EXISTS "Users can insert own digital deliveries" ON public.digital_deliveries;
DROP POLICY IF EXISTS "Users can update own digital deliveries" ON public.digital_deliveries;
CREATE POLICY "Users can read own digital deliveries"
  ON public.digital_deliveries FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own digital deliveries"
  ON public.digital_deliveries FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own digital deliveries"
  ON public.digital_deliveries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 4) image_optimizations (before/after quality pipeline)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.image_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
  context TEXT NOT NULL CHECK (context IN ('physical_builder', 'digital_builder', 'scan', 'manual')),
  source_image_url TEXT NOT NULL,
  output_image_url TEXT,
  operations JSONB NOT NULL DEFAULT '[]'::jsonb,
  provider TEXT,
  quality_score_before NUMERIC(5,2),
  quality_score_after NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_image_optimizations_user_created_at
  ON public.image_optimizations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_optimizations_store_created_at
  ON public.image_optimizations(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_optimizations_scan_created_at
  ON public.image_optimizations(scan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_optimizations_status
  ON public.image_optimizations(status);

ALTER TABLE public.image_optimizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own image optimizations" ON public.image_optimizations;
DROP POLICY IF EXISTS "Users can insert own image optimizations" ON public.image_optimizations;
DROP POLICY IF EXISTS "Users can update own image optimizations" ON public.image_optimizations;
CREATE POLICY "Users can read own image optimizations"
  ON public.image_optimizations FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own image optimizations"
  ON public.image_optimizations FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own image optimizations"
  ON public.image_optimizations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 5) pricing_explanations (traceable smart pricing)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pricing_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  context TEXT NOT NULL CHECK (context IN ('physical_builder', 'digital_builder', 'scan')),
  product_title TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  source_cost NUMERIC(12,2),
  competitor_low NUMERIC(12,2),
  competitor_avg NUMERIC(12,2),
  competitor_high NUMERIC(12,2),
  suggested_safe NUMERIC(12,2) NOT NULL,
  suggested_optimal NUMERIC(12,2) NOT NULL,
  suggested_aggressive NUMERIC(12,2) NOT NULL,
  min_margin_pct NUMERIC(6,2),
  optimal_margin_pct NUMERIC(6,2),
  psychological_ending TEXT,
  positioning TEXT CHECK (positioning IN ('low', 'mid', 'premium')),
  rationale JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_explanations_user_created_at
  ON public.pricing_explanations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_explanations_store_created_at
  ON public.pricing_explanations(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_explanations_context
  ON public.pricing_explanations(context);

ALTER TABLE public.pricing_explanations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own pricing explanations" ON public.pricing_explanations;
DROP POLICY IF EXISTS "Users can insert own pricing explanations" ON public.pricing_explanations;
CREATE POLICY "Users can read own pricing explanations"
  ON public.pricing_explanations FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pricing explanations"
  ON public.pricing_explanations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 6) Shared updated_at trigger
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_row_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS digital_assets_updated_at ON public.digital_assets;
CREATE TRIGGER digital_assets_updated_at
  BEFORE UPDATE ON public.digital_assets
  FOR EACH ROW EXECUTE PROCEDURE public.set_row_updated_at();

DROP TRIGGER IF EXISTS digital_deliveries_updated_at ON public.digital_deliveries;
CREATE TRIGGER digital_deliveries_updated_at
  BEFORE UPDATE ON public.digital_deliveries
  FOR EACH ROW EXECUTE PROCEDURE public.set_row_updated_at();

-- =====================================================
-- 7) Storage bucket for digital files (private)
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('digital-assets', 'digital-assets', false, 104857600)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit;
