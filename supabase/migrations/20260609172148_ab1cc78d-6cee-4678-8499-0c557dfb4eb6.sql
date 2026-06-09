
CREATE OR REPLACE FUNCTION public.seed_demo_data_for_user(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_already boolean;
  v_enabled boolean;
  v_sheet_id uuid;
  v_signup_noon timestamptz;
  v_idx int := 0;
  v_count int := 0;
  v_master record;
  v_action text;
  v_stage text;
  v_personal text;
  v_action_at timestamptz;
  v_funnel_at timestamptz;
  v_prospect_id uuid;
  v_today date;
  v_total_leads int := 0;
  v_total_responses int := 0;
  v_response_tags jsonb := '{}'::jsonb;
  v_stage_tags jsonb := '{}'::jsonb;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id
     AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'teamnevorai@gmail.com') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT demo_data_created INTO v_already FROM public.profiles WHERE user_id = p_user_id;
  IF v_already IS NULL THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'no_profile');
  END IF;
  IF v_already = true THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'already_seeded');
  END IF;

  SELECT COALESCE(is_enabled,false) INTO v_enabled FROM public.admin_feature_flags WHERE feature_key='demo_leads_enabled';
  IF NOT COALESCE(v_enabled,false) THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'disabled');
  END IF;

  INSERT INTO public.custom_options(user_id, option_type, option_value, sort_order, is_filter_tag, is_active)
  VALUES
    (p_user_id,'action_taken','Video Send',1,false,true),
    (p_user_id,'action_taken','Registration',2,true,true),
    (p_user_id,'funnel_stage','Day 1',1,false,true),
    (p_user_id,'funnel_stage','Day 2',2,false,true),
    (p_user_id,'funnel_stage','Day 3',3,false,true),
    (p_user_id,'personal_tag','Not Picked',1,false,true),
    (p_user_id,'personal_tag','Callback',2,false,true),
    (p_user_id,'personal_tag','Busy',3,false,true),
    (p_user_id,'personal_tag','Not Interested',4,false,true),
    (p_user_id,'personal_tag','Marketing Plan Video',5,false,true),
    (p_user_id,'personal_tag','Product Training Video',6,false,true)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.sheets(user_id, name, is_demo)
  VALUES (p_user_id, 'Demo Leads', true)
  RETURNING id INTO v_sheet_id;

  v_signup_noon := (date_trunc('day', (now() AT TIME ZONE 'Asia/Kolkata')) + interval '12 hours') AT TIME ZONE 'Asia/Kolkata';

  FOR v_master IN
    SELECT * FROM public.demo_leads_master ORDER BY sort_order, created_at LIMIT 50
  LOOP
    v_idx := v_idx + 1;
    v_action := NULL; v_stage := NULL; v_personal := NULL; v_funnel_at := NULL;
    v_action_at := v_signup_noon + (interval '60 minutes' * (v_idx - 1) / 50.0);

    IF v_idx BETWEEN 1 AND 10 THEN
      v_action := 'Video Send';
    ELSIF v_idx BETWEEN 11 AND 20 THEN
      v_action := 'Registration';
      v_funnel_at := v_action_at + interval '10 seconds';
      IF v_idx <= 15 THEN v_stage := 'Day 1';
      ELSIF v_idx <= 18 THEN v_stage := 'Day 2';
      ELSE v_stage := 'Day 3';
      END IF;
    ELSIF v_idx BETWEEN 21 AND 35 THEN v_personal := 'Not Picked';
    ELSIF v_idx BETWEEN 36 AND 42 THEN v_personal := 'Busy';
    ELSIF v_idx BETWEEN 43 AND 47 THEN v_personal := 'Callback';
    ELSE v_personal := 'Not Interested';
    END IF;

    INSERT INTO public.prospects(
      user_id, sheet_id, name, phone, phone2, email, age_or_dob, gender, address, state, profession,
      action_taken, action_taken_at, funnel_stage, funnel_stage_at,
      personal_tags, is_demo, date_added
    ) VALUES (
      p_user_id, v_sheet_id, v_master.name, v_master.phone, v_master.phone2, v_master.email,
      v_master.age_or_dob, v_master.gender, v_master.address, v_master.state, v_master.profession,
      v_action, v_action_at, v_stage, v_funnel_at,
      CASE WHEN v_personal IS NOT NULL THEN ARRAY[v_personal] ELSE NULL END,
      true, v_action_at
    ) RETURNING id INTO v_prospect_id;

    INSERT INTO public.activity_logs(user_id, prospect_id, activity_type, description, new_value, created_at)
    VALUES (
      p_user_id, v_prospect_id,
      CASE WHEN v_personal IS NOT NULL THEN 'personal_tag'
           WHEN v_action IS NOT NULL THEN 'tag_change'
           ELSE 'stage_change' END,
      'Tagged as ' || COALESCE(v_action, v_personal, v_stage),
      COALESCE(v_action, v_personal),
      v_action_at
    );

    IF v_stage IS NOT NULL THEN
      INSERT INTO public.activity_logs(user_id, prospect_id, activity_type, description, new_value, created_at)
      VALUES (p_user_id, v_prospect_id, 'stage_change', 'Stage set to ' || v_stage, v_stage, v_funnel_at);
    END IF;

    v_count := v_count + 1;
  END LOOP;

  INSERT INTO public.user_daily_tasks(user_id, title, is_active, sort_order)
  VALUES
    (p_user_id,'Attend morning team meeting',true,1),
    (p_user_id,'Make 30 calls',true,2),
    (p_user_id,'Do your follow-ups',true,3),
    (p_user_id,'Attend night team meeting',true,4),
    (p_user_id,'Post 1 Instagram reel / post',true,5)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.todos(user_id, title, completed)
  VALUES (p_user_id, '✅ This is your To-Do list — write what you want to get done today here. (Tick this box once you''ve read it!)', false);

  -- === NEW: Seed today's tracking snapshot from the demo leads ===
  -- Tracking tab reads from personal_snapshot_v2; without this it stays empty
  -- until the user manually tags a real lead.
  v_today := (now() AT TIME ZONE 'Asia/Kolkata')::date;

  SELECT
    count(*),
    count(*) FILTER (WHERE action_taken IS NOT NULL),
    COALESCE(jsonb_object_agg(action_taken, action_count) FILTER (WHERE action_taken IS NOT NULL), '{}'::jsonb),
    COALESCE(jsonb_object_agg(funnel_stage, stage_count) FILTER (WHERE funnel_stage IS NOT NULL), '{}'::jsonb)
  INTO v_total_leads, v_total_responses, v_response_tags, v_stage_tags
  FROM (
    SELECT
      p.action_taken,
      p.funnel_stage,
      count(*) OVER (PARTITION BY p.action_taken) AS action_count,
      count(*) OVER (PARTITION BY p.funnel_stage) AS stage_count,
      row_number() OVER (PARTITION BY p.action_taken ORDER BY p.id) AS r_action,
      row_number() OVER (PARTITION BY p.funnel_stage ORDER BY p.id) AS r_stage
    FROM public.prospects p
    WHERE p.user_id = p_user_id AND p.is_demo = true AND p.sheet_id = v_sheet_id
  ) s
  WHERE (action_taken IS NULL OR r_action = 1)
    AND (funnel_stage IS NULL OR r_stage = 1);

  -- Recompute totals properly (the windowed dedupe above gave us per-tag counts only)
  SELECT count(*), count(*) FILTER (WHERE action_taken IS NOT NULL)
  INTO v_total_leads, v_total_responses
  FROM public.prospects
  WHERE user_id = p_user_id AND is_demo = true AND sheet_id = v_sheet_id;

  INSERT INTO public.personal_snapshot_v2(
    user_id, date, source, total_leads, total_responses, response_tags, stage_tags
  ) VALUES (
    p_user_id, v_today, 'APPLICATION'::snapshot_source,
    v_total_leads, v_total_responses, v_response_tags, v_stage_tags
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    total_leads = EXCLUDED.total_leads,
    total_responses = EXCLUDED.total_responses,
    response_tags = EXCLUDED.response_tags,
    stage_tags = EXCLUDED.stage_tags,
    source = EXCLUDED.source;

  UPDATE public.profiles
     SET demo_data_created = true,
         demo_notice_seen = COALESCE(demo_notice_seen, false)
   WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'seeded', v_count, 'sheet_id', v_sheet_id);
END;
$function$;
