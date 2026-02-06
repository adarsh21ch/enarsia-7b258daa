
-- Drop old function signature
DROP FUNCTION IF EXISTS public.nevorai_submit_form(text, jsonb, jsonb, text);

-- ── 1. ALTER nevorai_forms ──────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nevorai_forms' AND column_name='access_mode') THEN
    ALTER TABLE public.nevorai_forms ADD COLUMN access_mode text NOT NULL DEFAULT 'public';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nevorai_forms' AND column_name='allow_multiple_submissions') THEN
    ALTER TABLE public.nevorai_forms ADD COLUMN allow_multiple_submissions boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nevorai_forms' AND column_name='collect_utm') THEN
    ALTER TABLE public.nevorai_forms ADD COLUMN collect_utm boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nevorai_forms' AND column_name='lead_mapping') THEN
    ALTER TABLE public.nevorai_forms ADD COLUMN lead_mapping jsonb DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nevorai_forms' AND column_name='confirmation_message') THEN
    ALTER TABLE public.nevorai_forms ADD COLUMN confirmation_message text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nevorai_forms' AND column_name='max_submissions') THEN
    ALTER TABLE public.nevorai_forms ADD COLUMN max_submissions integer DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nevorai_forms' AND column_name='embed_enabled') THEN
    ALTER TABLE public.nevorai_forms ADD COLUMN embed_enabled boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ── 2. ALTER nevorai_form_fields ────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nevorai_form_fields' AND column_name='placeholder') THEN
    ALTER TABLE public.nevorai_form_fields ADD COLUMN placeholder text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nevorai_form_fields' AND column_name='validation') THEN
    ALTER TABLE public.nevorai_form_fields ADD COLUMN validation jsonb DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nevorai_form_fields' AND column_name='conditional_logic') THEN
    ALTER TABLE public.nevorai_form_fields ADD COLUMN conditional_logic jsonb DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nevorai_form_fields' AND column_name='description') THEN
    ALTER TABLE public.nevorai_form_fields ADD COLUMN description text DEFAULT NULL;
  END IF;
END $$;

-- ── 3. ALTER nevorai_form_submissions ───────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nevorai_form_submissions' AND column_name='source') THEN
    ALTER TABLE public.nevorai_form_submissions ADD COLUMN source text NOT NULL DEFAULT 'direct';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nevorai_form_submissions' AND column_name='utm_source') THEN
    ALTER TABLE public.nevorai_form_submissions ADD COLUMN utm_source text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nevorai_form_submissions' AND column_name='utm_medium') THEN
    ALTER TABLE public.nevorai_form_submissions ADD COLUMN utm_medium text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nevorai_form_submissions' AND column_name='utm_campaign') THEN
    ALTER TABLE public.nevorai_form_submissions ADD COLUMN utm_campaign text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nevorai_form_submissions' AND column_name='utm_content') THEN
    ALTER TABLE public.nevorai_form_submissions ADD COLUMN utm_content text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nevorai_form_submissions' AND column_name='lead_created') THEN
    ALTER TABLE public.nevorai_form_submissions ADD COLUMN lead_created boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nevorai_form_submissions' AND column_name='lead_id') THEN
    ALTER TABLE public.nevorai_form_submissions ADD COLUMN lead_id uuid DEFAULT NULL;
  END IF;
END $$;

-- ── 4. CREATE nevorai_form_analytics_daily ──────────────────────────
CREATE TABLE IF NOT EXISTS public.nevorai_form_analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.nevorai_forms(id) ON DELETE CASCADE,
  date date NOT NULL,
  submission_count integer NOT NULL DEFAULT 0,
  source_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(form_id, date)
);

ALTER TABLE public.nevorai_form_analytics_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nevorai_form_analytics_owner_read ON public.nevorai_form_analytics_daily;
CREATE POLICY nevorai_form_analytics_owner_read ON public.nevorai_form_analytics_daily
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM nevorai_forms f WHERE f.id = form_id AND f.owner_user_id = auth.uid())
  );

DROP POLICY IF EXISTS nevorai_form_analytics_system_write ON public.nevorai_form_analytics_daily;
CREATE POLICY nevorai_form_analytics_system_write ON public.nevorai_form_analytics_daily
  FOR ALL USING (
    EXISTS (SELECT 1 FROM nevorai_forms f WHERE f.id = form_id AND f.owner_user_id = auth.uid())
  );

-- ── 5. INDEXES ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_nevorai_submissions_source ON public.nevorai_form_submissions(source);
CREATE INDEX IF NOT EXISTS idx_nevorai_submissions_created_date ON public.nevorai_form_submissions(form_id, created_at);
CREATE INDEX IF NOT EXISTS idx_nevorai_analytics_form_date ON public.nevorai_form_analytics_daily(form_id, date);
CREATE INDEX IF NOT EXISTS idx_nevorai_submissions_lead ON public.nevorai_form_submissions(lead_id) WHERE lead_id IS NOT NULL;

-- ── 6. NEW nevorai_submit_form RPC ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.nevorai_submit_form(
  p_form_id uuid DEFAULT NULL,
  p_token text DEFAULT NULL,
  p_share_token text DEFAULT NULL,
  p_answers jsonb DEFAULT '[]'::jsonb,
  p_answers_json jsonb DEFAULT NULL,
  p_attachments_json jsonb DEFAULT '[]'::jsonb,
  p_submitter_name text DEFAULT NULL,
  p_submitter_email text DEFAULT NULL,
  p_source text DEFAULT 'direct',
  p_utm_source text DEFAULT NULL,
  p_utm_medium text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL,
  p_utm_content text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission_id uuid;
  v_share_id uuid;
  v_resolved_form_id uuid;
  v_is_public boolean;
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
  
  SELECT is_public INTO v_is_public FROM nevorai_forms WHERE id = v_resolved_form_id;
  IF v_is_public IS NULL OR v_is_public = false THEN
    RAISE EXCEPTION 'Form not found or not public';
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
  
  RETURN jsonb_build_object('submission_id', v_submission_id, 'success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.nevorai_submit_form(uuid, text, text, jsonb, jsonb, jsonb, text, text, text, text, text, text, text) TO anon;
