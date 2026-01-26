-- Table for OTP storage
CREATE TABLE public.email_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  verified BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_email_otps_email ON public.email_otps(email);
CREATE INDEX idx_email_otps_expires ON public.email_otps(expires_at);

-- RLS: No direct access from client (edge functions use service role)
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- Track Achievers Club users who haven't signed up in NeverAI yet
CREATE TABLE public.achievers_club_pending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  leader_id TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  claimed_user_id UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_ac_pending_email ON public.achievers_club_pending(email);

-- RLS: No direct access
ALTER TABLE public.achievers_club_pending ENABLE ROW LEVEL SECURITY;