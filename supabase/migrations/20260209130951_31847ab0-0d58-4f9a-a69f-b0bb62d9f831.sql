ALTER TABLE nevorai_forms 
  ADD COLUMN IF NOT EXISTS is_accepting boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS close_date timestamptz DEFAULT NULL;