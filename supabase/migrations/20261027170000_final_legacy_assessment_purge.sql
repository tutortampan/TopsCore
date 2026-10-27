-- ============================================================================
-- TOPSCORE LMS — FINAL LEGACY ASSESSMENT PURGE
-- Migration: 20261027170000_final_legacy_assessment_purge.sql
-- Safely drop old legacy assessment tables/columns after live traffic verification
-- ============================================================================

BEGIN;

-- 1. Enforce NOT NULL on new relational foreign key
ALTER TABLE public.attempts ALTER COLUMN test_id SET NOT NULL;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'test_id') THEN
        ALTER TABLE public.assignments ALTER COLUMN test_id SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'student_submissions' AND column_name = 'test_id') THEN
        ALTER TABLE public.student_submissions ALTER COLUMN test_id SET NOT NULL;
    END IF;
END $$;

-- 2. Drop legacy foreign key columns
ALTER TABLE public.attempts DROP COLUMN IF EXISTS assessment_id CASCADE;
ALTER TABLE public.assignments DROP COLUMN IF EXISTS assessment_id CASCADE;
ALTER TABLE public.student_submissions DROP COLUMN IF EXISTS assessment_id CASCADE;
ALTER TABLE public.question_usage_history DROP COLUMN IF EXISTS assessment_id CASCADE;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exam_history') THEN
        ALTER TABLE public.exam_history DROP COLUMN IF EXISTS assessment_id CASCADE;
    END IF;
END $$;

-- 3. Drop all legacy assessment tables (Zero Residue)
DROP TABLE IF EXISTS public.assessment_attempt_answers CASCADE;
DROP TABLE IF EXISTS public.assessment_attempts CASCADE;
DROP TABLE IF EXISTS public.assessment_results CASCADE;
DROP TABLE IF EXISTS public.assessment_topics CASCADE;
DROP TABLE IF EXISTS public.assessment_instances CASCADE;
DROP TABLE IF EXISTS public.assessment_questions CASCADE;
DROP TABLE IF EXISTS public.assessments CASCADE;

-- 4. Drop legacy RPC functions
DROP FUNCTION IF EXISTS public.reorder_assessment(uuid, integer, uuid);

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
