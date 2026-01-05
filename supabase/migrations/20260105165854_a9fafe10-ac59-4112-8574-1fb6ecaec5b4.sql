-- First, temporarily drop the trigger that uses normalize_leader_id
DROP TRIGGER IF EXISTS normalize_leader_ids_before_upsert ON public.profiles;