-- Generated stores history: track every store created via the Store Generator
CREATE TABLE IF NOT EXISTS public.generated_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  brand_color TEXT,
  product_title TEXT NOT NULL,
  product_price NUMERIC(10,2),
  product_image TEXT,
  shopify_product_id BIGINT,
  shop_domain TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_stores_user ON public.generated_stores(user_id, created_at DESC);

-- RLS
ALTER TABLE public.generated_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generated stores"
  ON public.generated_stores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generated stores"
  ON public.generated_stores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated stores"
  ON public.generated_stores FOR DELETE
  USING (auth.uid() = user_id);
