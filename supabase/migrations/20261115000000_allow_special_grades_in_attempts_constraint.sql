-- ============================================================================
-- TOPSCORE LMS — EXPAND ATTEMPTS GRADE CHECK CONSTRAINT FOR SPECIAL GRADES
-- Migration: 20261115000000_allow_special_grades_in_attempts_constraint.sql
-- Enables Special Grades per AGENTS.md §2.10:
--   'R' (Remedial, yellow capped 60%)
--   'F' (Forgiven, red waiver)
--   'M' (Manual Score, cyan override)
-- ============================================================================

BEGIN;

ALTER TABLE public.attempts
DROP CONSTRAINT IF EXISTS check_attempts_grade;

ALTER TABLE public.attempts
ADD CONSTRAINT check_attempts_grade
CHECK (grade IN ('★', 'A', 'B', 'C', 'D', 'E', 'R', 'F', 'M') OR grade IS NULL);

NOTIFY pgrst, 'reload schema';

COMMIT;
