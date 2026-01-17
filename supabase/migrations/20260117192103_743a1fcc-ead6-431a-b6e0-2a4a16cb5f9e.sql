-- Backfill total_leads_added from current prospect counts for all users
UPDATE profiles p
SET total_leads_added = COALESCE(
  (SELECT COUNT(*)::integer FROM prospects pr WHERE pr.user_id = p.user_id),
  0
)
WHERE total_leads_added = 0;