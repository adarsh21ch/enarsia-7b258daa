-- Drop the existing function first to allow return type change
DROP FUNCTION IF EXISTS public.nevorai_list_submissions(uuid, integer, integer);

-- STEP 4: Recreate list submissions with submitter_name
CREATE OR REPLACE FUNCTION public.nevorai_list_submissions(
    p_form_id uuid,
    p_limit integer DEFAULT 100,
    p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner_id uuid;
BEGIN
    -- Verify caller owns the form
    SELECT owner_user_id INTO v_owner_id FROM nevorai_forms WHERE id = p_form_id;
    IF v_owner_id IS NULL OR v_owner_id != auth.uid() THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;
    
    RETURN COALESCE((
        SELECT jsonb_agg(sub_data)
        FROM (
            SELECT jsonb_build_object(
                'id', s.id,
                'form_id', s.form_id,
                'share_id', s.share_id,
                'submitter_user_id', s.submitter_user_id,
                'submitter_email', s.submitter_email,
                'submitter_name', COALESCE(s.submitter_name, p.display_name),
                'created_at', s.created_at,
                'answers', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', a.id,
                            'field_key', a.field_key,
                            'value', a.value,
                            'value_json', a.value_json
                        )
                    )
                    FROM nevorai_submission_answers a
                    WHERE a.submission_id = s.id
                ), '[]'::jsonb)
            ) as sub_data
            FROM nevorai_form_submissions s
            LEFT JOIN profiles p ON p.user_id = s.submitter_user_id
            WHERE s.form_id = p_form_id
            ORDER BY s.created_at DESC
            LIMIT p_limit OFFSET p_offset
        ) sub
    ), '[]'::jsonb);
END;
$$;