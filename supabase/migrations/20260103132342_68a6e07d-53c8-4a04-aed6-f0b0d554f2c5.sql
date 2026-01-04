-- Add updated_at triggers for new tables
CREATE TRIGGER update_ac_profiles_updated_at 
  BEFORE UPDATE ON public.ac_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ac_join_requests_updated_at 
  BEFORE UPDATE ON public.ac_join_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ac_join_requests_upline ON public.ac_join_requests(upline_user_id, status);
CREATE INDEX IF NOT EXISTS idx_ac_join_requests_user ON public.ac_join_requests(user_id, status);

-- Backfill receiver_user_id from user_id for existing notifications
UPDATE public.ac_notifications 
SET receiver_user_id = user_id 
WHERE receiver_user_id IS NULL AND user_id IS NOT NULL;