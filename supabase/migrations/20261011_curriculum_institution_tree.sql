-- 20261011_curriculum_institution_tree.sql
-- 1. Rename 'Personal' institution to 'TOP'
UPDATE public.institutions
SET name = 'TOP', updated_at = NOW()
WHERE name = 'Personal';

-- 2. Add extra detail columns to institutions
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Add extra detail columns to programs
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 4. Set codes for default institutions if empty
UPDATE public.institutions SET code = 'CEC' WHERE name = 'CEC' AND (code IS NULL OR code = '');
UPDATE public.institutions SET code = 'TOP' WHERE name = 'TOP' AND (code IS NULL OR code = '');
