-- Fix search_path for the new function
CREATE OR REPLACE FUNCTION public.generate_permanent_neverai_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.neverai_id IS NULL THEN
    NEW.neverai_id := 'NVR-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;