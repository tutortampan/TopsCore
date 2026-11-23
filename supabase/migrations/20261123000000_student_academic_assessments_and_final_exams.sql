-- Migration: 20261123000000_student_academic_assessments_and_final_exams.sql
-- Description: Dedicated relational schema for weekly academic deposits, periodical exams, 5-subject step summaries, and final exam 2-panel evaluations.
-- Strict Additive Migration: Zero destructive alterations to existing tables

SET search_path = public, extensions;

-- 1. Table: student_academic_assessments
-- Stores weekly word deposits, storytelling weekly rubrics, grammar exams, basic/gfs/pronunciation tests, and speaking evaluations.
CREATE TABLE IF NOT EXISTS public.student_academic_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  step_level INT NOT NULL CHECK (step_level IN (1, 2, 3)),
  subject_code TEXT NOT NULL CHECK (subject_code IN ('VOCABULARY', 'STORYTELLING', 'GRAMMAR', 'BASIC', 'SPEAKING', 'GFS', 'PRONUNCIATION', 'PLACEMENT')),
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('WEEKLY_DEPOSIT', 'PERIODIC_EXAM', 'PRACTICE', 'DIAGNOSTIC')),
  assessment_key TEXT NOT NULL, -- 'W1', 'W2', 'W3', 'W4', 'U1', 'U2', 'U3', 'PRACTICE', 'PT'
  raw_score NUMERIC(7, 2), -- Raw word count, rubric 1-5, or raw score points
  target_score NUMERIC(7, 2), -- Target denominator (e.g. 90/98 words, 15 points, 25 points, 5.0)
  percentage NUMERIC(6, 2), -- Scaled 0-100 percentage: (raw_score / target_score) * 100
  grade TEXT, -- Grade letter ('A', 'B', 'C', 'D', 'E', '★')
  notes TEXT,
  assessed_by UUID REFERENCES public.tutor_profiles(id) ON DELETE SET NULL,
  assessed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_academic_assessment UNIQUE (student_id, step_level, subject_code, assessment_key)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_saa_student_step 
  ON public.student_academic_assessments (student_id, step_level);

CREATE INDEX IF NOT EXISTS idx_saa_batch_step 
  ON public.student_academic_assessments (batch_id, step_level);

CREATE INDEX IF NOT EXISTS idx_saa_batch_subject 
  ON public.student_academic_assessments (batch_id, subject_code);

-- 2. Table: student_final_examinations
-- Stores 2-panel final exam evaluations (Examiner + Speaking Tutor) and certificate dossier details
CREATE TABLE IF NOT EXISTS public.student_final_examinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  exam_date DATE DEFAULT CURRENT_DATE,
  
  -- Panel 1: Main Examiner (Mr. Sigit / Ms. Yesy) - Each 1-25 pts, Total 100
  examiner_name TEXT,
  examiner_fluency NUMERIC(4, 2) DEFAULT 0 CHECK (examiner_fluency >= 0 AND examiner_fluency <= 25),
  examiner_pronunciation NUMERIC(4, 2) DEFAULT 0 CHECK (examiner_pronunciation >= 0 AND examiner_pronunciation <= 25),
  examiner_idea NUMERIC(4, 2) DEFAULT 0 CHECK (examiner_idea >= 0 AND examiner_idea <= 25),
  examiner_grammar NUMERIC(4, 2) DEFAULT 0 CHECK (examiner_grammar >= 0 AND examiner_grammar <= 25),
  examiner_total NUMERIC(5, 2) GENERATED ALWAYS AS (
    COALESCE(examiner_fluency, 0) + COALESCE(examiner_pronunciation, 0) + COALESCE(examiner_idea, 0) + COALESCE(examiner_grammar, 0)
  ) STORED,

  -- Panel 2: Speaking Tutor (Mr. Adam) - Each 1-25 pts, Total 100
  tutor_name TEXT,
  tutor_fluency NUMERIC(4, 2) DEFAULT 0 CHECK (tutor_fluency >= 0 AND tutor_fluency <= 25),
  tutor_pronunciation NUMERIC(4, 2) DEFAULT 0 CHECK (tutor_pronunciation >= 0 AND tutor_pronunciation <= 25),
  tutor_grammar NUMERIC(4, 2) DEFAULT 0 CHECK (tutor_grammar >= 0 AND tutor_grammar <= 25),
  tutor_comprehension NUMERIC(4, 2) DEFAULT 0 CHECK (tutor_comprehension >= 0 AND tutor_comprehension <= 25),
  tutor_total NUMERIC(5, 2) GENERATED ALWAYS AS (
    COALESCE(tutor_fluency, 0) + COALESCE(tutor_pronunciation, 0) + COALESCE(tutor_grammar, 0) + COALESCE(tutor_comprehension, 0)
  ) STORED,

  -- Composite Final Practice Score (Average of 2 Panels)
  practice_score NUMERIC(5, 2),
  practice_predicate TEXT CHECK (practice_predicate IN ('LESS', 'ENOUGH', 'GOOD', 'VERY GOOD', 'EXCELLENT') OR practice_predicate IS NULL),

  -- 3-Step Cumulative Academic Scores (Imported or Calculated from 3 Steps)
  speaking_score NUMERIC(5, 2),
  speaking_predicate TEXT,
  vocab_score NUMERIC(5, 2),
  vocab_predicate TEXT,
  pronunciation_score NUMERIC(5, 2),
  pronunciation_predicate TEXT,
  grammar_score NUMERIC(5, 2),
  grammar_predicate TEXT,

  -- Final Certificate Result
  final_score NUMERIC(5, 2),
  certificate_predicate TEXT CHECK (certificate_predicate IN ('LESS', 'ENOUGH', 'GOOD', 'VERY GOOD', 'EXCELLENT') OR certificate_predicate IS NULL),
  certificate_nis TEXT, -- e.g. 'CEC/M/C.134001/XI/2026'
  certificate_month TEXT, -- e.g. 'XI'
  certificate_year INT DEFAULT 2026,
  
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'VERIFIED', 'ISSUED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sfe_batch 
  ON public.student_final_examinations (batch_id);

-- 3. Materialized / Dynamic View: v_student_step_summaries
-- Aggregates 5 subjects per student per step into authoritative NA and Step Average
CREATE OR REPLACE VIEW public.v_student_step_summaries AS
WITH subject_averages AS (
  SELECT
    student_id,
    batch_id,
    step_level,
    subject_code,
    ROUND(AVG(COALESCE(percentage, 0)), 2) AS na_score
  FROM public.student_academic_assessments
  GROUP BY student_id, batch_id, step_level, subject_code
),
pivoted AS (
  SELECT
    student_id,
    batch_id,
    step_level,
    MAX(CASE WHEN subject_code = 'VOCABULARY' THEN na_score END) AS na_vocab,
    MAX(CASE WHEN subject_code = 'STORYTELLING' THEN na_score END) AS na_storytelling,
    MAX(CASE WHEN subject_code = 'GRAMMAR' THEN na_score END) AS na_grammar,
    MAX(CASE WHEN subject_code IN ('BASIC', 'GFS', 'PRONUNCIATION') THEN na_score END) AS na_fourth_subject,
    MAX(CASE WHEN subject_code = 'SPEAKING' THEN na_score END) AS na_speaking
  FROM subject_averages
  GROUP BY student_id, batch_id, step_level
)
SELECT
  p.student_id,
  p.batch_id,
  p.step_level,
  p.na_vocab,
  p.na_storytelling,
  p.na_grammar,
  p.na_fourth_subject,
  p.na_speaking,
  ROUND(
    (
      COALESCE(p.na_vocab, 0) +
      COALESCE(p.na_storytelling, 0) +
      COALESCE(p.na_grammar, 0) +
      COALESCE(p.na_fourth_subject, 0) +
      COALESCE(p.na_speaking, 0)
    ) / NULLIF(
      (CASE WHEN p.na_vocab IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN p.na_storytelling IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN p.na_grammar IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN p.na_fourth_subject IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN p.na_speaking IS NOT NULL THEN 1 ELSE 0 END), 0
    ), 2
  ) AS step_average
FROM pivoted p;

-- 4. Enable RLS and Permissive Policies for Authenticated & Anon Clients
ALTER TABLE public.student_academic_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_final_examinations ENABLE ROW LEVEL SECURITY;

-- Permissive policies for read and write (consistent with admin & tutor access)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'student_academic_assessments' AND policyname = 'allow_all_academic_assessments'
  ) THEN
    CREATE POLICY allow_all_academic_assessments ON public.student_academic_assessments
      FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'student_final_examinations' AND policyname = 'allow_all_final_examinations'
  ) THEN
    CREATE POLICY allow_all_final_examinations ON public.student_final_examinations
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
