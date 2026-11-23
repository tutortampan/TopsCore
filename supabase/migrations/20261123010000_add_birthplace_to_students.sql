-- Migration: Add birthplace to students table
-- Description: Adds birthplace column to public.students for official transcripts and diplomas

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'students'
      AND column_name = 'birthplace'
  ) THEN
    ALTER TABLE public.students ADD COLUMN birthplace TEXT NULL;
    COMMENT ON COLUMN public.students.birthplace IS 'City/Place of birth for official student certificates and diplomas';
  END IF;
END $$;
