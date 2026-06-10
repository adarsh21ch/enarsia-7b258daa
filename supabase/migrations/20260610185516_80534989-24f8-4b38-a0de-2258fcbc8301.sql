
-- Phase A: single source of truth for the upline chain
CREATE OR REPLACE FUNCTION public.get_user_upline_chain(p_user uuid)
RETURNS TABLE(lvl int, leader_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_current uuid := p_user;
  v_next_code text;
  v_next_user uuid;
  v_lvl int := 0;
BEGIN
  LOOP
    SELECT p.leaders_id_of_my_leader INTO v_next_code FROM public.profiles p WHERE p.user_id = v_current;
    EXIT WHEN v_next_code IS NULL;
    SELECT p.user_id INTO v_next_user FROM public.profiles p WHERE p.neverai_id = v_next_code LIMIT 1;
    EXIT WHEN v_next_user IS NULL OR v_next_user = p_user;
    v_lvl := v_lvl + 1;
    lvl := v_lvl; leader_id := v_next_user; RETURN NEXT;
    v_current := v_next_user;
    EXIT WHEN v_lvl >= 20;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_upline_of(p_leader uuid, p_member uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.get_user_upline_chain(p_member) WHERE leader_id = p_leader);
$$;

CREATE OR REPLACE FUNCTION public.get_direct_downline(p_leader uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id FROM public.profiles p
  WHERE p.leaders_id_of_my_leader = (SELECT neverai_id FROM public.profiles WHERE user_id = p_leader)
    AND p.user_id <> p_leader;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_upline_chain(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_upline_of(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_direct_downline(uuid) TO authenticated, service_role;

-- Phase B: auto-stamp upline_leader_id on snapshot writes
CREATE OR REPLACE FUNCTION public.stamp_upline_leader_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.upline_leader_id := (SELECT leader_id FROM public.get_user_upline_chain(NEW.user_id) WHERE lvl = 1);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_upline_personal ON public.personal_snapshot_v2;
CREATE TRIGGER trg_stamp_upline_personal
BEFORE INSERT OR UPDATE OF user_id ON public.personal_snapshot_v2
FOR EACH ROW EXECUTE FUNCTION public.stamp_upline_leader_id();

DROP TRIGGER IF EXISTS trg_stamp_upline_total ON public.total_snapshot_v2;
CREATE TRIGGER trg_stamp_upline_total
BEFORE INSERT OR UPDATE OF user_id ON public.total_snapshot_v2
FOR EACH ROW EXECUTE FUNCTION public.stamp_upline_leader_id();

-- Backfill
UPDATE public.personal_snapshot_v2 p
SET upline_leader_id = ul.leader_id
FROM (
  SELECT u.user_id, (SELECT leader_id FROM public.get_user_upline_chain(u.user_id) WHERE lvl=1) AS leader_id
  FROM (SELECT DISTINCT user_id FROM public.personal_snapshot_v2) u
) ul
WHERE p.user_id = ul.user_id AND p.upline_leader_id IS DISTINCT FROM ul.leader_id;

UPDATE public.total_snapshot_v2 t
SET upline_leader_id = ul.leader_id
FROM (
  SELECT u.user_id, (SELECT leader_id FROM public.get_user_upline_chain(u.user_id) WHERE lvl=1) AS leader_id
  FROM (SELECT DISTINCT user_id FROM public.total_snapshot_v2) u
) ul
WHERE t.user_id = ul.user_id AND t.upline_leader_id IS DISTINCT FROM ul.leader_id;

-- Phase D: server-side team-total rollup
CREATE OR REPLACE FUNCTION public.get_team_total(p_leader uuid, p_month text)
RETURNS TABLE(
  d date,
  total_leads bigint,
  total_responses bigint,
  response_tags jsonb,
  stage_tags jsonb,
  member_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH downline AS (
    SELECT p_leader AS uid
    UNION
    SELECT g.user_id FROM (SELECT public.get_direct_downline(p_leader) AS user_id) g
  ),
  rows AS (
    SELECT s.user_id, s.date AS sd, s.total_leads, s.total_responses, s.response_tags, s.stage_tags
    FROM public.personal_snapshot_v2 s
    JOIN downline dl ON dl.uid = s.user_id
    WHERE to_char(s.date, 'YYYY-MM') = p_month
  ),
  resp AS (
    SELECT r.sd, jsonb_object_agg(k, sumv) AS rt FROM (
      SELECT r2.sd, kv.key AS k, SUM((kv.value)::int) AS sumv
      FROM rows r2, jsonb_each_text(COALESCE(r2.response_tags,'{}'::jsonb)) kv
      GROUP BY r2.sd, kv.key
    ) x GROUP BY x.sd
  ),
  stg AS (
    SELECT r.sd, jsonb_object_agg(k, sumv) AS st FROM (
      SELECT r3.sd, kv.key AS k, SUM((kv.value)::int) AS sumv
      FROM rows r3, jsonb_each_text(COALESCE(r3.stage_tags,'{}'::jsonb)) kv
      GROUP BY r3.sd, kv.key
    ) y GROUP BY y.sd
  ),
  agg AS (
    SELECT r.sd, SUM(r.total_leads) AS tl, SUM(r.total_responses) AS tr, COUNT(DISTINCT r.user_id) AS mc
    FROM rows r GROUP BY r.sd
  )
  SELECT agg.sd, agg.tl::bigint, agg.tr::bigint,
         COALESCE(resp.rt,'{}'::jsonb), COALESCE(stg.st,'{}'::jsonb), agg.mc::bigint
  FROM agg LEFT JOIN resp ON resp.sd = agg.sd LEFT JOIN stg ON stg.sd = agg.sd
  ORDER BY agg.sd;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_total(uuid, text) TO authenticated, service_role;
