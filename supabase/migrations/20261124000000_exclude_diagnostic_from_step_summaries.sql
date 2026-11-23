-- Migration: 20261124000000_exclude_diagnostic_from_step_summaries.sql
-- Description: Update v_student_step_summaries to strictly exclude DIAGNOSTIC (PT / Placement Test) from subject NA (Nilai Akhir) calculations, matching Excel SSOT.

SET search_path = public, extensions;

CREATE OR REPLACE VIEW public.v_student_step_summaries AS
WITH subject_averages AS (
  SELECT
    student_id,
    batch_id,
    step_level,
    subject_code,
    ROUND(AVG(COALESCE(percentage, 0)), 2) AS na_score
  FROM public.student_academic_assessments
  WHERE assessment_type != 'DIAGNOSTIC' AND assessment_key != 'PT'
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
