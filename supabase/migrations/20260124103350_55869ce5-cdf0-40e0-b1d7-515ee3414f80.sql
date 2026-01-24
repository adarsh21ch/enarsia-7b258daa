-- Drop existing function first (it returns TABLE, we want TEXT)
DROP FUNCTION IF EXISTS public.nevorai_create_share_token(UUID, TIMESTAMPTZ);

-- ════════════════════════════════════════════════════════════════════════════
-- CREATE SHARE TOKEN RPC FUNCTION (Returns TEXT token directly)
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.nevorai_create_share_token(
  p_form_id UUID,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Verify user owns the form
  IF NOT EXISTS (
    SELECT 1 FROM nevorai_forms 
    WHERE id = p_form_id AND owner_user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Form not found or access denied';
  END IF;
  
  -- Generate unique token (32 character hex string)
  v_token := encode(gen_random_bytes(16), 'hex');
  
  -- Insert the share token
  INSERT INTO nevorai_form_shares (form_id, token, expires_at, created_by)
  VALUES (p_form_id, v_token, p_expires_at, v_user_id);
  
  RETURN v_token;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES FOR nevorai_form_shares TABLE
-- ════════════════════════════════════════════════════════════════════════════

-- Enable RLS if not already enabled
ALTER TABLE nevorai_form_shares ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Form owners can manage shares" ON nevorai_form_shares;
DROP POLICY IF EXISTS "Form owners can view shares" ON nevorai_form_shares;
DROP POLICY IF EXISTS "Form owners can create shares" ON nevorai_form_shares;
DROP POLICY IF EXISTS "Form owners can delete shares" ON nevorai_form_shares;
DROP POLICY IF EXISTS "Owners can manage form shares" ON nevorai_form_shares;

-- Allow form owners to view their form's share tokens
CREATE POLICY "Form owners can view shares"
ON nevorai_form_shares
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM nevorai_forms
    WHERE nevorai_forms.id = nevorai_form_shares.form_id
    AND nevorai_forms.owner_user_id = auth.uid()
  )
);

-- Allow form owners to create share tokens (direct insert)
CREATE POLICY "Form owners can create shares"
ON nevorai_form_shares
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM nevorai_forms
    WHERE nevorai_forms.id = form_id
    AND nevorai_forms.owner_user_id = auth.uid()
  )
);

-- Allow form owners to delete their share tokens
CREATE POLICY "Form owners can delete shares"
ON nevorai_form_shares
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM nevorai_forms
    WHERE nevorai_forms.id = nevorai_form_shares.form_id
    AND nevorai_forms.owner_user_id = auth.uid()
  )
);