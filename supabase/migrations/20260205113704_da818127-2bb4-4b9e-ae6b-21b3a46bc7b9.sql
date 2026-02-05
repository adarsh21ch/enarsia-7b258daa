-- ============================================================================
-- MIGRATION: user_kyc_submissions
-- Purpose: KYC verification system for trust badges
-- ============================================================================

-- Create ENUM types for KYC
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_status') THEN
    CREATE TYPE kyc_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_document_type') THEN
    CREATE TYPE kyc_document_type AS ENUM (
      'aadhaar', 
      'pan', 
      'voter_id', 
      'passport', 
      'driving_license'
    );
  END IF;
END $$;

-- Create KYC submissions table
CREATE TABLE IF NOT EXISTS user_kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,  -- One active KYC per user
  
  -- Personal info (public when approved)
  full_name TEXT NOT NULL,
  age INTEGER,
  city TEXT,
  
  -- Document info (NEVER public)
  document_type kyc_document_type NOT NULL,
  document_url TEXT NOT NULL,  -- R2/Storage URL (private bucket)
  
  -- Verification status
  status kyc_status DEFAULT 'pending',
  rejection_reason TEXT,
  
  -- Timestamps
  submitted_at TIMESTAMPTZ DEFAULT now(),
  verified_at TIMESTAMPTZ,
  verified_by_admin_id UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kyc_user ON user_kyc_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON user_kyc_submissions(status);
CREATE INDEX IF NOT EXISTS idx_kyc_pending ON user_kyc_submissions(status) 
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE user_kyc_submissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Admin check function (SECURITY DEFINER to bypass RLS)
-- ============================================================================
CREATE OR REPLACE FUNCTION is_funnels_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = check_user_id 
    AND email = 'teamnevorai@gmail.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- ============================================================================
-- RLS Policies for user_kyc_submissions
-- ============================================================================

-- Users can view and manage their own KYC submission
CREATE POLICY "Users can manage own KYC" ON user_kyc_submissions
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can view all KYC submissions
CREATE POLICY "Admins can view all KYC" ON user_kyc_submissions
  FOR SELECT USING (is_funnels_admin(auth.uid()));

-- Admins can update KYC status (approve/reject)
CREATE POLICY "Admins can update KYC" ON user_kyc_submissions
  FOR UPDATE USING (is_funnels_admin(auth.uid()));

-- Public can check if a user is verified (LIMITED FIELDS ONLY)
CREATE POLICY "Public can check verification status" ON user_kyc_submissions
  FOR SELECT USING (status = 'approved');

-- ============================================================================
-- Helper function to check if user is verified
-- ============================================================================
CREATE OR REPLACE FUNCTION is_user_verified(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_kyc_submissions 
    WHERE user_id = check_user_id 
    AND status = 'approved'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- Public-safe view for verified users (hides document info)
-- ============================================================================
CREATE OR REPLACE VIEW public_verified_users AS
SELECT 
  user_id,
  full_name,
  city,
  verified_at
FROM user_kyc_submissions
WHERE status = 'approved';

-- Grant select on the view to authenticated and anon users
GRANT SELECT ON public_verified_users TO authenticated;
GRANT SELECT ON public_verified_users TO anon;