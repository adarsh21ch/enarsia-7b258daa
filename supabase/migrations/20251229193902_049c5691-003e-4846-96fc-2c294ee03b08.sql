-- Fix SECURITY DEFINER view issue by dropping the view
-- The view was created with SECURITY DEFINER which bypasses RLS
-- We'll use the paginated function instead which respects security
DROP VIEW IF EXISTS prospects_decrypted;