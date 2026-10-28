-- ============================================================================
-- TOPSCORE LMS — CANONICAL GRADES BACKFILL AND CONSTRAINT
-- Migration: 20261028110000_canonical_grades_backfill_and_constraint.sql
-- Eliminates non-standard grades ('S', 'F') per AGENTS.md §2.10
-- Backfills null grades, and establishes strict CHECK constraint on attempts.grade
-- ============================================================================

BEGIN;

-- 1. Backfill legacy Grade 'S' (100% Star tier) -> '★'
UPDATE public.attempts
SET grade = '★',
    updated_at = NOW()
WHERE grade = 'S' OR (COALESCE(effective_score, percentage) >= 100 AND grade IS NULL);

-- 2. Backfill legacy Grade 'F' (Fail tier 0-29%) -> 'E'
UPDATE public.attempts
SET grade = 'E',
    updated_at = NOW()
WHERE grade = 'F';

-- 3. Backfill any remaining NULL grades based on effective_score / percentage
UPDATE public.attempts
SET grade = CASE
      WHEN COALESCE(effective_score, percentage) >= 100 THEN '★'
      WHEN COALESCE(effective_score, percentage) >= 90 THEN 'A'
      WHEN COALESCE(effective_score, percentage) >= 80 THEN 'B'
      WHEN COALESCE(effective_score, percentage) >= 60 THEN 'C'
      WHEN COALESCE(effective_score, percentage) >= 30 THEN 'D'
      ELSE 'E'
    END,
    updated_at = NOW()
WHERE grade IS NULL AND (effective_score IS NOT NULL OR percentage IS NOT NULL);

-- 4. Add CHECK constraint on attempts.grade
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_attempts_grade'
    ) THEN
        ALTER TABLE public.attempts
        ADD CONSTRAINT check_attempts_grade
        CHECK (grade IN ('★', 'A', 'B', 'C', 'D', 'E') OR grade IS NULL);
    END IF;
END $$;

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
