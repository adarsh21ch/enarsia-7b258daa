-- Drop existing UPDATE policy if it exists
DROP POLICY IF EXISTS "Funnel owners can update their price options" ON funnel_price_options;

-- Create proper UPDATE policy for funnel owners
CREATE POLICY "Funnel owners can update their price options"
ON funnel_price_options
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM funnels 
    WHERE funnels.id = funnel_price_options.funnel_id 
      AND funnels.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM funnels 
    WHERE funnels.id = funnel_price_options.funnel_id 
      AND funnels.owner_user_id = auth.uid()
  )
);