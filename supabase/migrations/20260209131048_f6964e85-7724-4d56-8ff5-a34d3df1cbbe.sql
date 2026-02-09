-- Update nevorai_submit_form to check is_accepting and close_date
CREATE OR REPLACE FUNCTION public.nevorai_submit_form(
  p_form_id uuid DEFAULT NULL,
  p_token text DEFAULT NULL,
  p_share_token text DEFAULT NULL,
  p_submitter_name text DEFAULT NULL,
  p_submitter_email text DEFAULT NULL,
  p_answers jsonb DEFAULT NULL,
  p_answers_json jsonb DEFAULT NULL,
  p_attachments_json jsonb DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_utm_source text DEFAULT NULL,
  p_utm_medium text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL,
  p_utm_content text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_submission_id uuid;
  v_share_id uuid;
  v_resolved_form_id uuid;
  v_is_public boolean;
  v_is_accepting boolean;
  v_close_date timestamptz;
  v_answer jsonb;
  v_attachment jsonb;
  v_answers_data jsonb;
BEGIN
  v_resolved_form_id := p_form_id;
  
  IF v_resolved_form_id IS NULL AND (p_token IS NOT NULL OR p_share_token IS NOT NULL) THEN
    SELECT s.form_id, s.id INTO v_resolved_form_id, v_share_id
    FROM nevorai_form_shares s
    WHERE s.token = COALESCE(p_token, p_share_token)
    LIMIT 1;
  END IF;
  
  IF v_resolved_form_id IS NULL THEN
    RAISE EXCEPTION 'Form not found';
  END IF;
  
  SELECT is_public, is_accepting, close_date 
  INTO v_is_public, v_is_accepting, v_close_date 
  FROM nevorai_forms WHERE id = v_resolved_form_id;

  IF v_is_public IS NULL OR v_is_public = false THEN
    RAISE EXCEPTION 'Form not found or not public';
  END IF;

  -- Check if form is accepting responses
  IF v_is_accepting = false THEN
    RETURN json_build_object('success', false, 'error', 'This form is no longer accepting responses.');
  END IF;

  -- Check if form has passed its close date
  IF v_close_date IS NOT NULL AND v_close_date < now() THEN
    RETURN json_build_object('success', false, 'error', 'This form has been closed and is no longer accepting responses.');
  END IF;
  
  IF v_share_id IS NULL AND (p_token IS NOT NULL OR p_share_token IS NOT NULL) THEN
    SELECT id INTO v_share_id FROM nevorai_form_shares
    WHERE token = COALESCE(p_token, p_share_token) LIMIT 1;
  END IF;
  
  v_submission_id := gen_random_uuid();
  INSERT INTO nevorai_form_submissions (
    id, form_id, share_id, submitter_user_id,
    submitter_name, submitter_email,
    source, utm_source, utm_medium, utm_campaign, utm_content
  )
  VALUES (
    v_submission_id, v_resolved_form_id, v_share_id, NULL,
    p_submitter_name, p_submitter_email,
    COALESCE(p_source, 'direct'),
    p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content
  );
  
  v_answers_data := COALESCE(p_answers_json, p_answers);
  
  FOR v_answer IN SELECT * FROM jsonb_array_elements(v_answers_data)
  LOOP
    INSERT INTO nevorai_submission_answers (
      submission_id, field_id, field_key, value, value_json
    ) VALUES (
      v_submission_id,
      (v_answer->>'field_id')::uuid,
      v_answer->>'field_key',
      v_answer->>'value',
      CASE WHEN v_answer ? 'value_json' THEN v_answer->'value_json' ELSE NULL END
    );
  END LOOP;
  
  IF p_attachments_json IS NOT NULL AND jsonb_array_length(p_attachments_json) > 0 THEN
    FOR v_attachment IN SELECT * FROM jsonb_array_elements(p_attachments_json)
    LOOP
      INSERT INTO nevorai_submission_attachments (
        submission_id, field_id, storage_path, content_type, size
      ) VALUES (
        v_submission_id,
        (v_attachment->>'field_id')::uuid,
        v_attachment->>'storage_path',
        v_attachment->>'content_type',
        (v_attachment->>'size')::bigint
      );
    END LOOP;
  END IF;
  
  INSERT INTO nevorai_form_analytics_daily (form_id, date, submission_count, source_breakdown)
  VALUES (
    v_resolved_form_id,
    CURRENT_DATE,
    1,
    jsonb_build_object(COALESCE(p_source, 'direct'), 1)
  )
  ON CONFLICT (form_id, date) DO UPDATE SET
    submission_count = nevorai_form_analytics_daily.submission_count + 1,
    source_breakdown = (
      SELECT jsonb_object_agg(key, COALESCE((nevorai_form_analytics_daily.source_breakdown->>key)::int, 0) + COALESCE((new_val->>key)::int, 0))
      FROM jsonb_each_text(
        nevorai_form_analytics_daily.source_breakdown || jsonb_build_object(COALESCE(p_source, 'direct'), 1)
      ) AS t(key, val),
      LATERAL (SELECT jsonb_build_object(COALESCE(p_source, 'direct'), 1) AS new_val) sq
    );
  
  RETURN json_build_object('submission_id', v_submission_id, 'success', true);
END;
$function$;

-- Update nevorai_get_form_by_token to return is_accepting and close_date
CREATE OR REPLACE FUNCTION public.nevorai_get_form_by_token(p_token text)
RETURNS TABLE(form_id uuid, share_id uuid, title text, description text, owner_user_id uuid, is_expired boolean, fields jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_share RECORD;
    v_form RECORD;
    v_is_accepting boolean;
    v_close_date timestamptz;
BEGIN
    -- Get share info
    SELECT s.id, s.form_id, s.expires_at INTO v_share
    FROM nevorai_form_shares s
    WHERE s.token = p_token
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired share link';
    END IF;

    -- Check expiry
    IF v_share.expires_at IS NOT NULL AND v_share.expires_at < now() THEN
        RETURN QUERY SELECT 
            v_share.form_id,
            v_share.id,
            NULL::TEXT,
            NULL::TEXT,
            NULL::UUID,
            true,
            NULL::JSONB;
        RETURN;
    END IF;

    -- Get form details
    SELECT f.id, f.title, f.description, f.owner_user_id, f.is_accepting, f.close_date 
    INTO v_form
    FROM nevorai_forms f
    WHERE f.id = v_share.form_id AND f.is_public = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Form not found or not public';
    END IF;

    -- Check if form is closed (manually or by date)
    v_is_accepting := v_form.is_accepting;
    v_close_date := v_form.close_date;
    
    IF v_is_accepting = false OR (v_close_date IS NOT NULL AND v_close_date < now()) THEN
        RETURN QUERY SELECT 
            v_form.id,
            v_share.id,
            v_form.title,
            v_form.description,
            v_form.owner_user_id,
            true,  -- is_expired = true (form is closed)
            NULL::JSONB;
        RETURN;
    END IF;

    -- Return form with fields
    RETURN QUERY SELECT 
        v_form.id,
        v_share.id,
        v_form.title,
        v_form.description,
        v_form.owner_user_id,
        false,
        (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', ff.id,
                    'field_key', ff.field_key,
                    'label', ff.label,
                    'field_type', ff.field_type,
                    'required', ff.required,
                    'options', ff.options,
                    'position', ff.position
                ) ORDER BY ff.position
            ), '[]'::jsonb)
            FROM nevorai_form_fields ff
            WHERE ff.form_id = v_form.id
        );
END;
$function$;