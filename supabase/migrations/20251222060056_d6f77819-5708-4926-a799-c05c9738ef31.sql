-- Update default for future inserts
ALTER TABLE todo_template_items
ALTER COLUMN template_name
SET DEFAULT 'Compulsory Actions';

-- Update existing rows with old name
UPDATE todo_template_items
SET template_name = 'Compulsory Actions'
WHERE template_name = 'Todo Template';

-- Add flag to profiles for leader prompt completion
ALTER TABLE profiles
ADD COLUMN leader_prompt_completed boolean NOT NULL DEFAULT false;