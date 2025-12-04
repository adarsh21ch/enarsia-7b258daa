-- Remove default values from prospects table so new prospects start with null/"Select..." state
ALTER TABLE prospects ALTER COLUMN funnel_stage DROP DEFAULT;
ALTER TABLE prospects ALTER COLUMN priority DROP DEFAULT;