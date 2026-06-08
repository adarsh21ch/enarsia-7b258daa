
ALTER TABLE public.academy_completions
  ADD COLUMN IF NOT EXISTS last_position_seconds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- existing rows are completions; ensure flag set
UPDATE public.academy_completions SET completed = true WHERE completed IS NULL OR completed = false;

CREATE OR REPLACE FUNCTION public.touch_academy_completions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_academy_completions_updated_at ON public.academy_completions;
CREATE TRIGGER trg_academy_completions_updated_at
BEFORE UPDATE ON public.academy_completions
FOR EACH ROW EXECUTE FUNCTION public.touch_academy_completions_updated_at();
