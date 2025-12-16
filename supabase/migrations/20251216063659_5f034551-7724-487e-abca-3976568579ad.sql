-- Enable realtime for profiles table to support instant tag sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;