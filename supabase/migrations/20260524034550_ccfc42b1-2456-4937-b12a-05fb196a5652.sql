-- 1. Remove broad anonymous read on form share tokens
DROP POLICY IF EXISTS "nevorai_form_shares_public_read" ON public.nevorai_form_shares;

-- 2. Prevent users from self-assigning paid subscription plans
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;

-- 3. Restrict communities slug-check read to authenticated users
DROP POLICY IF EXISTS "Authenticated can check slug availability" ON public.communities;
CREATE POLICY "Authenticated can check slug availability"
ON public.communities
FOR SELECT
TO authenticated
USING (true);