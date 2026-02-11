-- Add language column to generated_stores for history display
ALTER TABLE public.generated_stores ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'fr';
