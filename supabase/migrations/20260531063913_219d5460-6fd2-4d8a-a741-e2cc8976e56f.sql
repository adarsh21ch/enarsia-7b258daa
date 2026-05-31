
CREATE TABLE IF NOT EXISTS public.posting_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posting_tasks TO authenticated;
GRANT ALL ON public.posting_tasks TO service_role;

ALTER TABLE public.posting_tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "posting_tasks_select_own" ON public.posting_tasks FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "posting_tasks_insert_own" ON public.posting_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "posting_tasks_update_own" ON public.posting_tasks FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "posting_tasks_delete_own" ON public.posting_tasks FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS posting_tasks_user_idx ON public.posting_tasks(user_id, is_active);

CREATE TABLE IF NOT EXISTS public.posting_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id UUID NOT NULL REFERENCES public.posting_tasks(id) ON DELETE CASCADE,
  account_id UUID NULL,
  done_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT posting_logs_task_date_uniq UNIQUE (task_id, done_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posting_logs TO authenticated;
GRANT ALL ON public.posting_logs TO service_role;

ALTER TABLE public.posting_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "posting_logs_select_own" ON public.posting_logs FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "posting_logs_insert_own" ON public.posting_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "posting_logs_update_own" ON public.posting_logs FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "posting_logs_delete_own" ON public.posting_logs FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS posting_logs_user_date_idx ON public.posting_logs(user_id, done_date);

DO $$ BEGIN
  CREATE TRIGGER posting_tasks_updated_at
    BEFORE UPDATE ON public.posting_tasks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
