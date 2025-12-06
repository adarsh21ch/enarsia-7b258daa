-- Add new address column
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS address TEXT;

-- Migrate existing city/state data to the new address field
UPDATE public.prospects 
SET address = CASE 
  WHEN city IS NOT NULL AND state IS NOT NULL AND city != '' AND state != '' THEN city || ', ' || state
  WHEN city IS NOT NULL AND city != '' THEN city
  WHEN state IS NOT NULL AND state != '' THEN state
  ELSE NULL
END
WHERE address IS NULL OR address = '';

-- Drop old columns
ALTER TABLE public.prospects DROP COLUMN IF EXISTS city;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS state;