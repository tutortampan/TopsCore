-- Level Completed status store (Level 3 is terminal; no Level 4) + answer_type backfill.
-- Additive / idempotent.
ALTER TABLE public.progress ADD COLUMN IF NOT EXISTS level_status TEXT;
ALTER TABLE public.progress ADD COLUMN IF NOT EXISTS level_completed_at TIMESTAMPTZ;

UPDATE public.assessments SET answer_type = 'speech_to_text' WHERE assessment_type = 'VOCAB_TASK' OR shell_code LIKE 'VOCAB-TASK%';
UPDATE public.assessments SET answer_type = 'written' WHERE assessment_type = 'VOCAB_TEST' OR shell_code LIKE 'VOCAB-TEST%';
UPDATE public.assessments SET answer_type = 'dropdown' WHERE assessment_type LIKE 'PHRASE%' OR shell_code LIKE 'PHRASE%';
UPDATE public.assessments SET is_dynamic_shell = TRUE WHERE (payload->>'is_dynamic_shell') = 'true';

SELECT pg_notify('pgrst', 'reload schema');
