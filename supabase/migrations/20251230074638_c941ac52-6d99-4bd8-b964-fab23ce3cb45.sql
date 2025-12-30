-- Add indexes to speed up common queries (2-5x improvement)

-- Speed up prospect list queries (user_id + sort_order + date_added)
CREATE INDEX IF NOT EXISTS idx_prospects_user_sort ON prospects(user_id, sort_order NULLS LAST, date_added ASC);

-- Speed up prospect filtering by funnel_stage
CREATE INDEX IF NOT EXISTS idx_prospects_user_stage ON prospects(user_id, funnel_stage);

-- Speed up prospect filtering by action_taken
CREATE INDEX IF NOT EXISTS idx_prospects_user_action ON prospects(user_id, action_taken);

-- Speed up activity log queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON activity_logs(user_id, created_at DESC);

-- Speed up activity log queries by prospect
CREATE INDEX IF NOT EXISTS idx_activity_logs_prospect ON activity_logs(prospect_id, created_at DESC);

-- Speed up subscription lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON user_subscriptions(user_id);

-- Speed up profile lookups by leader ID (used in hierarchy functions)
CREATE INDEX IF NOT EXISTS idx_profiles_neverai_id ON profiles(neverai_id);
CREATE INDEX IF NOT EXISTS idx_profiles_leaders_id ON profiles(leaders_id_of_my_leader);
CREATE INDEX IF NOT EXISTS idx_profiles_root_leader ON profiles(root_leader_id);

-- Speed up team access lookups
CREATE INDEX IF NOT EXISTS idx_team_access_owner ON team_access(owner_user_id, status);
CREATE INDEX IF NOT EXISTS idx_team_access_shared ON team_access(shared_with_user_id, status);

-- Speed up todos queries by user and due_date
CREATE INDEX IF NOT EXISTS idx_todos_user_due ON todos(user_id, due_date, completed);

-- Speed up sheets queries
CREATE INDEX IF NOT EXISTS idx_sheets_user ON sheets(user_id);

-- Speed up custom_options queries
CREATE INDEX IF NOT EXISTS idx_custom_options_user_type ON custom_options(user_id, option_type, is_active);

-- Speed up inbox messages queries
CREATE INDEX IF NOT EXISTS idx_inbox_recipient ON inbox_messages(recipient_user_id, created_at DESC);

-- Speed up leader levels lookups
CREATE INDEX IF NOT EXISTS idx_leader_levels_leader ON leader_levels(leader_id, position);