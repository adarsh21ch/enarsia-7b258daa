-- Add indexes for activity_logs to improve query performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON public.activity_logs (user_id, created_at DESC);

-- Add index for prospects updated_at for activity feed queries
CREATE INDEX IF NOT EXISTS idx_prospects_user_updated ON public.prospects (user_id, updated_at DESC);

-- Add index for todos updated_at
CREATE INDEX IF NOT EXISTS idx_todos_user_updated ON public.todos (user_id, updated_at DESC);