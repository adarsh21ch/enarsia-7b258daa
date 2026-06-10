
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
    SELECT s.user_id AS u_uid, s.date AS sd,
           s.total_leads AS u_leads, s.total_responses AS u_resp,
           s.response_tags AS u_rt, s.stage_tags AS u_st
    FROM public.personal_snapshot_v2 s
    JOIN downline dl ON dl.uid = s.user_id
    WHERE s.date >= v_start AND s.date < v_end
  ),
  prosp AS (
    SELECT pr.user_id AS u_uid,
           (pr.date_added AT TIME ZONE 'Asia/Kolkata')::date AS sd,
           COUNT(*)::int AS u_leads,
           SUM(CASE WHEN pr.action_taken IS NOT NULL
                     OR (jsonb_typeof(pr.personal_tags)='array' AND jsonb_array_length(pr.personal_tags) > 0)
                    THEN 1 ELSE 0 END)::int AS u_resp
    FROM public.prospects pr
    WHERE pr.deleted_at IS NULL
      AND pr.user_id IN (SELECT uid FROM downline)
      AND pr.date_added >= (v_start AT TIME ZONE 'Asia/Kolkata')
      AND pr.date_added <  (v_end   AT TIME ZONE 'Asia/Kolkata')
    GROUP BY pr.user_id, (pr.date_added AT TIME ZONE 'Asia/Kolkata')::date
  ),
  prosp_tags AS (
    SELECT pr.user_id AS u_uid,
           (pr.date_added AT TIME ZONE 'Asia/Kolkata')::date AS sd,
           pr.action_taken, pr.funnel_stage
    FROM public.prospects pr
    WHERE pr.deleted_at IS NULL
      AND pr.user_id IN (SELECT uid FROM downline)
      AND pr.date_added >= (v_start AT TIME ZONE 'Asia/Kolkata')
      AND pr.date_added <  (v_end   AT TIME ZONE 'Asia/Kolkata')
  ),
  resp_tag_agg AS (
    SELECT u_uid, sd, jsonb_object_agg(action_taken, cnt) AS rt FROM (
      SELECT u_uid, sd, action_taken, COUNT(*)::int AS cnt
      FROM prosp_tags
      WHERE action_taken IS NOT NULL AND action_taken <> ''
      GROUP BY u_uid, sd, action_taken
    ) x GROUP BY u_uid, sd
  ),
  stage_tag_agg AS (
    SELECT u_uid, sd, jsonb_object_agg(funnel_stage, cnt) AS st FROM (
      SELECT u_uid, sd, funnel_stage, COUNT(*)::int AS cnt
      FROM prosp_tags
      WHERE funnel_stage IS NOT NULL AND funnel_stage <> ''
      GROUP BY u_uid, sd, funnel_stage
    ) y GROUP BY u_uid, sd
  ),
  prosp_full AS (
    SELECT p.u_uid, p.sd, p.u_leads, p.u_resp,
           COALESCE(r.rt, '{}'::jsonb) AS u_rt,
           COALESCE(s.st, '{}'::jsonb) AS u_st
    FROM prosp p
    LEFT JOIN resp_tag_agg r ON r.u_uid = p.u_uid AND r.sd = p.sd
    LEFT JOIN stage_tag_agg s ON s.u_uid = p.u_uid AND s.sd = p.sd
  ),
  unified AS (
    SELECT u_uid, sd, u_leads, u_resp, u_rt, u_st FROM snap
    UNION ALL
    SELECT pf.u_uid, pf.sd, pf.u_leads, pf.u_resp, pf.u_rt, pf.u_st FROM prosp_full pf
    WHERE NOT EXISTS (SELECT 1 FROM snap s2 WHERE s2.u_uid = pf.u_uid AND s2.sd = pf.sd)
  ),
  resp AS (
    SELECT x.sd, jsonb_object_agg(x.k, x.sumv) AS rt FROM (
      SELECT u.sd, kv.key AS k, SUM((kv.value)::int) AS sumv
      FROM unified u, jsonb_each_text(COALESCE(u.u_rt,'{}'::jsonb)) kv
      GROUP BY u.sd, kv.key
    ) x GROUP BY x.sd
  ),
  stg AS (
    SELECT y.sd, jsonb_object_agg(y.k, y.sumv) AS st FROM (
      SELECT u.sd, kv.key AS k, SUM((kv.value)::int) AS sumv
      FROM unified u, jsonb_each_text(COALESCE(u.u_st,'{}'::jsonb)) kv
      GROUP BY u.sd, kv.key
    ) y GROUP BY y.sd
  ),
  agg AS (
    SELECT u.sd, SUM(u.u_leads) AS tl, SUM(u.u_resp) AS tr,
           COUNT(DISTINCT u.u_uid) AS mc
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
