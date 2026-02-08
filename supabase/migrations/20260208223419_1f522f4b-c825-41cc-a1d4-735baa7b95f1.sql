
CREATE TABLE IF NOT EXISTS public.funnel_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  granted_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(funnel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_funnel_access_user ON public.funnel_access(user_id);
CREATE INDEX IF NOT EXISTS idx_funnel_access_funnel ON public.funnel_access(funnel_id);

ALTER TABLE public.funnel_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "funnel_access_select"
ON public.funnel_access FOR SELECT
USING (user_id = auth.uid() OR granted_by_user_id = auth.uid());

CREATE POLICY "funnel_access_insert"
ON public.funnel_access FOR INSERT
WITH CHECK (
  granted_by_user_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM public.funnels
      WHERE id = funnel_id AND owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.funnel_access existing
      WHERE existing.funnel_id = funnel_access.funnel_id
        AND existing.user_id = auth.uid()
    )
  )
);

CREATE POLICY "funnel_access_delete"
ON public.funnel_access FOR DELETE
USING (granted_by_user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can manage funnels" ON public.funnels;
DROP POLICY IF EXISTS "Public can view published funnels" ON public.funnels;

CREATE POLICY "funnels_owner_all"
ON public.funnels FOR ALL
USING (owner_user_id = auth.uid());

CREATE POLICY "funnels_public_select"
ON public.funnels FOR SELECT
USING (is_published = true);

CREATE POLICY "funnels_shared_select"
ON public.funnels FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.funnel_access
    WHERE funnel_access.funnel_id = funnels.id
      AND funnel_access.user_id = auth.uid()
  )
);
