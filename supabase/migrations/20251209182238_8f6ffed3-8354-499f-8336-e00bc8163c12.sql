-- Add color column to custom_options for tag colors
ALTER TABLE public.custom_options 
ADD COLUMN IF NOT EXISTS color text DEFAULT NULL;

-- Create a function to generate permanent NeverAI ID if not exists
CREATE OR REPLACE FUNCTION public.generate_permanent_neverai_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if neverai_id is null (never overwrite existing)
  IF NEW.neverai_id IS NULL THEN
    NEW.neverai_id := 'NVR-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any and recreate
DROP TRIGGER IF EXISTS ensure_neverai_id ON public.profiles;

-- Create trigger to auto-generate NeverAI ID on insert
CREATE TRIGGER ensure_neverai_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_permanent_neverai_id();

-- Update existing profiles that don't have a NeverAI ID
UPDATE public.profiles 
SET neverai_id = 'NVR-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0')
WHERE neverai_id IS NULL;

-- Enable realtime for prospects table (for team sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.prospects;