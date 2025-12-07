-- Add sort_order column to prospects table for drag-and-drop row ordering
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS sort_order integer;

-- Initialize sort_order for existing prospects based on date_added (newest first = lower sort_order)
UPDATE public.prospects 
SET sort_order = sub.row_num 
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY date_added DESC) as row_num 
  FROM public.prospects
) sub 
WHERE public.prospects.id = sub.id;