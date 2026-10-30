-- ============================================================================
-- TOPSCORE LMS — PERFORMANCE INDEXES
-- Migration: 20261030160000_performance_indexes.sql
-- Purpose: Optimize query performance on high-frequency tables:
--          attempts, attempt_answers, and students.
-- ============================================================================

-- 1. Index attempts lookup by student and test (used for progression & best score queries)
CREATE INDEX IF NOT EXISTS idx_attempts_student_test ON public.attempts(student_id, test_id);

-- 2. Index attempt answers lookup by attempt_id (used when fetching answers for an attempt)
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt_id ON public.attempt_answers(attempt_id);

-- 3. Index students lookup by batch_id (used in batch roster and class progress views)
CREATE INDEX IF NOT EXISTS idx_students_batch_id ON public.students(batch_id);

-- 4. Index students lookup by program_id (used in program management and program-level filters)
CREATE INDEX IF NOT EXISTS idx_students_program_id ON public.students(program_id);
