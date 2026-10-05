-- ============================================================
-- MIGRATION: IMPLEMENT TASK & TEST ARCHITECTURE
-- Phase 1 of Master Blueprint Execution
-- ============================================================

-- 1. Add formal prerequisite relationship for Sequential Gating
ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS prerequisite_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL;

-- 2. Add assessment_category column for the Task/Test binary taxonomy
--    This is the PRIMARY new column used by the app going forward.
--    'TASK'  = Daily practice (was: Task/Assignment)
--    'TEST'  = Weekly/Final evaluation (was: Exam/Evaluation)
ALTER TABLE public.assessments
ADD COLUMN IF NOT EXISTS assessment_category VARCHAR(10)
  CHECK (assessment_category IN ('TASK', 'TEST'));

-- 3. Backfill existing rows based on assessment_type naming patterns
UPDATE public.assessments
SET assessment_category = 'TASK'
WHERE assessment_category IS NULL
  AND (assessment_type ILIKE '%task%' OR assessment_type ILIKE '%quiz%' OR assessment_type ILIKE '%vocab_task%');

UPDATE public.assessments
SET assessment_category = 'TEST'
WHERE assessment_category IS NULL
  AND (assessment_type ILIKE '%exam%' OR assessment_type ILIKE '%test%' OR assessment_type ILIKE '%evaluation%');

-- 4. (Optional) Enforce going forward via the app layer, not a hard NOT NULL yet
--    to avoid locking out existing rows that haven't been classified.

