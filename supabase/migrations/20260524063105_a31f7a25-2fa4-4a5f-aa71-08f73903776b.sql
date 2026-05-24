
-- 1. Funnels: replace broad public SELECT with column-filtered public view
DROP POLICY IF EXISTS "funnels_public_select" ON public.funnels;

CREATE OR REPLACE VIEW public.funnels_public AS
SELECT
  id, owner_user_id, title, slug, description, video_url, thumbnail_url,
  allow_speed_control, allow_forward_seek, lock_cta_until_complete,
  price, payment_type, cta_button_text, cta_redirect_url, success_message,
  is_published, created_at, updated_at, video_asset_id, visibility_type,
  intent_type, lead_form_config, thumbnail_object_key, cta_trigger_type,
  cta_trigger_value, video_access_limit_minutes, audio_url, audio_play_timing,
  whatsapp_auto_message_enabled, whatsapp_auto_message, show_cta, show_contact,
  payment_confirmation_method, contact_follows_cta, audio_enabled,
  audio_play_position, audio_autoplay, audio_lock_video, audio_skip_allowed,
  audio_show_player, is_live_mode, live_start_time, live_end_time, live_status,
  live_sync_enabled, replay_enabled, live_access_type, live_disable_pause,
  live_viewer_count, show_contact_whatsapp, show_contact_phone, show_contact_instagram
FROM public.funnels
WHERE is_published = true;

GRANT SELECT ON public.funnels_public TO anon, authenticated;

-- 2. Funnel price options: replace public SELECT with view that omits UPI/QR
DROP POLICY IF EXISTS "Public can view price options" ON public.funnel_price_options;

CREATE OR REPLACE VIEW public.funnel_price_options_public AS
SELECT
  fpo.id, fpo.funnel_id, fpo.label, fpo.amount, fpo.sort_order,
  fpo.is_default, fpo.created_at
FROM public.funnel_price_options fpo
JOIN public.funnels f ON f.id = fpo.funnel_id
WHERE f.is_published = true;

GRANT SELECT ON public.funnel_price_options_public TO anon, authenticated;

-- 3. Secure RPC to return UPI/QR only after validating a real lead access token
CREATE OR REPLACE FUNCTION public.get_funnel_payment_details(
  p_lead_id uuid,
  p_access_token text
)
RETURNS TABLE (
  funnel_upi_id text,
  options jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_funnel_id uuid;
BEGIN
  SELECT funnel_id INTO v_funnel_id
  FROM public.funnel_leads
  WHERE id = p_lead_id AND access_token = p_access_token;

  IF v_funnel_id IS NULL THEN
    RAISE EXCEPTION 'Invalid lead access';
  END IF;

  RETURN QUERY
  SELECT
    f.upi_id::text AS funnel_upi_id,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', fpo.id,
        'label', fpo.label,
        'amount', fpo.amount,
        'upi_id', fpo.upi_id,
        'qr_image_url', fpo.qr_image_url,
        'is_default', fpo.is_default,
        'sort_order', fpo.sort_order
      ) ORDER BY fpo.sort_order)
      FROM public.funnel_price_options fpo
      WHERE fpo.funnel_id = v_funnel_id),
      '[]'::jsonb
    ) AS options
  FROM public.funnels f
  WHERE f.id = v_funnel_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_funnel_payment_details(uuid, text) TO anon, authenticated;

-- 4. Nevorai form shares: remove public token enumeration
DROP POLICY IF EXISTS "Anyone can view valid share links" ON public.nevorai_form_shares;

-- 5. Defensive deny-all policies for email_otps and abuse_logs (service role bypasses RLS)
CREATE POLICY "Deny all client access" ON public.email_otps
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny all client access" ON public.abuse_logs
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- 6. Avatars storage: enforce path ownership on UPDATE/DELETE
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Also tighten INSERT to enforce ownership path
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
