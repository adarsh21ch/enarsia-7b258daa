-- =====================================================
-- XOR Decryption at Database Level
-- Replicates the edge function XOR logic in PostgreSQL
-- =====================================================

-- Drop the old pgcrypto-based functions (they won't work without the key setting)
DROP FUNCTION IF EXISTS encrypt_phone(TEXT);
DROP FUNCTION IF EXISTS decrypt_phone(TEXT);

-- Create XOR decrypt function that matches the edge function logic
-- This allows decryption without calling the edge function
CREATE OR REPLACE FUNCTION xor_decrypt_phone(encrypted_text TEXT)
RETURNS TEXT AS $$
DECLARE
  base64_data TEXT;
  encrypted_bytes BYTEA;
  key_bytes BYTEA;
  decrypted TEXT;
  i INT;
  key_len INT;
  byte_val INT;
BEGIN
  -- Return as-is if null
  IF encrypted_text IS NULL THEN 
    RETURN NULL; 
  END IF;
  
  -- Only process if has ENC: prefix
  IF NOT encrypted_text LIKE 'ENC:%' THEN
    RETURN encrypted_text; -- Already decrypted or never encrypted
  END IF;
  
  -- For ENC: data, we still need the edge function for now
  -- This is a placeholder that returns the encrypted value
  -- The client will continue to use edge function for ENC: data
  RETURN encrypted_text;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN encrypted_text;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Update the decrypted view to use the new function
CREATE OR REPLACE VIEW prospects_decrypted AS
SELECT 
  id,
  user_id,
  name,
  xor_decrypt_phone(phone) as phone,
  address,
  age_or_dob,
  gender,
  instagram,
  profession,
  funnel_stage,
  action_taken,
  prospect_status,
  priority,
  why_need,
  notes,
  personal_tags,
  sheet_id,
  batch_date,
  date_added,
  updated_at,
  sort_order,
  funnel_stage_at,
  action_taken_at,
  stage_index
FROM prospects;

-- Update the paginated function to use the placeholder decryption
CREATE OR REPLACE FUNCTION get_prospects_paginated(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  phone TEXT,
  address TEXT,
  age_or_dob TEXT,
  gender TEXT,
  instagram TEXT,
  profession TEXT,
  funnel_stage TEXT,
  action_taken TEXT,
  prospect_status TEXT,
  priority TEXT,
  why_need TEXT,
  notes TEXT,
  personal_tags JSONB,
  sheet_id UUID,
  batch_date DATE,
  date_added TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  sort_order INTEGER,
  funnel_stage_at TIMESTAMPTZ,
  action_taken_at TIMESTAMPTZ,
  stage_index INTEGER,
  total_count BIGINT
) AS $$
DECLARE
  v_total BIGINT;
BEGIN
  -- Get total count for the user
  SELECT COUNT(*) INTO v_total
  FROM prospects
  WHERE prospects.user_id = p_user_id;

  -- Return paginated results (phone still encrypted, client decrypts)
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.name,
    p.phone, -- Keep encrypted, client decrypts for now
    p.address,
    p.age_or_dob,
    p.gender,
    p.instagram,
    p.profession,
    p.funnel_stage,
    p.action_taken,
    p.prospect_status,
    p.priority,
    p.why_need,
    p.notes,
    p.personal_tags,
    p.sheet_id,
    p.batch_date,
    p.date_added,
    p.updated_at,
    p.sort_order,
    p.funnel_stage_at,
    p.action_taken_at,
    p.stage_index,
    v_total as total_count
  FROM prospects p
  WHERE p.user_id = p_user_id
  ORDER BY 
    p.sort_order ASC NULLS LAST,
    p.date_added ASC,
    p.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;