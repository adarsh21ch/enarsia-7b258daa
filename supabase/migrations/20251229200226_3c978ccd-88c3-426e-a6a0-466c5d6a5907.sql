-- Create batch_reorder_prospects function for efficient bulk reordering
CREATE OR REPLACE FUNCTION public.batch_reorder_prospects(
  p_user_id UUID,
  p_updates JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate user owns all prospects being updated
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_updates) u
    LEFT JOIN prospects p ON p.id = (u->>'id')::UUID
    WHERE p.user_id IS NULL OR p.user_id != p_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot reorder prospects belonging to another user';
  END IF;

  -- Perform batch update
  UPDATE prospects p
  SET 
    sort_order = (u->>'sort_order')::INT,
    updated_at = now()
  FROM jsonb_array_elements(p_updates) u
  WHERE p.id = (u->>'id')::UUID
    AND p.user_id = p_user_id;
    
  RETURN TRUE;
END;
$$;