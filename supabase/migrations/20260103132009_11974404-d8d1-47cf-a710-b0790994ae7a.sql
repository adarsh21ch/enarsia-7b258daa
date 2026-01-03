-- Step 1: Create ac_profiles table
CREATE TABLE IF NOT EXISTS public.ac_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  dob DATE NOT NULL,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ac_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ac_profile" ON public.ac_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ac_profile" ON public.ac_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ac_profile" ON public.ac_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Step 2: Create ac_join_requests table
CREATE TABLE IF NOT EXISTS public.ac_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upline_user_id UUID NOT NULL REFERENCES auth.users(id),
  entered_upline_leader_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ac_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests" ON public.ac_join_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Uplines can view requests to approve" ON public.ac_join_requests
  FOR SELECT USING (auth.uid() = upline_user_id);

CREATE POLICY "Users can insert own requests" ON public.ac_join_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Uplines can update requests" ON public.ac_join_requests
  FOR UPDATE USING (auth.uid() = upline_user_id);

-- Step 3: Add new columns to existing ac_notifications table
ALTER TABLE public.ac_notifications 
  ADD COLUMN IF NOT EXISTS receiver_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS payload_json JSONB;

-- Step 4: Add RLS policy for receiver_user_id access
CREATE POLICY "Users can view notifications by receiver_user_id" ON public.ac_notifications
  FOR SELECT USING (auth.uid() = receiver_user_id);

CREATE POLICY "Users can update notifications by receiver_user_id" ON public.ac_notifications
  FOR UPDATE USING (auth.uid() = receiver_user_id);