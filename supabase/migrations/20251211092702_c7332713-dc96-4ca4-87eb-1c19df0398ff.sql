-- Add missing columns for why_need and notes
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS why_need text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS notes text;