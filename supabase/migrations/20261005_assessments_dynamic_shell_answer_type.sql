-- Additive, idempotent: root-level columns for Dynamic Shell assessments.
-- The live DB lacked these (20260921 alignment migration was never applied remotely).
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS answer_type TEXT DEFAULT 'MULTIPLE_CHOICE';
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS is_dynamic_shell BOOLEAN NOT NULL DEFAULT FALSE;
SELECT pg_notify('pgrst', 'reload schema');
