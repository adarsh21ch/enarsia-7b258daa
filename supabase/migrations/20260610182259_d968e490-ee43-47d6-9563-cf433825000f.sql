
-- =========================================================
-- 1. BACKFILL upline_leader_id on existing snapshot rows
-- =========================================================
-- Helper inline expression replicating resolve_upline_leader_id logic but parameterised
-- (the existing trigger fn is row-scoped; we need a callable version for backfill / restamp).

CREATE OR REPLACE FUNCTION public.resolve_upline_for_user(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upline_email   text;
  v_leader_neverai text;
  v_resolved       uuid;
BEGIN
  SELECT upline_email, leaders_id_of_my_leader
    INTO v_upline_email, v_leader_neverai
    FROM profiles
   WHERE user_id = p_user_id
   LIMIT 1;

  IF v_upline_email IS NOT NULL AND v_upline_email <> '' THEN
    SELECT user_id INTO v_resolved
      FROM profiles
     WHERE lower(email) = lower(v_upline_email)
     LIMIT 1;
  END IF;

  IF v_resolved IS NULL
     AND v_leader_neverai IS NOT NULL
     AND v_leader_neverai <> '' THEN
    SELECT user_id INTO v_resolved
      FROM profiles
     WHERE neverai_id = v_leader_neverai
     LIMIT 1;
  END IF;

  RETURN v_resolved;
END;
$$;

-- Backfill all three snapshot tables
UPDATE public.personal_snapshot_v2
   SET upline_leader_id = public.resolve_upline_for_user(user_id)
 WHERE upline_leader_id IS NULL;

UPDATE public.total_snapshot_v2
   SET upline_leader_id = public.resolve_upline_for_user(user_id)
 WHERE upline_leader_id IS NULL;

-- team_snapshot_v2 uses leader_user_id directly, no upline_leader_id column to backfill

-- =========================================================
-- 2. RESTAMP on profile re-parenting
-- =========================================================
CREATE OR REPLACE FUNCTION public.restamp_upline_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_upline uuid;
BEGIN
  -- Only run when upline-defining columns actually change
  IF (COALESCE(NEW.upline_email, '') IS DISTINCT FROM COALESCE(OLD.upline_email, ''))
     OR (COALESCE(NEW.leaders_id_of_my_leader, '') IS DISTINCT FROM COALESCE(OLD.leaders_id_of_my_leader, ''))
     OR (COALESCE(NEW.root_leader_id::text, '') IS DISTINCT FROM COALESCE(OLD.root_leader_id::text, ''))
  THEN
    v_new_upline := public.resolve_upline_for_user(NEW.user_id);

    UPDATE public.personal_snapshot_v2
       SET upline_leader_id = v_new_upline
     WHERE user_id = NEW.user_id;

    UPDATE public.total_snapshot_v2
       SET upline_leader_id = v_new_upline
     WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restamp_upline_on_profile_change ON public.profiles;
CREATE TRIGGER trg_restamp_upline_on_profile_change
  AFTER UPDATE OF upline_email, leaders_id_of_my_leader, root_leader_id
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.restamp_upline_for_user();

-- =========================================================
-- 3. UPLINE READ-ONLY policies for Prospect View Mode
--    (prospects already has can_leader_view_member policy)
-- =========================================================

-- todos
DROP POLICY IF EXISTS "Upline can view downline todos" ON public.todos;
CREATE POLICY "Upline can view downline todos"
  ON public.todos FOR SELECT
  USING (auth.uid() = user_id OR public.can_leader_view_member(auth.uid(), user_id));

-- daily_tracking_logs
DROP POLICY IF EXISTS "Upline can view downline tracking logs" ON public.daily_tracking_logs;
CREATE POLICY "Upline can view downline tracking logs"
  ON public.daily_tracking_logs FOR SELECT
  USING (auth.uid() = user_id OR public.can_leader_view_member(auth.uid(), user_id));

-- user_daily_task_status
DROP POLICY IF EXISTS "Upline can view downline task status" ON public.user_daily_task_status;
CREATE POLICY "Upline can view downline task status"
  ON public.user_daily_task_status FOR SELECT
  USING (auth.uid() = user_id OR public.can_leader_view_member(auth.uid(), user_id));

-- user_daily_tasks
DROP POLICY IF EXISTS "Upline can view downline daily tasks" ON public.user_daily_tasks;
CREATE POLICY "Upline can view downline daily tasks"
  ON public.user_daily_tasks FOR SELECT
  USING (auth.uid() = user_id OR public.can_leader_view_member(auth.uid(), user_id));

-- sheets (needed for Calling/Follow-up tabs sheet filter)
DROP POLICY IF EXISTS "Upline can view downline sheets" ON public.sheets;
CREATE POLICY "Upline can view downline sheets"
  ON public.sheets FOR SELECT
  USING (auth.uid() = user_id OR public.can_leader_view_member(auth.uid(), user_id));

-- activity_logs (for Recent Activity tab)
DROP POLICY IF EXISTS "Upline can view downline activity logs" ON public.activity_logs;
CREATE POLICY "Upline can view downline activity logs"
  ON public.activity_logs FOR SELECT
  USING (auth.uid() = user_id OR public.can_leader_view_member(auth.uid(), user_id));

-- =========================================================
-- 4. MEMBER PRIORITY table
-- =========================================================
CREATE TABLE IF NOT EXISTS public.member_priority (
  leader_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rank             integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (leader_id, member_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_priority TO authenticated;
GRANT ALL ON public.member_priority TO service_role;

ALTER TABLE public.member_priority ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leader manages own priority list" ON public.member_priority;
CREATE POLICY "Leader manages own priority list"
  ON public.member_priority FOR ALL
  USING (auth.uid() = leader_id)
  WITH CHECK (auth.uid() = leader_id);

CREATE INDEX IF NOT EXISTS idx_member_priority_leader ON public.member_priority(leader_id);
