
-- Phase C + E: Make team rollup derive from prospects when downline members
-- don't have personal snapshots. Also fix downline resolution to honor both
-- upline_email and the legacy leaders_id_of_my_leader keys + allow_leader_to_view.

CREATE OR REPLACE FUNCTION public.get_direct_downline(p_leader uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (
    SELECT lower(email) AS lemail, neverai_id FROM public.profiles WHERE user_id = p_leader
  )
  SELECT p.user_id
  FROM public.profiles p, me
  WHERE p.user_id <> p_leader
    AND COALESCE(p.allow_leader_to_view, false) = true
    AND (
      (me.lemail IS NOT NULL AND lower(COALESCE(p.upline_email,'')) = me.lemail)
      OR (me.neverai_id IS NOT NULL AND p.leaders_id_of_my_leader = me.neverai_id)
    );
$$;

-- Rewrite get_team_total to combine snapshot rows AND prospect-derived rows
-- for any (member, day) that has no snapshot. Tag JSONBs from prospects are
-- keyed by raw tag name (member's own tag text) — the client maps these
-- alongside slot keys.
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
DECLARE
  v_year int := split_part(p_month,'-',1)::int;
  v_month int := split_part(p_month,'-',2)::int;
  v_start date := make_date(v_year, v_month, 1);
  v_end date := (v_start + INTERVAL '1 month')::date;
BEGIN
  RETURN QUERY
  WITH downline AS (
    SELECT p_leader AS uid
    UNION
    SELECT g.uid FROM (SELECT public.get_direct_downline(p_leader) AS uid) g
  ),
  snap AS (
    SELECT s.user_id, s.date AS sd, s.total_leads, s.total_responses,
           s.response_tags, s.stage_tags
    FROM public.personal_snapshot_v2 s
    JOIN downline dl ON dl.uid = s.user_id
    WHERE s.date >= v_start AND s.date < v_end
  ),
  -- prospect-derived per (user, date) for downline members that have no snapshot
  prosp AS (
    SELECT pr.user_id,
           (pr.date_added AT TIME ZONE 'Asia/Kolkata')::date AS sd,
           COUNT(*)::int AS leads_count,
           SUM(CASE WHEN pr.action_taken IS NOT NULL
                     OR (jsonb_typeof(pr.personal_tags)='array' AND jsonb_array_length(pr.personal_tags) > 0)
                    THEN 1 ELSE 0 END)::int AS responses_count,
           jsonb_object_agg(at_key, at_count) FILTER (WHERE at_key IS NOT NULL) AS resp_tags,
           jsonb_object_agg(fs_key, fs_count) FILTER (WHERE fs_key IS NOT NULL) AS st_tags
    FROM (
      SELECT pr.user_id, pr.date_added, pr.action_taken, pr.personal_tags, pr.funnel_stage,
             NULL::text AS at_key, NULL::int AS at_count, NULL::text AS fs_key, NULL::int AS fs_count
      FROM public.prospects pr
      WHERE pr.deleted_at IS NULL
        AND pr.user_id IN (SELECT uid FROM downline)
        AND pr.date_added >= (v_start AT TIME ZONE 'Asia/Kolkata')
        AND pr.date_added <  (v_end   AT TIME ZONE 'Asia/Kolkata')
    ) pr
    GROUP BY pr.user_id, (pr.date_added AT TIME ZONE 'Asia/Kolkata')::date
  ),
  -- richer tag breakdown joined back in
  prosp_tags AS (
    SELECT pr.user_id,
           (pr.date_added AT TIME ZONE 'Asia/Kolkata')::date AS sd,
           pr.action_taken, pr.funnel_stage
    FROM public.prospects pr
    WHERE pr.deleted_at IS NULL
      AND pr.user_id IN (SELECT uid FROM downline)
      AND pr.date_added >= (v_start AT TIME ZONE 'Asia/Kolkata')
      AND pr.date_added <  (v_end   AT TIME ZONE 'Asia/Kolkata')
  ),
  resp_tag_agg AS (
    SELECT user_id, sd,
           jsonb_object_agg(action_taken, cnt) AS rt
    FROM (
      SELECT user_id, sd, action_taken, COUNT(*)::int AS cnt
      FROM prosp_tags
      WHERE action_taken IS NOT NULL AND action_taken <> ''
      GROUP BY user_id, sd, action_taken
    ) x
    GROUP BY user_id, sd
  ),
  stage_tag_agg AS (
    SELECT user_id, sd,
           jsonb_object_agg(funnel_stage, cnt) AS st
    FROM (
      SELECT user_id, sd, funnel_stage, COUNT(*)::int AS cnt
      FROM prosp_tags
      WHERE funnel_stage IS NOT NULL AND funnel_stage <> ''
      GROUP BY user_id, sd, funnel_stage
    ) y
    GROUP BY user_id, sd
  ),
  prosp_full AS (
    SELECT p.user_id, p.sd, p.leads_count, p.responses_count,
           COALESCE(r.rt, '{}'::jsonb) AS resp_tags,
           COALESCE(s.st, '{}'::jsonb) AS st_tags
    FROM prosp p
    LEFT JOIN resp_tag_agg r ON r.user_id = p.user_id AND r.sd = p.sd
    LEFT JOIN stage_tag_agg s ON s.user_id = p.user_id AND s.sd = p.sd
  ),
  -- For each (user, date): prefer snapshot row, fall back to prospect-derived
  unified AS (
    SELECT user_id, sd, total_leads, total_responses, response_tags, stage_tags
    FROM snap
    UNION ALL
    SELECT pf.user_id, pf.sd, pf.leads_count, pf.responses_count, pf.resp_tags, pf.st_tags
    FROM prosp_full pf
    WHERE NOT EXISTS (
      SELECT 1 FROM snap s2 WHERE s2.user_id = pf.user_id AND s2.sd = pf.sd
    )
  ),
  resp AS (
    SELECT x.sd, jsonb_object_agg(x.k, x.sumv) AS rt FROM (
      SELECT u.sd, kv.key AS k, SUM((kv.value)::int) AS sumv
      FROM unified u, jsonb_each_text(COALESCE(u.response_tags,'{}'::jsonb)) kv
      GROUP BY u.sd, kv.key
    ) x GROUP BY x.sd
  ),
  stg AS (
    SELECT y.sd, jsonb_object_agg(y.k, y.sumv) AS st FROM (
      SELECT u.sd, kv.key AS k, SUM((kv.value)::int) AS sumv
      FROM unified u, jsonb_each_text(COALESCE(u.stage_tags,'{}'::jsonb)) kv
      GROUP BY u.sd, kv.key
    ) y GROUP BY y.sd
  ),
  agg AS (
    SELECT u.sd, SUM(u.total_leads) AS tl, SUM(u.total_responses) AS tr,
           COUNT(DISTINCT u.user_id) AS mc
    FROM unified u GROUP BY u.sd
  )
  SELECT agg.sd, agg.tl::bigint, agg.tr::bigint,
         COALESCE(resp.rt,'{}'::jsonb), COALESCE(stg.st,'{}'::jsonb), agg.mc::bigint
  FROM agg
  LEFT JOIN resp ON resp.sd = agg.sd
  LEFT JOIN stg  ON stg.sd  = agg.sd
  ORDER BY agg.sd;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_total(uuid, text) TO authenticated, service_role;

-- New: per-member per-day lead grid for funnel-wise view
CREATE OR REPLACE FUNCTION public.get_team_member_daily(p_leader uuid, p_month text)
RETURNS TABLE(
  member_user_id uuid,
  d date,
  total_leads bigint,
  total_responses bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_year int := split_part(p_month,'-',1)::int;
  v_month int := split_part(p_month,'-',2)::int;
  v_start date := make_date(v_year, v_month, 1);
  v_end date := (v_start + INTERVAL '1 month')::date;
BEGIN
  RETURN QUERY
  WITH downline AS (
    SELECT p_leader AS uid
    UNION
    SELECT g.uid FROM (SELECT public.get_direct_downline(p_leader) AS uid) g
  ),
  snap AS (
    SELECT s.user_id, s.date AS sd, s.total_leads::bigint AS tl, s.total_responses::bigint AS tr
    FROM public.personal_snapshot_v2 s
    JOIN downline dl ON dl.uid = s.user_id
    WHERE s.date >= v_start AND s.date < v_end
  ),
  prosp AS (
    SELECT pr.user_id, (pr.date_added AT TIME ZONE 'Asia/Kolkata')::date AS sd,
           COUNT(*)::bigint AS tl,
           SUM(CASE WHEN pr.action_taken IS NOT NULL
                     OR (jsonb_typeof(pr.personal_tags)='array' AND jsonb_array_length(pr.personal_tags) > 0)
                    THEN 1 ELSE 0 END)::bigint AS tr
    FROM public.prospects pr
    WHERE pr.deleted_at IS NULL
      AND pr.user_id IN (SELECT uid FROM downline)
      AND pr.date_added >= (v_start AT TIME ZONE 'Asia/Kolkata')
      AND pr.date_added <  (v_end   AT TIME ZONE 'Asia/Kolkata')
    GROUP BY pr.user_id, (pr.date_added AT TIME ZONE 'Asia/Kolkata')::date
  ),
  unified AS (
    SELECT user_id, sd, tl, tr FROM snap
    UNION ALL
    SELECT p.user_id, p.sd, p.tl, p.tr FROM prosp p
    WHERE NOT EXISTS (SELECT 1 FROM snap s2 WHERE s2.user_id = p.user_id AND s2.sd = p.sd)
  )
  SELECT u.user_id, u.sd, SUM(u.tl)::bigint, SUM(u.tr)::bigint
  FROM unified u
  GROUP BY u.user_id, u.sd
  ORDER BY u.user_id, u.sd;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_member_daily(uuid, text) TO authenticated, service_role;
