-- ============================================================
-- MIGRATION: Add missing columns to assessments table
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS module_type TEXT;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS schedule_mode TEXT DEFAULT 'flexible';
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS window_start TIMESTAMPTZ;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS window_end TIMESTAMPTZ;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS question_order TEXT DEFAULT 'random';
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS payload JSONB;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS assessment_category TEXT;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS prerequisite_assessment_id UUID;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS availability_start TIMESTAMPTZ;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS availability_end TIMESTAMPTZ;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS shell_code TEXT;

CREATE INDEX IF NOT EXISTS idx_assessments_shell_code ON public.assessments (shell_code);
CREATE INDEX IF NOT EXISTS idx_assessments_assessment_category ON public.assessments (assessment_category);
CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON public.assessments (created_by);
