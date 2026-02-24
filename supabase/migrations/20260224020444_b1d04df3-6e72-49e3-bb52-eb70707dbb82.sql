
-- Create video_requests table
CREATE TABLE IF NOT EXISTS public.video_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  youtube_link text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending',
  approved_video_asset_id uuid REFERENCES public.video_assets(id),
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger for status instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_video_request_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be pending, approved, or rejected.', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_video_request_status
  BEFORE INSERT OR UPDATE ON public.video_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_video_request_status();

-- Auto-update updated_at
CREATE TRIGGER trg_update_video_requests_updated_at
  BEFORE UPDATE ON public.video_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_video_assets_updated_at();

-- Enable RLS
ALTER TABLE public.video_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert their own requests
CREATE POLICY "Users can insert own requests"
  ON public.video_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own requests
CREATE POLICY "Users can view own requests"
  ON public.video_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
  ON public.video_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update requests
CREATE POLICY "Admins can update all requests"
  ON public.video_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
