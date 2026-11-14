-- ============================================================================
-- Migration: Add Province & City and Backfill Existing Students to NTB / Kota Mataram
-- TopsCore LMS — Phase 488
-- ============================================================================

-- 1. Ensure columns exist
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT;

-- 2. Backfill existing active students, students with test attempts, or students who completed onboarding
UPDATE public.students
SET province = 'Nusa Tenggara Barat',
    city = 'Kota Mataram'
WHERE (province IS NULL OR city IS NULL)
  AND (
    id IN (SELECT DISTINCT student_id FROM public.attempts)
    OR gender IS NOT NULL
    OR education IS NOT NULL
  );

COMMENT ON COLUMN public.students.province IS 'Indonesian Province (38 Provinces, Default NTB)';
COMMENT ON COLUMN public.students.city IS 'Indonesian City/Regency (514 Cities, Default Kota Mataram)';
