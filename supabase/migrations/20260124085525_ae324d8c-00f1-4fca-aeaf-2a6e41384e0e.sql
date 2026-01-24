
-- ============================================
-- NEVORAI FORMS - PHASE 1 BACKEND
-- ============================================

-- 1. FORMS TABLE (metadata)
CREATE TABLE IF NOT EXISTS public.nevorai_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. FORM FIELDS TABLE (dynamic structure)
CREATE TABLE IF NOT EXISTS public.nevorai_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.nevorai_forms(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('number', 'short_text', 'long_text', 'select', 'multiselect', 'audio', 'file')),
  required BOOLEAN NOT NULL DEFAULT false,
  options JSONB DEFAULT '[]'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. SHARE LINKS TABLE
CREATE TABLE IF NOT EXISTS public.nevorai_form_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.nevorai_forms(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.nevorai_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.nevorai_forms(id) ON DELETE CASCADE,
  share_id UUID REFERENCES public.nevorai_form_shares(id) ON DELETE SET NULL,
  submitter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submitter_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. ANSWERS TABLE
CREATE TABLE IF NOT EXISTS public.nevorai_submission_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.nevorai_form_submissions(id) ON DELETE CASCADE,
  field_id UUID REFERENCES public.nevorai_form_fields(id) ON DELETE SET NULL,
  field_key TEXT NOT NULL,
  value TEXT,
  value_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. ATTACHMENTS TABLE
CREATE TABLE IF NOT EXISTS public.nevorai_submission_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.nevorai_form_submissions(id) ON DELETE CASCADE,
  field_id UUID REFERENCES public.nevorai_form_fields(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  content_type TEXT,
  size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_nevorai_forms_owner ON public.nevorai_forms(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_nevorai_form_fields_form ON public.nevorai_form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_nevorai_form_shares_token ON public.nevorai_form_shares(token);
CREATE INDEX IF NOT EXISTS idx_nevorai_form_shares_form ON public.nevorai_form_shares(form_id);
CREATE INDEX IF NOT EXISTS idx_nevorai_submissions_form ON public.nevorai_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_nevorai_submissions_submitter ON public.nevorai_form_submissions(submitter_user_id);
CREATE INDEX IF NOT EXISTS idx_nevorai_answers_submission ON public.nevorai_submission_answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_nevorai_attachments_submission ON public.nevorai_submission_attachments(submission_id);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================
CREATE OR REPLACE TRIGGER update_nevorai_forms_updated_at
  BEFORE UPDATE ON public.nevorai_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE public.nevorai_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nevorai_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nevorai_form_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nevorai_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nevorai_submission_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nevorai_submission_attachments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: nevorai_forms
-- ============================================
CREATE POLICY "Form owners can do everything on their forms"
  ON public.nevorai_forms FOR ALL
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Anyone can view public forms"
  ON public.nevorai_forms FOR SELECT
  USING (is_public = true);

-- ============================================
-- RLS POLICIES: nevorai_form_fields
-- ============================================
CREATE POLICY "Form owners can manage fields"
  ON public.nevorai_form_fields FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.nevorai_forms f 
    WHERE f.id = form_id AND f.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.nevorai_forms f 
    WHERE f.id = form_id AND f.owner_user_id = auth.uid()
  ));

CREATE POLICY "Anyone can view fields of public forms"
  ON public.nevorai_form_fields FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.nevorai_forms f 
    WHERE f.id = form_id AND f.is_public = true
  ));

-- ============================================
-- RLS POLICIES: nevorai_form_shares
-- ============================================
CREATE POLICY "Form owners can manage share links"
  ON public.nevorai_form_shares FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.nevorai_forms f 
    WHERE f.id = form_id AND f.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.nevorai_forms f 
    WHERE f.id = form_id AND f.owner_user_id = auth.uid()
  ));

CREATE POLICY "Anyone can view valid share links"
  ON public.nevorai_form_shares FOR SELECT
  USING (expires_at IS NULL OR expires_at > now());

-- ============================================
-- RLS POLICIES: nevorai_form_submissions
-- ============================================
CREATE POLICY "Form owners can view all submissions"
  ON public.nevorai_form_submissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.nevorai_forms f 
    WHERE f.id = form_id AND f.owner_user_id = auth.uid()
  ));

CREATE POLICY "Submitters can view their own submissions"
  ON public.nevorai_form_submissions FOR SELECT
  USING (submitter_user_id = auth.uid());

CREATE POLICY "Authenticated users can insert submissions"
  ON public.nevorai_form_submissions FOR INSERT
  WITH CHECK (auth.uid() = submitter_user_id);

-- ============================================
-- RLS POLICIES: nevorai_submission_answers
-- ============================================
CREATE POLICY "Form owners can view all answers"
  ON public.nevorai_submission_answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.nevorai_form_submissions s
    JOIN public.nevorai_forms f ON f.id = s.form_id
    WHERE s.id = submission_id AND f.owner_user_id = auth.uid()
  ));

CREATE POLICY "Submitters can view their own answers"
  ON public.nevorai_submission_answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.nevorai_form_submissions s
    WHERE s.id = submission_id AND s.submitter_user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can insert answers"
  ON public.nevorai_submission_answers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.nevorai_form_submissions s
    WHERE s.id = submission_id AND s.submitter_user_id = auth.uid()
  ));

-- ============================================
-- RLS POLICIES: nevorai_submission_attachments
-- ============================================
CREATE POLICY "Form owners can view all attachments"
  ON public.nevorai_submission_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.nevorai_form_submissions s
    JOIN public.nevorai_forms f ON f.id = s.form_id
    WHERE s.id = submission_id AND f.owner_user_id = auth.uid()
  ));

CREATE POLICY "Submitters can view their own attachments"
  ON public.nevorai_submission_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.nevorai_form_submissions s
    WHERE s.id = submission_id AND s.submitter_user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can insert attachments"
  ON public.nevorai_submission_attachments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.nevorai_form_submissions s
    WHERE s.id = submission_id AND s.submitter_user_id = auth.uid()
  ));

-- ============================================
-- STORAGE BUCKET: nevorai-forms (private)
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'nevorai-forms', 
  'nevorai-forms', 
  false,
  52428800, -- 50MB limit
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Submitters can upload to their submission folder
CREATE POLICY "Authenticated users can upload form attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'nevorai-forms' 
    AND auth.role() = 'authenticated'
  );

-- Storage RLS: Form owners can view all files in their forms
CREATE POLICY "Form owners can view attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'nevorai-forms'
    AND EXISTS (
      SELECT 1 FROM public.nevorai_submission_attachments a
      JOIN public.nevorai_form_submissions s ON s.id = a.submission_id
      JOIN public.nevorai_forms f ON f.id = s.form_id
      WHERE a.storage_path = name AND f.owner_user_id = auth.uid()
    )
  );

-- Storage RLS: Submitters can view their own attachments
CREATE POLICY "Submitters can view their own attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'nevorai-forms'
    AND EXISTS (
      SELECT 1 FROM public.nevorai_submission_attachments a
      JOIN public.nevorai_form_submissions s ON s.id = a.submission_id
      WHERE a.storage_path = name AND s.submitter_user_id = auth.uid()
    )
  );

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- 1. Create share token
CREATE OR REPLACE FUNCTION public.nevorai_create_share_token(
  p_form_id UUID,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  share_id UUID,
  token TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share_id UUID;
  v_token TEXT;
BEGIN
  -- Verify caller owns the form
  IF NOT EXISTS (
    SELECT 1 FROM nevorai_forms WHERE id = p_form_id AND owner_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: You do not own this form';
  END IF;

  -- Generate token
  v_token := encode(gen_random_bytes(16), 'hex');
  
  INSERT INTO nevorai_form_shares (form_id, token, expires_at, created_by)
  VALUES (p_form_id, v_token, p_expires_at, auth.uid())
  RETURNING id INTO v_share_id;

  RETURN QUERY SELECT v_share_id, v_token, p_expires_at;
END;
$$;

-- 2. Get form by token (validates expiry)
CREATE OR REPLACE FUNCTION public.nevorai_get_form_by_token(p_token TEXT)
RETURNS TABLE (
  form_id UUID,
  share_id UUID,
  title TEXT,
  description TEXT,
  owner_user_id UUID,
  is_expired BOOLEAN,
  fields JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share RECORD;
  v_form RECORD;
BEGIN
  -- Find the share link
  SELECT s.id, s.form_id, s.expires_at
  INTO v_share
  FROM nevorai_form_shares s
  WHERE s.token = p_token;

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
  SELECT f.id, f.title, f.description, f.owner_user_id
  INTO v_form
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

-- 3. Submit form (atomic transaction)
CREATE OR REPLACE FUNCTION public.nevorai_submit_form(
  p_token TEXT,
  p_answers_json JSONB,
  p_attachments_json JSONB DEFAULT '[]'::JSONB
)
RETURNS TABLE (
  submission_id UUID,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_share RECORD;
  v_form RECORD;
  v_submission_id UUID;
  v_answer JSONB;
  v_attachment JSONB;
BEGIN
  -- Must be authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to submit forms';
  END IF;

  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Validate share token
  SELECT s.id, s.form_id, s.expires_at
  INTO v_share
  FROM nevorai_form_shares s
  WHERE s.token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid share link';
  END IF;

  IF v_share.expires_at IS NOT NULL AND v_share.expires_at < now() THEN
    RAISE EXCEPTION 'Share link has expired';
  END IF;

  -- Validate form exists and is public
  SELECT f.id INTO v_form FROM nevorai_forms f
  WHERE f.id = v_share.form_id AND f.is_public = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Form not found or not public';
  END IF;

  -- Create submission
  INSERT INTO nevorai_form_submissions (form_id, share_id, submitter_user_id, submitter_email)
  VALUES (v_share.form_id, v_share.id, v_user_id, v_user_email)
  RETURNING id INTO v_submission_id;

  -- Insert answers
  FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers_json)
  LOOP
    INSERT INTO nevorai_submission_answers (submission_id, field_id, field_key, value, value_json)
    VALUES (
      v_submission_id,
      (v_answer->>'field_id')::UUID,
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
      (v_attachment->>'field_id')::UUID,
      v_attachment->>'storage_path',
      v_attachment->>'content_type',
      (v_attachment->>'size')::BIGINT
    );
  END LOOP;

  RETURN QUERY SELECT v_submission_id, true, 'Form submitted successfully'::TEXT;
END;
$$;

-- 4. List submissions (owner only)
CREATE OR REPLACE FUNCTION public.nevorai_list_submissions(
  p_form_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  submission_id UUID,
  submitter_user_id UUID,
  submitter_email TEXT,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 5. Get submission answers (owner or submitter)
CREATE OR REPLACE FUNCTION public.nevorai_get_submission_answers(p_submission_id UUID)
RETURNS TABLE (
  answer_id UUID,
  field_id UUID,
  field_key TEXT,
  field_label TEXT,
  field_type TEXT,
  value TEXT,
  value_json JSONB,
  attachments JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission RECORD;
BEGIN
  -- Get submission and verify access
  SELECT s.id, s.form_id, s.submitter_user_id
  INTO v_submission
  FROM nevorai_form_submissions s
  WHERE s.id = p_submission_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  -- Check if caller is owner or submitter
  IF NOT EXISTS (
    SELECT 1 FROM nevorai_forms f 
    WHERE f.id = v_submission.form_id AND f.owner_user_id = auth.uid()
  ) AND v_submission.submitter_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Return answers with field info and attachments
  RETURN QUERY
  SELECT 
    a.id,
    a.field_id,
    a.field_key,
    ff.label,
    ff.field_type,
    a.value,
    a.value_json,
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', att.id,
          'storage_path', att.storage_path,
          'content_type', att.content_type,
          'size', att.size
        )
      ), '[]'::jsonb)
      FROM nevorai_submission_attachments att
      WHERE att.submission_id = a.submission_id AND att.field_id = a.field_id
    )
  FROM nevorai_submission_answers a
  LEFT JOIN nevorai_form_fields ff ON ff.id = a.field_id
  WHERE a.submission_id = p_submission_id
  ORDER BY ff.position;
END;
$$;
