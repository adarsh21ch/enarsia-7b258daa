
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_seq INTEGER;
  v_neverai_id TEXT;
  v_attempts INTEGER := 0;
  v_max_attempts INTEGER := 10;
  v_default_response_labels JSONB;
  v_default_stage_labels JSONB;
BEGIN
  -- Default Leads Tracking Tags
  -- "Video Send" is a tracking tag (isStageTag: false)
  -- "Enrolment" is the funnel tag (isStageTag: true) AND final target
  -- nonTracking = personal tags visible to user for organizing
  v_default_response_labels := '{
    "tracking": [
      {"name": "Video Send", "isStageTag": false, "isFinalTarget": false},
      {"name": "Enrolment", "isStageTag": true, "isFinalTarget": true}
    ],
    "nonTracking": ["Not Picked", "Busy", "Call Back", "Not Interested"]
  }'::jsonb;
  
  -- Default Stage Tracking Tags (Funnel stages)
  v_default_stage_labels := '{
    "stages": [
      {"name": "Day1", "isFinalTarget": false},
      {"name": "Day2", "isFinalTarget": false},
      {"name": "Day3", "isFinalTarget": true}
    ],
    "nonTracking": []
  }'::jsonb;

  LOOP
    v_attempts := v_attempts + 1;
    v_seq := nextval('leader_code_sequence');
    v_neverai_id := 'NVR' || LPAD(v_seq::TEXT, 6, '0');
    
    BEGIN
      INSERT INTO public.profiles (
        user_id, 
        neverai_id, 
        leader_code_seq, 
        email,
        response_labels,
        stage_labels
      )
      VALUES (
        NEW.id, 
        v_neverai_id, 
        v_seq, 
        LOWER(TRIM(NEW.email)),
        v_default_response_labels,
        v_default_stage_labels
      );
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        IF v_attempts >= v_max_attempts THEN
          RAISE EXCEPTION 'Failed to generate unique NeverAI ID after % attempts', v_max_attempts;
        END IF;
        CONTINUE;
    END;
  END LOOP;
  
  RETURN NEW;
END;
$$;
