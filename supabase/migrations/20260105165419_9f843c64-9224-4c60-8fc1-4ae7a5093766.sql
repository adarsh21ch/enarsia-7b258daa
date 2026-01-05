-- Drop the policy that depends on is_in_downline
DROP POLICY IF EXISTS "Users can view own and L1-L3 downline prospects" ON public.prospects;

-- Drop the existing is_in_downline function  
DROP FUNCTION IF EXISTS public.is_in_downline(UUID, UUID);

-- Recreate is_in_downline with normalized comparison
CREATE OR REPLACE FUNCTION public.is_in_downline(viewer_user_id UUID, target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer_neverai_id TEXT;
  v_target_leaders_id TEXT;
  v_target_root_id TEXT;
BEGIN
  -- Same user check
  IF viewer_user_id = target_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Get viewer's normalized neverai_id
  SELECT neverai_id INTO v_viewer_neverai_id
  FROM public.profiles
  WHERE user_id = viewer_user_id;
  
  IF v_viewer_neverai_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get target's normalized leader references
  SELECT leaders_id_of_my_leader, root_leader_id 
  INTO v_target_leaders_id, v_target_root_id
  FROM public.profiles
  WHERE user_id = target_user_id;
  
  -- Check if viewer is the direct leader or root leader (using normalized comparison)
  RETURN (
    public.normalize_leader_id(v_target_leaders_id) = public.normalize_leader_id(v_viewer_neverai_id) OR
    public.normalize_leader_id(v_target_root_id) = public.normalize_leader_id(v_viewer_neverai_id)
  );
END;
$$;

-- Recreate the RLS policy for prospects with the updated function
CREATE POLICY "Users can view own and L1-L3 downline prospects"
ON public.prospects
FOR SELECT
USING (public.is_in_downline(auth.uid(), user_id));

-- Recreate the auto-normalization trigger
CREATE OR REPLACE FUNCTION public.normalize_leader_ids_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Normalize neverai_id on insert/update
  IF NEW.neverai_id IS NOT NULL AND NEW.neverai_id != '' THEN
    NEW.neverai_id := public.normalize_leader_id(NEW.neverai_id);
  END IF;
  
  -- Normalize leaders_id_of_my_leader on insert/update
  IF NEW.leaders_id_of_my_leader IS NOT NULL AND NEW.leaders_id_of_my_leader != '' THEN
    NEW.leaders_id_of_my_leader := public.normalize_leader_id(NEW.leaders_id_of_my_leader);
  END IF;
  
  -- Normalize root_leader_id on insert/update
  IF NEW.root_leader_id IS NOT NULL AND NEW.root_leader_id != '' THEN
    NEW.root_leader_id := public.normalize_leader_id(NEW.root_leader_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger (drop if exists first to avoid duplicate)
DROP TRIGGER IF EXISTS normalize_leader_ids_before_upsert ON public.profiles;

CREATE TRIGGER normalize_leader_ids_before_upsert
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_leader_ids_trigger();