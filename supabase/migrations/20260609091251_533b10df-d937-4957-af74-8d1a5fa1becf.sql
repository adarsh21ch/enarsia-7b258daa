CREATE OR REPLACE FUNCTION public.get_team_activity_status(_leader_user_id uuid, _date date)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  email text,
  has_personal_snapshot boolean,
  personal_source text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_authorized boolean := false;
  v_email text;
  v_neverai text;
  v_cur uuid;
  v_nxt uuid;
  v_em text;
  v_nv text;
  i int := 0;
BEGIN
  IF v_caller IS NULL THEN RETURN; END IF;

  IF v_caller = _leader_user_id THEN
    v_authorized := true;
  ELSE
    -- Walk up from _leader_user_id via dual-key (email primary, neverai_id fallback).
    -- If we reach v_caller within 20 hops, the caller is an ancestor leader.
    v_cur := _leader_user_id;
    WHILE v_cur IS NOT NULL AND i < 20 LOOP
      SELECT upline_email, leaders_id_of_my_leader
        INTO v_em, v_nv
        FROM profiles WHERE user_id = v_cur LIMIT 1;

      v_nxt := NULL;
      IF v_em IS NOT NULL AND v_em <> '' THEN
        SELECT p.user_id INTO v_nxt FROM profiles p WHERE lower(p.email) = lower(v_em) LIMIT 1;
      END IF;
      IF v_nxt IS NULL AND v_nv IS NOT NULL AND v_nv <> '' THEN
        SELECT p.user_id INTO v_nxt FROM profiles p WHERE p.neverai_id = v_nv LIMIT 1;
      END IF;

      EXIT WHEN v_nxt IS NULL OR v_nxt = v_cur;
      IF v_nxt = v_caller THEN
        v_authorized := true;
        EXIT;
      END IF;
      v_cur := v_nxt;
      i := i + 1;
    END LOOP;
  END IF;

  IF NOT v_authorized THEN RETURN; END IF;

  SELECT p.email, p.neverai_id INTO v_email, v_neverai
    FROM profiles p WHERE p.user_id = _leader_user_id LIMIT 1;

  RETURN QUERY
  SELECT
    p.user_id,
    p.display_name,
    p.email,
    EXISTS(
      SELECT 1 FROM personal_snapshot_v2 ps
      WHERE ps.user_id = p.user_id AND ps.date = _date
    ) AS has_personal_snapshot,
    (SELECT tsp.personal_source FROM tracking_source_preferences tsp WHERE tsp.user_id = p.user_id LIMIT 1) AS personal_source
  FROM profiles p
  WHERE p.allow_leader_to_view = true
    AND p.user_id <> _leader_user_id
    AND (
      (v_email IS NOT NULL AND v_email <> '' AND lower(p.upline_email) = lower(v_email))
      OR (v_neverai IS NOT NULL AND v_neverai <> '' AND p.leaders_id_of_my_leader = v_neverai)
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_team_activity_status(uuid, date) TO authenticated;