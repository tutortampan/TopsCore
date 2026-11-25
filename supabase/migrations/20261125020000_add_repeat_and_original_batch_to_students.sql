-- ==============================================================================
-- TOPSCORE LMS MIGRATION — 20261125020000
-- Add is_repeat and original_batch_id to public.students
-- Enables tracking repeat students and preserving initial cohort origin.
-- ==============================================================================

ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS is_repeat BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS original_batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL;
