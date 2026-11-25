-- TopsCore LMS — Opsi B: Decouple attempts from tests (ON DELETE SET NULL + Snapshot Metadata)
-- Ensures student scores and attempts remain 100% intact and self-contained even when tests are deleted or replaced.

-- 1. Add snapshot columns to public.attempts
ALTER TABLE public.attempts
  ADD COLUMN IF NOT EXISTS test_shell_code text,
  ADD COLUMN IF NOT EXISTS test_title text,
  ADD COLUMN IF NOT EXISTS test_type text,
  ADD COLUMN IF NOT EXISTS test_subtype text,
  ADD COLUMN IF NOT EXISTS test_category text,
  ADD COLUMN IF NOT EXISTS class_id uuid,
  ADD COLUMN IF NOT EXISTS level_id uuid,
  ADD COLUMN IF NOT EXISTS theme_code text,
  ADD COLUMN IF NOT EXISTS topic_code text;

-- 2. Ensure test_id is nullable and change FK constraint from ON DELETE CASCADE to ON DELETE SET NULL
ALTER TABLE public.attempts
  ALTER COLUMN test_id DROP NOT NULL;

DO $$
DECLARE
  fk_name text;
BEGIN
  FOR fk_name IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'attempts'
      AND kcu.column_name = 'test_id'
  LOOP
    EXECUTE format('ALTER TABLE public.attempts DROP CONSTRAINT IF EXISTS %I', fk_name);
  END LOOP;
END $$;

ALTER TABLE public.attempts
  ADD CONSTRAINT attempts_test_id_fkey
  FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE SET NULL;

-- 3. Index for fast shell_code lookups
CREATE INDEX IF NOT EXISTS idx_attempts_student_shell_code
  ON public.attempts (student_id, test_shell_code)
  WHERE test_shell_code IS NOT NULL;

-- 4. Backfill existing attempts with snapshot metadata from public.tests
UPDATE public.attempts a
SET
  test_shell_code = COALESCE(a.test_shell_code, t.shell_code, t.payload->>'shell_code'),
  test_title      = COALESCE(a.test_title, t.title),
  test_type       = COALESCE(a.test_type, t.test_type::text),
  test_subtype    = COALESCE(a.test_subtype, t.test_subtype),
  test_category   = COALESCE(a.test_category, t.category, t.payload->>'category'),
  class_id        = COALESCE(a.class_id, t.class_id),
  level_id        = COALESCE(a.level_id, t.level_id),
  theme_code      = COALESCE(a.theme_code, t.payload->>'theme_code'),
  topic_code      = COALESCE(a.topic_code, t.payload->>'topic_code')
FROM public.tests t
WHERE a.test_id = t.id
  AND (a.test_shell_code IS NULL OR a.test_title IS NULL OR a.class_id IS NULL);

-- 5. Trigger to auto-populate snapshot metadata on INSERT/UPDATE when test_id is present
CREATE OR REPLACE FUNCTION public.sync_attempt_test_snapshot()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  t_rec record;
BEGIN
  IF NEW.test_id IS NOT NULL AND (
    NEW.test_shell_code IS NULL OR NEW.test_title IS NULL OR NEW.class_id IS NULL
  ) THEN
    SELECT
      id,
      COALESCE(shell_code, payload->>'shell_code') AS eff_shell,
      title,
      test_type::text AS eff_test_type,
      test_subtype,
      COALESCE(category, payload->>'category') AS eff_cat,
      class_id,
      level_id,
      payload->>'theme_code' AS eff_theme,
      payload->>'topic_code' AS eff_topic
    INTO t_rec
    FROM public.tests
    WHERE id = NEW.test_id;

    IF FOUND THEN
      NEW.test_shell_code := COALESCE(NEW.test_shell_code, t_rec.eff_shell);
      NEW.test_title      := COALESCE(NEW.test_title, t_rec.title);
      NEW.test_type       := COALESCE(NEW.test_type, t_rec.eff_test_type);
      NEW.test_subtype    := COALESCE(NEW.test_subtype, t_rec.test_subtype);
      NEW.test_category   := COALESCE(NEW.test_category, t_rec.eff_cat);
      NEW.class_id        := COALESCE(NEW.class_id, t_rec.class_id);
      NEW.level_id        := COALESCE(NEW.level_id, t_rec.level_id);
      NEW.theme_code      := COALESCE(NEW.theme_code, t_rec.eff_theme);
      NEW.topic_code      := COALESCE(NEW.topic_code, t_rec.eff_topic);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_attempt_test_snapshot ON public.attempts;
CREATE TRIGGER trg_sync_attempt_test_snapshot
  BEFORE INSERT OR UPDATE ON public.attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_attempt_test_snapshot();
