-- Recreate the auto-normalization trigger
CREATE TRIGGER normalize_leader_ids_before_upsert
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_leader_ids_trigger();