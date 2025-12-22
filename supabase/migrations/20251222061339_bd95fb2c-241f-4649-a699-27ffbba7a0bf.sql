-- Add only_on_date column to todo_template_items for one-time tasks
ALTER TABLE todo_template_items
ADD COLUMN only_on_date date NULL DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN todo_template_items.only_on_date IS 'NULL = recurring daily, date = show only on that specific date';