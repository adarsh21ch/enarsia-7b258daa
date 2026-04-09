
-- Function to set up demo data for a new user
CREATE OR REPLACE FUNCTION public.setup_onboarding_demo_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sheet_id uuid;
  v_result jsonb;
BEGIN
  -- Check if demo data already exists for this user
  IF EXISTS (SELECT 1 FROM prospects WHERE user_id = p_user_id AND is_demo = true LIMIT 1) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Demo data already exists');
  END IF;

  -- Create demo sheet
  INSERT INTO sheets (user_id, name)
  VALUES (p_user_id, 'Demo Sheet')
  RETURNING id INTO v_sheet_id;

  -- Create 3 demo leads
  INSERT INTO prospects (user_id, name, phone, sheet_id, is_demo, prospect_status, date_added)
  VALUES
    (p_user_id, 'Rahul Sharma', '9876543210', v_sheet_id, true, 'new', now()),
    (p_user_id, 'Priya Mehta', '8765432109', v_sheet_id, true, 'new', now()),
    (p_user_id, 'Amit Gupta', '7654321098', v_sheet_id, true, 'new', now());

  RETURN jsonb_build_object('success', true, 'sheet_id', v_sheet_id);
END;
$$;

-- Function to clean up demo data after onboarding or after 7 days
CREATE OR REPLACE FUNCTION public.cleanup_demo_data(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete demo leads
  DELETE FROM prospects WHERE user_id = p_user_id AND is_demo = true;
  -- Delete demo sheet if empty
  DELETE FROM sheets WHERE user_id = p_user_id AND name = 'Demo Sheet'
    AND NOT EXISTS (SELECT 1 FROM prospects WHERE sheet_id = sheets.id AND is_demo = false);
END;
$$;
