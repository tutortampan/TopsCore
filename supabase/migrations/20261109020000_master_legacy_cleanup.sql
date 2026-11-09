-- ============================================================================
-- TOPSCORE LMS — MASTER LEGACY CLEANUP & SCHEMA RATIONALIZATION
-- Migration: 20261109020000_master_legacy_cleanup.sql
-- Purpose: Purge 16 obsolete/zero-row legacy tables, 3 dead RPC functions,
--          and redundant duplicate/NULL columns from active core tables.
-- ============================================================================

BEGIN;

-- 1. Drop 16 Obsolete / Zero-Row Tables
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.cec_app_state CASCADE;
DROP TABLE IF EXISTS public.enrollments CASCADE;
DROP TABLE IF EXISTS public.assignments CASCADE;
DROP TABLE IF EXISTS public.class_meetings CASCADE;
DROP TABLE IF EXISTS public.class_meeting_exceptions CASCADE;
DROP TABLE IF EXISTS public.class_instances CASCADE;
DROP TABLE IF EXISTS public.professional_skills CASCADE;
DROP TABLE IF EXISTS public.user_professionals CASCADE;
DROP TABLE IF EXISTS public.work_records CASCADE;
DROP TABLE IF EXISTS public.question_usage_history CASCADE;
DROP TABLE IF EXISTS public.questions CASCADE;
DROP TABLE IF EXISTS public.test_items CASCADE;
DROP TABLE IF EXISTS public.test_results CASCADE;
DROP TABLE IF EXISTS public.test_topics CASCADE;
DROP TABLE IF EXISTS public.student_submissions CASCADE;

-- 2. Drop Dead RPC Functions & Triggers
DROP FUNCTION IF EXISTS public.validate_student_hierarchy() CASCADE;
DROP FUNCTION IF EXISTS public.merge_student_import(text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.reorder_assessment(uuid, integer, uuid) CASCADE;

-- 3. Drop Redundant / 100% NULL Columns on Active Tables
ALTER TABLE public.tests DROP COLUMN IF EXISTS prerequisite_id;
ALTER TABLE public.tests DROP COLUMN IF EXISTS window_start;
ALTER TABLE public.tests DROP COLUMN IF EXISTS window_end;
ALTER TABLE public.progress DROP COLUMN IF EXISTS level_status;
ALTER TABLE public.progress DROP COLUMN IF EXISTS level_completed_at;

-- 4. Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';

COMMIT;

