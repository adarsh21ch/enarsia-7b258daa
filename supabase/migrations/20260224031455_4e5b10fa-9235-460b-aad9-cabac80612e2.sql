
-- Add live mode columns (using validation trigger instead of CHECK constraints)
ALTER TABLE public.funnels
  ADD COLUMN IF NOT EXISTS is_live_mode boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS live_start_time timestamptz,
  ADD COLUMN IF NOT EXISTS live_end_time timestamptz,
  ADD COLUMN IF NOT EXISTS live_status text DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS live_sync_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS replay_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS live_access_type text DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS live_password text,
  ADD COLUMN IF NOT EXISTS live_disable_pause boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS live_viewer_count integer DEFAULT 0;

-- Validation trigger for live_status
CREATE OR REPLACE FUNCTION public.validate_funnel_live_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.live_status IS NOT NULL AND NEW.live_status NOT IN ('scheduled', 'live', 'ended') THEN
    RAISE EXCEPTION 'Invalid live_status: %. Must be scheduled, live, or ended.', NEW.live_status;
  END IF;
  IF NEW.live_access_type IS NOT NULL AND NEW.live_access_type NOT IN ('open', 'password', 'registration') THEN
    RAISE EXCEPTION 'Invalid live_access_type: %. Must be open, password, or registration.', NEW.live_access_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_funnel_live_fields ON public.funnels;
CREATE TRIGGER trg_validate_funnel_live_fields
  BEFORE INSERT OR UPDATE ON public.funnels
  FOR EACH ROW EXECUTE FUNCTION public.validate_funnel_live_fields();
