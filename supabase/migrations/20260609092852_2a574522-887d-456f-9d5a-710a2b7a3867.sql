CREATE POLICY "Leaders can view downline daily task status"
ON public.todo_daily_task_status
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles m
    JOIN public.profiles l ON l.user_id = auth.uid()
    WHERE m.user_id = todo_daily_task_status.user_id
      AND m.allow_leader_to_view = true
      AND (
        (m.upline_email IS NOT NULL
          AND l.email IS NOT NULL
          AND lower(m.upline_email) = lower(l.email))
        OR (m.leaders_id_of_my_leader IS NOT NULL
          AND l.neverai_id IS NOT NULL
          AND upper(m.leaders_id_of_my_leader) = upper(l.neverai_id))
      )
  )
);