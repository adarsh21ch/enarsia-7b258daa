-- ════════════════════════════════════════════════════════════════════════════
-- NEVORAI FORMS - COMPLETE DATABASE FIX
-- ════════════════════════════════════════════════════════════════════════════

-- STEP 1: Enable pgcrypto extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- STEP 2: Create a public wrapper for gen_random_bytes
CREATE OR REPLACE FUNCTION public.gen_random_bytes(n integer)
RETURNS bytea
LANGUAGE sql STABLE
AS $$ SELECT extensions.gen_random_bytes(n); $$;

-- STEP 3: Create a public wrapper for gen_random_uuid (if needed)
CREATE OR REPLACE FUNCTION public.gen_random_uuid()
RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT extensions.gen_random_uuid(); $$;

-- ════════════════════════════════════════════════════════════════════════════
-- INDEXES FOR PERFORMANCE
-- ════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_nevorai_forms_owner ON public.nevorai_forms(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_nevorai_form_fields_form ON public.nevorai_form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_nevorai_form_shares_form ON public.nevorai_form_shares(form_id);
CREATE INDEX IF NOT EXISTS idx_nevorai_form_shares_token ON public.nevorai_form_shares(token);
CREATE INDEX IF NOT EXISTS idx_nevorai_form_submissions_form ON public.nevorai_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_nevorai_submission_answers_submission ON public.nevorai_submission_answers(submission_id);

-- ════════════════════════════════════════════════════════════════════════════
-- RPC FUNCTIONS (used by frontend)
-- ════════════════════════════════════════════════════════════════════════════

-- Function to get form by share token (with fields) - UPDATED RETURN TYPE
CREATE OR REPLACE FUNCTION public.nevorai_get_form_by_token(p_token text)
RETURNS TABLE(form_id uuid, share_id uuid, title text, description text, owner_user_id uuid, is_expired boolean, fields jsonb)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_share RECORD;
    v_form RECORD;
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
    SELECT f.id, f.title, f.description, f.owner_user_id INTO v_form
    FROM nevorai_forms f
    WHERE f.id = v_share.form_id AND f.is_public = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Form not found or not public';
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
$$;

-- Function to submit a form (atomic) - UPDATED RETURN TYPE
CREATE OR REPLACE FUNCTION public.nevorai_submit_form(
    p_token text,
    p_answers_json jsonb,
    p_attachments_json jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE(submission_id uuid, success boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_share_id uuid;
    v_form_id uuid;
    v_submission_id uuid;
    v_user_id uuid;
    v_user_email text;
    v_answer jsonb;
    v_attachment jsonb;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Get user email from auth.users
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

    -- Get share and form info
    SELECT s.id, s.form_id INTO v_share_id, v_form_id
    FROM nevorai_form_shares s
    JOIN nevorai_forms f ON f.id = s.form_id
    WHERE s.token = p_token AND f.is_public = true;

    IF v_form_id IS NULL THEN
        RAISE EXCEPTION 'Form not found or not accepting submissions';
    END IF;

    -- Create submission
    INSERT INTO nevorai_form_submissions (form_id, share_id, submitter_user_id, submitter_email)
    VALUES (v_form_id, v_share_id, v_user_id, v_user_email)
    RETURNING id INTO v_submission_id;

    -- Insert answers
    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers_json)
    LOOP
        INSERT INTO nevorai_submission_answers (submission_id, field_id, field_key, value, value_json)
        VALUES (
            v_submission_id,
            (v_answer->>'field_id')::uuid,
            v_answer->>'field_key',
            v_answer->>'value',
            v_answer->'value_json'
        );
    END LOOP;

    -- Insert attachments
    FOR v_attachment IN SELECT * FROM jsonb_array_elements(p_attachments_json)
    LOOP
        INSERT INTO nevorai_submission_attachments (submission_id, field_id, storage_path, content_type, size)
        VALUES (
            v_submission_id,
            (v_attachment->>'field_id')::uuid,
            v_attachment->>'storage_path',
            v_attachment->>'content_type',
            (v_attachment->>'size')::bigint
        );
    END LOOP;

    RETURN QUERY SELECT v_submission_id, true, 'Form submitted successfully'::TEXT;
END;
$$;

-- Function to list submissions for a form - UPDATED RETURN TYPE
CREATE OR REPLACE FUNCTION public.nevorai_list_submissions(
    p_form_id uuid,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS TABLE(submission_id uuid, submitter_user_id uuid, submitter_email text, created_at timestamptz, total_count bigint)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total BIGINT;
BEGIN
    -- Verify caller owns the form
    IF NOT EXISTS (
        SELECT 1 FROM nevorai_forms WHERE id = p_form_id AND owner_user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: You do not own this form';
    END IF;

    -- Get total count
    SELECT COUNT(*) INTO v_total
    FROM nevorai_form_submissions s
    WHERE s.form_id = p_form_id;

    -- Return paginated submissions
    RETURN QUERY
    SELECT 
        s.id,
        s.submitter_user_id,
        s.submitter_email,
        s.created_at,
        v_total
    FROM nevorai_form_submissions s
    WHERE s.form_id = p_form_id
    ORDER BY s.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) - Drop and recreate policies
-- ════════════════════════════════════════════════════════════════════════════

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS nevorai_forms_owner_all ON public.nevorai_forms;
DROP POLICY IF EXISTS nevorai_form_fields_owner_all ON public.nevorai_form_fields;
DROP POLICY IF EXISTS nevorai_form_fields_public_read ON public.nevorai_form_fields;
DROP POLICY IF EXISTS nevorai_form_shares_owner_all ON public.nevorai_form_shares;
DROP POLICY IF EXISTS nevorai_form_shares_public_read ON public.nevorai_form_shares;
DROP POLICY IF EXISTS nevorai_form_submissions_owner_read ON public.nevorai_form_submissions;
DROP POLICY IF EXISTS nevorai_form_submissions_submitter_insert ON public.nevorai_form_submissions;
DROP POLICY IF EXISTS nevorai_submission_answers_owner_read ON public.nevorai_submission_answers;
DROP POLICY IF EXISTS nevorai_submission_answers_submitter_insert ON public.nevorai_submission_answers;
DROP POLICY IF EXISTS nevorai_submission_attachments_owner_read ON public.nevorai_submission_attachments;
DROP POLICY IF EXISTS nevorai_submission_attachments_submitter_insert ON public.nevorai_submission_attachments;

-- Forms: owner can do everything
CREATE POLICY nevorai_forms_owner_all ON public.nevorai_forms
    FOR ALL USING (owner_user_id = auth.uid());

-- Fields: owner can manage, anyone authenticated can read (for public forms)
CREATE POLICY nevorai_form_fields_owner_all ON public.nevorai_form_fields
    FOR ALL USING (
        EXISTS (SELECT 1 FROM nevorai_forms f WHERE f.id = form_id AND f.owner_user_id = auth.uid())
    );

CREATE POLICY nevorai_form_fields_public_read ON public.nevorai_form_fields
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM nevorai_forms f WHERE f.id = form_id AND f.is_public = true)
    );

-- Shares: owner can manage, anyone authenticated can read token
CREATE POLICY nevorai_form_shares_owner_all ON public.nevorai_form_shares
    FOR ALL USING (
        EXISTS (SELECT 1 FROM nevorai_forms f WHERE f.id = form_id AND f.owner_user_id = auth.uid())
    );

CREATE POLICY nevorai_form_shares_public_read ON public.nevorai_form_shares
    FOR SELECT USING (true);

-- Submissions: owner can read, authenticated users can insert
CREATE POLICY nevorai_form_submissions_owner_read ON public.nevorai_form_submissions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM nevorai_forms f WHERE f.id = form_id AND f.owner_user_id = auth.uid())
    );

CREATE POLICY nevorai_form_submissions_submitter_insert ON public.nevorai_form_submissions
    FOR INSERT WITH CHECK (submitter_user_id = auth.uid());

-- Answers: owner can read, submitter can insert
CREATE POLICY nevorai_submission_answers_owner_read ON public.nevorai_submission_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM nevorai_form_submissions s
            JOIN nevorai_forms f ON f.id = s.form_id
            WHERE s.id = submission_id AND f.owner_user_id = auth.uid()
        )
    );

CREATE POLICY nevorai_submission_answers_submitter_insert ON public.nevorai_submission_answers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM nevorai_form_submissions s
            WHERE s.id = submission_id AND s.submitter_user_id = auth.uid()
        )
    );

-- Attachments: same pattern
CREATE POLICY nevorai_submission_attachments_owner_read ON public.nevorai_submission_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM nevorai_form_submissions s
            JOIN nevorai_forms f ON f.id = s.form_id
            WHERE s.id = submission_id AND f.owner_user_id = auth.uid()
        )
    );

CREATE POLICY nevorai_submission_attachments_submitter_insert ON public.nevorai_submission_attachments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM nevorai_form_submissions s
            WHERE s.id = submission_id AND s.submitter_user_id = auth.uid()
        )
    );

-- ════════════════════════════════════════════════════════════════════════════
-- BACKFILL: Generate share tokens for any forms missing them
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO public.nevorai_form_shares (form_id, token, created_by)
SELECT 
    f.id,
    encode(public.gen_random_bytes(16), 'base64'),
    f.owner_user_id
FROM public.nevorai_forms f
LEFT JOIN public.nevorai_form_shares s ON s.form_id = f.id
WHERE s.id IS NULL;