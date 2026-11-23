-- 20261122010000_institution_fullname_and_codes.sql
-- Default institution name everywhere is strictly 'CEC' and 'TOP'.
-- Institution Full Name ('Cake English Course' & 'Top Occupational Program') is stored in full_name
-- and is ONLY displayed when explicitly requested.

-- 1. Ensure code and full_name columns exist
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 2. Update CEC: default name 'CEC', code 'CEC', full_name 'Cake English Course'
UPDATE public.institutions
SET 
  name = 'CEC',
  code = 'CEC',
  full_name = 'Cake English Course',
  updated_at = NOW()
WHERE 
  code = 'CEC' 
  OR name = 'CEC' 
  OR name ILIKE '%Cake English%';

-- 3. Update TOP: default name 'TOP', code 'TOP', full_name = 'Top Occupational Program'
UPDATE public.institutions
SET 
  name = 'TOP',
  code = 'TOP',
  full_name = 'Top Occupational Program',
  updated_at = NOW()
WHERE 
  code = 'TOP' 
  OR name = 'TOP' 
  OR name ILIKE '%Top Optimal%' 
  OR name ILIKE '%Top Occupational%'
  OR name = 'Personal';

-- 4. Fallback guard
UPDATE public.institutions SET code = 'CEC', full_name = 'Cake English Course' WHERE name = 'CEC' AND (code IS NULL OR code = '');
UPDATE public.institutions SET code = 'TOP', full_name = 'Top Occupational Program' WHERE name = 'TOP' AND (code IS NULL OR code = '');
