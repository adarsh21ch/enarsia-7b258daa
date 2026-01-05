-- Create the normalize_leader_id function
CREATE OR REPLACE FUNCTION public.normalize_leader_id(id TEXT)
RETURNS TEXT AS $$
DECLARE
  num_part TEXT;
  num_val INTEGER;
BEGIN
  IF id IS NULL OR TRIM(id) = '' THEN RETURN NULL; END IF;
  
  -- Extract just the numeric portion
  num_part := regexp_replace(id, '[^0-9]', '', 'g');
  
  IF num_part = '' OR num_part IS NULL THEN
    -- Fallback for non-numeric IDs (keep as uppercase trimmed)
    RETURN UPPER(TRIM(id));
  END IF;
  
  num_val := num_part::INTEGER;
  -- Return as NVR + 6-digit zero-padded number (no dash)
  RETURN 'NVR' || LPAD(num_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;