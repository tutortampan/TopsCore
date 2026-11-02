-- Migration: Drop dead legacy trigger referencing dropped table additional_members
-- Date: 2026-11-03
-- Context: additional_members was dropped in 20261013000000_cleanup_legacy_tables.sql.
-- The lingering trigger trigger_student_batch_change caused any UPDATE on students.batch_id
-- to throw error 42P01: relation "additional_members" does not exist.

DROP TRIGGER IF EXISTS trigger_student_batch_change ON public.students;
DROP FUNCTION IF EXISTS public.trg_student_batch_change();

NOTIFY pgrst, 'reload schema';
