
-- ============================================================
-- TEAM-TRACKING MULTI-LEVEL ROLLUP
-- ============================================================
-- Reuses the dual-key rule already used by resolve_upline_leader_id:
--   parent of X = profile where (email = X.upline_email) OR (neverai_id = X.leaders_id_of_my_leader)
--   children of X = profiles where (upline_email = X.email) OR (leaders_id_of_my_leader = X.neverai_id)
--                   AND allow_leader_to_view = true
-- ============================================================

-- Per-user rollup: recomputes one row in total_snapshot_v2 for (user_id, date).
-- total = user's own personal row + sum of every DIRECT downline member's total row.
-- Because we cascade bottom-up via rollup_total_cascade, the downline totals
-- already reflect THEIR sub-trees, so summing direct downline gives the
-- correct grand-total without recursive aggregation here.
CREATE OR REPLACE FUNCTION public.rollup_total_snapshot_for_user(
  _user_id uuid,
  _date    date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user_email     text;
  v_user_neverai   text;
  v_total_leads    integer := 0;
  v_total_resp     integer := 0;
  v_final_count    integer := 0;
  v_funnel_count   integer := 0;
  v_response_tags  jsonb   := '{}'::jsonb;
  v_stage_tags     jsonb   := '{}'::jsonb;
  v_personal       record;
  v_member         record;
  v_upline_uuid    uuid;
  k text;
  vint integer;
BEGIN
  -- Identity for downline lookup
  SELECT email, neverai_id INTO v_user_email, v_user_neverai
    FROM profiles WHERE user_id = _user_id LIMIT 1;

  IF NOT FOUND THEN RETURN; END IF;

  -- 1) Seed with the user's OWN personal snapshot for the date
  SELECT total_leads, total_responses, final_tag_count, funnel_tag_count,
         coalesce(response_tags,'{}'::jsonb) AS response_tags,
         coalesce(stage_tags,'{}'::jsonb)    AS stage_tags,
         final_tag, funnel_tag, funnel_start_date, funnel_day
    INTO v_personal
    FROM personal_snapshot_v2
   WHERE user_id = _user_id AND date = _date
   LIMIT 1;

  IF FOUND THEN
    v_total_leads  := v_personal.total_leads;
    v_total_resp   := v_personal.total_responses;
    v_final_count  := v_personal.final_tag_count;
    v_funnel_count := v_personal.funnel_tag_count;
    v_response_tags := v_personal.response_tags;
    v_stage_tags    := v_personal.stage_tags;
  END IF;

  -- 2) Add every direct downline member's TOTAL for the date
  FOR v_member IN
    SELECT t.total_leads, t.total_responses, t.final_tag_count, t.funnel_tag_count,
           coalesce(t.response_tags,'{}'::jsonb) AS response_tags,
           coalesce(t.stage_tags,'{}'::jsonb)    AS stage_tags
      FROM profiles m
      JOIN total_snapshot_v2 t ON t.user_id = m.user_id AND t.date = _date
     WHERE m.allow_leader_to_view = true
       AND m.user_id <> _user_id
       AND (
            (v_user_email   IS NOT NULL AND v_user_email   <> '' AND lower(m.upline_email) = lower(v_user_email))
         OR (v_user_neverai IS NOT NULL AND v_user_neverai <> '' AND m.leaders_id_of_my_leader = v_user_neverai)
       )
  LOOP
    v_total_leads  := v_total_leads  + coalesce(v_member.total_leads, 0);
    v_total_resp   := v_total_resp   + coalesce(v_member.total_responses, 0);
    v_final_count  := v_final_count  + coalesce(v_member.final_tag_count, 0);
    v_funnel_count := v_funnel_count + coalesce(v_member.funnel_tag_count, 0);

    -- Merge response_tags slot-by-slot
    FOR k, vint IN
      SELECT key, coalesce((value)::int, 0) FROM jsonb_each_text(v_member.response_tags)
    LOOP
      v_response_tags := jsonb_set(
        v_response_tags,
        ARRAY[k],
        to_jsonb(coalesce((v_response_tags ->> k)::int, 0) + vint),
        true
      );
    END LOOP;

    -- Merge stage_tags slot-by-slot
    FOR k, vint IN
      SELECT key, coalesce((value)::int, 0) FROM jsonb_each_text(v_member.stage_tags)
    LOOP
      v_stage_tags := jsonb_set(
        v_stage_tags,
        ARRAY[k],
        to_jsonb(coalesce((v_stage_tags ->> k)::int, 0) + vint),
        true
      );
    END LOOP;
  END LOOP;

  -- 3) Resolve user's direct upline (same dual-key rule)
  SELECT user_id INTO v_upline_uuid FROM profiles p
   WHERE (
          (v_user_email IS NOT NULL AND v_user_email <> '' AND lower(p.email) = lower(
              (SELECT upline_email FROM profiles WHERE user_id = _user_id)))
       )
   LIMIT 1;
  IF v_upline_uuid IS NULL THEN
    SELECT user_id INTO v_upline_uuid FROM profiles p
     WHERE p.neverai_id = (SELECT leaders_id_of_my_leader FROM profiles WHERE user_id = _user_id)
     LIMIT 1;
  END IF;

  -- 4) Upsert into total_snapshot_v2 with source TEAM_MEMBERS
  -- Set the session flag so the total_snapshot trigger doesn't cascade again.
  PERFORM set_config('app.skip_total_cascade', '1', true);

  INSERT INTO total_snapshot_v2 (
    user_id, date, source,
    total_leads, total_responses,
    response_tags, stage_tags,
    final_tag, final_tag_count,
    funnel_tag, funnel_tag_count,
    funnel_start_date, funnel_day,
    upline_leader_id
  )
  VALUES (
    _user_id, _date, 'TEAM_MEMBERS',
    v_total_leads, v_total_resp,
    v_response_tags, v_stage_tags,
    v_personal.final_tag, v_final_count,
    v_personal.funnel_tag, v_funnel_count,
    v_personal.funnel_start_date, v_personal.funnel_day,
    v_upline_uuid
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    source           = 'TEAM_MEMBERS',
    total_leads      = EXCLUDED.total_leads,
    total_responses  = EXCLUDED.total_responses,
    response_tags    = EXCLUDED.response_tags,
    stage_tags       = EXCLUDED.stage_tags,
    final_tag        = EXCLUDED.final_tag,
    final_tag_count  = EXCLUDED.final_tag_count,
    funnel_tag       = EXCLUDED.funnel_tag,
    funnel_tag_count = EXCLUDED.funnel_tag_count,
    funnel_start_date = EXCLUDED.funnel_start_date,
    funnel_day       = EXCLUDED.funnel_day,
    upline_leader_id = EXCLUDED.upline_leader_id,
    updated_at       = now();

  PERFORM set_config('app.skip_total_cascade', '0', true);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.rollup_total_snapshot_for_user(uuid, date) TO authenticated, service_role;

-- Cascade: rollup the writer, then walk up the chain and rollup each ancestor for the same date.
CREATE OR REPLACE FUNCTION public.rollup_total_cascade(
  _user_id uuid,
  _date    date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_current uuid := _user_id;
  v_email   text;
  v_neverai text;
  v_next    uuid;
  i int := 0;
BEGIN
  WHILE v_current IS NOT NULL AND i < 20 LOOP
    PERFORM public.rollup_total_snapshot_for_user(v_current, _date);

    -- Find current's upline (dual-key: email primary, neverai_id fallback)
    SELECT upline_email, leaders_id_of_my_leader INTO v_email, v_neverai
      FROM profiles WHERE user_id = v_current LIMIT 1;

    v_next := NULL;
    IF v_email IS NOT NULL AND v_email <> '' THEN
      SELECT user_id INTO v_next FROM profiles
       WHERE lower(email) = lower(v_email) LIMIT 1;
    END IF;
    IF v_next IS NULL AND v_neverai IS NOT NULL AND v_neverai <> '' THEN
      SELECT user_id INTO v_next FROM profiles
       WHERE neverai_id = v_neverai LIMIT 1;
    END IF;

    EXIT WHEN v_next IS NULL OR v_next = v_current;
    v_current := v_next;
    i := i + 1;
  END LOOP;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.rollup_total_cascade(uuid, date) TO authenticated, service_role;

-- AFTER trigger on personal_snapshot_v2 → cascade rollup
CREATE OR REPLACE FUNCTION public.trg_personal_snapshot_rollup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF TG_OP = 'UPDATE' AND
     NEW.total_leads = OLD.total_leads AND
     NEW.total_responses = OLD.total_responses AND
     NEW.final_tag_count = OLD.final_tag_count AND
     NEW.funnel_tag_count = OLD.funnel_tag_count AND
     NEW.response_tags = OLD.response_tags AND
     NEW.stage_tags    = OLD.stage_tags
  THEN
    RETURN NEW;
  END IF;

  PERFORM public.rollup_total_cascade(NEW.user_id, NEW.date);
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_personal_rollup_total ON public.personal_snapshot_v2;
CREATE TRIGGER trg_personal_rollup_total
  AFTER INSERT OR UPDATE ON public.personal_snapshot_v2
  FOR EACH ROW EXECUTE FUNCTION public.trg_personal_snapshot_rollup();

-- AFTER trigger on total_snapshot_v2 → cascade to ancestors only (skips self).
-- Guarded with the session flag so cascade writes don't re-trigger.
CREATE OR REPLACE FUNCTION public.trg_total_snapshot_rollup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_email   text;
  v_neverai text;
  v_parent  uuid;
BEGIN
  IF current_setting('app.skip_total_cascade', true) = '1' THEN
    RETURN NEW;
  END IF;

  SELECT upline_email, leaders_id_of_my_leader INTO v_email, v_neverai
    FROM profiles WHERE user_id = NEW.user_id LIMIT 1;

  v_parent := NULL;
  IF v_email IS NOT NULL AND v_email <> '' THEN
    SELECT user_id INTO v_parent FROM profiles
     WHERE lower(email) = lower(v_email) LIMIT 1;
  END IF;
  IF v_parent IS NULL AND v_neverai IS NOT NULL AND v_neverai <> '' THEN
    SELECT user_id INTO v_parent FROM profiles
     WHERE neverai_id = v_neverai LIMIT 1;
  END IF;

  IF v_parent IS NOT NULL AND v_parent <> NEW.user_id THEN
    PERFORM public.rollup_total_cascade(v_parent, NEW.date);
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_total_rollup_parents ON public.total_snapshot_v2;
CREATE TRIGGER trg_total_rollup_parents
  AFTER INSERT OR UPDATE ON public.total_snapshot_v2
  FOR EACH ROW EXECUTE FUNCTION public.trg_total_snapshot_rollup();

-- ============================================================
-- ONE-TIME BACKFILL: rebuild totals for every (user,date) that has a personal row.
-- Process from leaves upward by ordering on chain depth (approx: members who
-- are NOT uplines of anyone come first). Cheap approximation: just iterate twice
-- through every (user, date) pair — second pass fixes ancestors after children
-- have been rolled up.
-- ============================================================
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id, date FROM personal_snapshot_v2
  LOOP
    PERFORM public.rollup_total_snapshot_for_user(r.user_id, r.date);
  END LOOP;
  -- Second pass cascades ancestors
  FOR r IN
    SELECT DISTINCT user_id, date FROM personal_snapshot_v2
  LOOP
    PERFORM public.rollup_total_cascade(r.user_id, r.date);
  END LOOP;
END $$;
