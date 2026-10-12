-- Migration: Cleanup 14 Verified 0-Row Legacy Tables
-- Reason: PostgREST schema cache optimization & elimination of dead schema baggage
-- Verified: 0 rows, 0 active application consumers, 0 foreign keys from active tables

DROP TABLE IF EXISTS public.assessment_attempt_answers CASCADE;
DROP TABLE IF EXISTS public.assessment_attempts CASCADE;
DROP TABLE IF EXISTS public.assessment_instances CASCADE;
DROP TABLE IF EXISTS public.exam_history CASCADE;
DROP TABLE IF EXISTS public.student_accounts CASCADE;
DROP TABLE IF EXISTS public.student_import_logs CASCADE;
DROP TABLE IF EXISTS public.student_progress CASCADE;
DROP TABLE IF EXISTS public.student_requirement_progress CASCADE;
DROP TABLE IF EXISTS public.student_target_progress CASCADE;
DROP TABLE IF EXISTS public.requirement_targets CASCADE;
DROP TABLE IF EXISTS public.requirements CASCADE;
DROP TABLE IF EXISTS public.achievement_targets CASCADE;
DROP TABLE IF EXISTS public.additional_members CASCADE;
DROP TABLE IF EXISTS public.scholarships CASCADE;

NOTIFY pgrst, 'reload schema';
