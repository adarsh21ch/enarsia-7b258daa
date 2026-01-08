-- Step 2: Update RLS on prospects Table
-- Drop existing SELECT policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own prospects" ON public.prospects;
DROP POLICY IF EXISTS "Leaders can view direct report prospects" ON public.prospects;

-- Create consolidated policy allowing own rows OR leader viewing member rows
CREATE POLICY "Users can view own or leader can view member prospects"
ON public.prospects
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.can_leader_view_member(auth.uid(), user_id)
);

-- Step 3: Update RLS on tracking_overrides Table
-- Drop existing SELECT policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own overrides" ON public.tracking_overrides;
DROP POLICY IF EXISTS "Leaders can view direct report tracking overrides" ON public.tracking_overrides;

-- Create consolidated policy allowing own rows OR leader viewing member rows
CREATE POLICY "Users can view own or leader can view member overrides"
ON public.tracking_overrides
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.can_leader_view_member(auth.uid(), target_user_id)
);