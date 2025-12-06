-- Add instagram field to prospects table
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS instagram text;

-- Add profession field to prospects table
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS profession text;