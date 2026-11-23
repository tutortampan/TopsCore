-- Migration: 20261123020000_add_contact_and_guardian_to_students.sql
-- Description: Add phone, guardian_name, guardian_phone, and religion to public.students table for student roster, contact, and official transcripts.
-- Strict Additive Migration: Zero destructive alterations to existing columns or tables.

DO $$
BEGIN
  -- 1. Student Phone / WhatsApp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'students'
      AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.students ADD COLUMN phone TEXT NULL;
    COMMENT ON COLUMN public.students.phone IS 'Student active contact or WhatsApp phone number';
  END IF;

  -- 2. Parents / Guardian Name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'students'
      AND column_name = 'guardian_name'
  ) THEN
    ALTER TABLE public.students ADD COLUMN guardian_name TEXT NULL;
    COMMENT ON COLUMN public.students.guardian_name IS 'Name of parent or legal guardian for official reports (LPM)';
  END IF;

  -- 3. Parents / Guardian Phone / WhatsApp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'students'
      AND column_name = 'guardian_phone'
  ) THEN
    ALTER TABLE public.students ADD COLUMN guardian_phone TEXT NULL;
    COMMENT ON COLUMN public.students.guardian_phone IS 'Contact or WhatsApp number of parent or legal guardian';
  END IF;

  -- 4. Religion (for certificate angket & formal diplomas)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'students'
      AND column_name = 'religion'
  ) THEN
    ALTER TABLE public.students ADD COLUMN religion TEXT NULL;
    COMMENT ON COLUMN public.students.religion IS 'Religion of student for official diplomas and certification dossier';
  END IF;
END $$;
