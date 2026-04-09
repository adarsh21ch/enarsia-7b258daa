
-- Add is_demo to sheets
ALTER TABLE public.sheets ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;

-- Add onboarding columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_started_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS demo_data_created boolean DEFAULT false;

-- Drop old functions if they exist
DROP FUNCTION IF EXISTS public.setup_onboarding_demo_data(uuid);
DROP FUNCTION IF EXISTS public.cleanup_demo_data(uuid);
DROP FUNCTION IF EXISTS public.setup_new_user_onboarding(uuid);
DROP FUNCTION IF EXISTS public.cleanup_onboarding_demo_data(uuid);

-- Create the comprehensive onboarding setup function
CREATE OR REPLACE FUNCTION public.setup_new_user_onboarding(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_demo_sheet_id uuid;
  v_prospect_ids uuid[] := ARRAY[]::uuid[];
  v_pid uuid;
  v_existing_options int;
  v_cities text[] := ARRAY['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Indore', 'Nagpur', 'Bhopal', 'Surat', 'Kochi', 'Coimbatore', 'Visakhapatnam', 'Patna', 'Guwahati'];
  v_names text[] := ARRAY['Rahul Sharma', 'Priya Mehta', 'Amit Gupta', 'Sunita Yadav', 'Vikram Singh', 'Neha Joshi', 'Ravi Kumar', 'Anjali Tiwari', 'Deepak Verma', 'Pooja Agarwal', 'Suresh Patel', 'Kavita Sharma', 'Manoj Nair', 'Rekha Mishra', 'Arjun Reddy', 'Meena Saxena', 'Kiran Desai', 'Rohit Chauhan', 'Shweta Pandey', 'Nitin Bhatt'];
  v_phones text[] := ARRAY['0000000001', '0000000002', '0000000003', '0000000004', '0000000005', '0000000006', '0000000007', '0000000008', '0000000009', '0000000010', '0000000011', '0000000012', '0000000013', '0000000014', '0000000015', '0000000016', '0000000017', '0000000018', '0000000019', '0000000020'];
  v_funnel_stages text[] := ARRAY['Video Send', 'Not Picked', 'Busy', 'Enrolment', 'Call Back', 'Day 1', 'Not Picked', 'Video Send', 'Interested', 'Day 2', 'Busy', 'Call Back', 'Not Picked', 'Enrolment', 'Day 3', 'Video Send', 'Interested', 'Not Interested', 'Call Back', 'Day 1'];
  i int;
BEGIN
  -- Check if demo data already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = p_user_id AND demo_data_created = true) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'demo_data_already_exists');
  END IF;

  -- 1. Create default custom_options (tags) if user has none
  SELECT COUNT(*) INTO v_existing_options FROM custom_options WHERE user_id = p_user_id;
  
  IF v_existing_options = 0 THEN
    -- Tracking tags (funnel_stage)
    INSERT INTO custom_options (user_id, option_type, option_value, is_active, sort_order, color, is_filter_tag) VALUES
      (p_user_id, 'funnel_stage', 'Day 1',      true, 0, '#3B6FFF', false),
      (p_user_id, 'funnel_stage', 'Day 2',      true, 1, '#6B5FFF', false),
      (p_user_id, 'funnel_stage', 'Day 3',      true, 2, '#8B5CF6', false),
      (p_user_id, 'funnel_stage', 'Video Send', true, 3, '#0EA5E9', false),
      (p_user_id, 'funnel_stage', 'Enrolment',  true, 4, '#22C55E', false);

    -- Personal tags (action_taken)
    INSERT INTO custom_options (user_id, option_type, option_value, is_active, sort_order, color, is_filter_tag) VALUES
      (p_user_id, 'action_taken', 'Not Picked',      true, 0, '#8B5CF6', false),
      (p_user_id, 'action_taken', 'Busy',             true, 1, '#EF4444', false),
      (p_user_id, 'action_taken', 'Call Back',         true, 2, '#F97316', false),
      (p_user_id, 'action_taken', 'Interested',        true, 3, '#22C55E', false),
      (p_user_id, 'action_taken', 'Not Interested',    true, 4, '#6B7280', false);

    -- Prospect status options
    INSERT INTO custom_options (user_id, option_type, option_value, is_active, sort_order, color, is_filter_tag) VALUES
      (p_user_id, 'prospect_status', 'New',       true, 0, '#3B82F6', false),
      (p_user_id, 'prospect_status', 'Active',    true, 1, '#22C55E', false),
      (p_user_id, 'prospect_status', 'Inactive',  true, 2, '#6B7280', false);
  END IF;

  -- 2. Create Demo Sheet
  INSERT INTO sheets (user_id, name, is_demo)
  VALUES (p_user_id, '🎯 Demo Sheet', true)
  RETURNING id INTO v_demo_sheet_id;

  -- 3. Insert 20 demo prospects
  FOR i IN 1..20 LOOP
    INSERT INTO prospects (
      user_id, sheet_id, name, phone, funnel_stage, 
      address, notes, is_demo, sort_order, date_added
    ) VALUES (
      p_user_id, v_demo_sheet_id, v_names[i], v_phones[i], v_funnel_stages[i],
      v_cities[i], 'This is a demo lead. Replace with your real prospects.',
      true, i, now()
    )
    RETURNING id INTO v_pid;
    
    v_prospect_ids := array_append(v_prospect_ids, v_pid);
  END LOOP;

  -- 4. Create demo activity entries
  INSERT INTO activity_logs (user_id, prospect_id, activity_type, description, created_at) VALUES
    (p_user_id, v_prospect_ids[1], 'funnel_stage_change', 'Tagged Rahul Sharma as Video Send', now() - interval '2 hours'),
    (p_user_id, v_prospect_ids[2], 'funnel_stage_change', 'Call attempted to Priya Mehta', now() - interval '3 hours'),
    (p_user_id, v_prospect_ids[4], 'funnel_stage_change', 'Tagged Sunita Yadav as Enrolment', now() - interval '5 hours'),
    (p_user_id, v_prospect_ids[5], 'funnel_stage_change', 'Follow-up scheduled for Vikram Singh', now() - interval '6 hours'),
    (p_user_id, v_prospect_ids[6], 'funnel_stage_change', 'Tagged Neha Joshi as Day 1', now() - interval '1 day');

  -- 5. Update profile
  UPDATE profiles SET
    onboarding_completed = false,
    onboarding_step = 0,
    onboarding_started_at = now(),
    demo_data_created = true
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true, 
    'sheet_id', v_demo_sheet_id,
    'prospect_count', 20
  );
END;
$$;

-- Create cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_onboarding_demo_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_prospects int;
  v_deleted_sheets int;
BEGIN
  -- Delete demo activity logs
  DELETE FROM activity_logs 
  WHERE user_id = p_user_id 
  AND prospect_id IN (SELECT id FROM prospects WHERE user_id = p_user_id AND is_demo = true);

  -- Delete demo prospects
  DELETE FROM prospects WHERE user_id = p_user_id AND is_demo = true;
  GET DIAGNOSTICS v_deleted_prospects = ROW_COUNT;

  -- Delete demo sheets
  DELETE FROM sheets WHERE user_id = p_user_id AND is_demo = true;
  GET DIAGNOSTICS v_deleted_sheets = ROW_COUNT;

  -- Update profile
  UPDATE profiles SET demo_data_created = false WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_prospects', v_deleted_prospects,
    'deleted_sheets', v_deleted_sheets
  );
END;
$$;
