-- Revert module_id from classes
ALTER TABLE public.classes DROP COLUMN IF EXISTS module_id;
