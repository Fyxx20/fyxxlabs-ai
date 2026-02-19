-- Mandatory physical image optimization pipeline tables

CREATE TABLE IF NOT EXISTS public.image_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  style TEXT NOT NULL DEFAULT 'style_a' CHECK (style IN ('style_a', 'style_b', 'style_c')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  steps JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_image_jobs_user_created_at
  ON public.image_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_jobs_user_source_style_status
  ON public.image_jobs(user_id, source_url, style, status, created_at DESC);

ALTER TABLE public.image_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own image jobs" ON public.image_jobs;
DROP POLICY IF EXISTS "Users can insert own image jobs" ON public.image_jobs;
DROP POLICY IF EXISTS "Users can update own image jobs" ON public.image_jobs;
CREATE POLICY "Users can read own image jobs"
  ON public.image_jobs FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own image jobs"
  ON public.image_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own image jobs"
  ON public.image_jobs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.image_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.image_jobs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'gallery' CHECK (kind IN ('hero', 'gallery', 'thumb')),
  url TEXT NOT NULL,
  width INT NOT NULL CHECK (width > 0),
  height INT NOT NULL CHECK (height > 0),
  format TEXT NOT NULL CHECK (format IN ('png', 'jpg', 'jpeg', 'webp')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_image_assets_job_created_at
  ON public.image_assets(job_id, created_at DESC);

ALTER TABLE public.image_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own image assets via job" ON public.image_assets;
DROP POLICY IF EXISTS "Users can insert own image assets via job" ON public.image_assets;
CREATE POLICY "Users can read own image assets via job"
  ON public.image_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.image_jobs j
      WHERE j.id = image_assets.job_id
        AND j.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own image assets via job"
  ON public.image_assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.image_jobs j
      WHERE j.id = image_assets.job_id
        AND j.user_id = auth.uid()
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('optimized-images', 'optimized-images', true, 10485760)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit;
