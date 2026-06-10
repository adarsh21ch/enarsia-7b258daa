
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
    SELECT public.get_direct_downline(p_leader)
  ),
  rows AS (
    SELECT s.user_id, s.date AS sd, s.total_leads, s.total_responses, s.response_tags, s.stage_tags
    FROM public.personal_snapshot_v2 s
    JOIN downline dl ON dl.uid = s.user_id
    WHERE to_char(s.date, 'YYYY-MM') = p_month
  ),
  resp AS (
    SELECT x.sd, jsonb_object_agg(x.k, x.sumv) AS rt FROM (
      SELECT r2.sd, kv.key AS k, SUM((kv.value)::int) AS sumv
      FROM rows r2, jsonb_each_text(COALESCE(r2.response_tags,'{}'::jsonb)) kv
      GROUP BY r2.sd, kv.key
    ) x GROUP BY x.sd
  ),
  stg AS (
    SELECT y.sd, jsonb_object_agg(y.k, y.sumv) AS st FROM (
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
