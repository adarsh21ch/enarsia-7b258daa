-- Add RLS policy for leaders to view their downline
CREATE POLICY "Leaders can view their downline"
ON public.profiles FOR SELECT
USING (
  allow_leader_to_view = true 
  AND is_in_downline(auth.uid(), user_id)
);