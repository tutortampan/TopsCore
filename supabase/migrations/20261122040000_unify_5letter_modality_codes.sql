-- Migration: 20261122040000_unify_5letter_modality_codes.sql
-- Description: Unify all class modality codes to exact 5-Letter standard (VOCAB, BASIC, SPEAK, STORY, GRMMR, GFORS, PRONC)
-- and purge legacy inactive duplicate classes.

-- 1. Update active class codes to exact 5-letter standard
UPDATE public.classes SET code = 'CAMP-1GRMMR' WHERE code = 'CAMP-1GRAM';
UPDATE public.classes SET code = 'CAMP-2GRMMR' WHERE code = 'CAMP-2GRAM';
UPDATE public.classes SET code = 'CAMP-3GRMMR' WHERE code = 'CAMP-3GRAM';
UPDATE public.classes SET code = 'CAMP-2GFORS', name = 'Camp 2nd Grammar for Speaking' WHERE code IN ('CAMP-2GFS', 'CAMP-2GFORS');
UPDATE public.classes SET code = 'CAMP-3PRONC' WHERE code = 'CAMP-3PRON';

-- 2. Safely purge legacy unreferenced inactive duplicate classes
-- First detach from class_levels
DELETE FROM public.class_levels
WHERE class_id IN (
  '35332f51-0fe0-444b-8c45-bd2a780def5e',
  '27984fdd-2953-4313-9391-e004caece7ec',
  'fd548ddb-4ebb-4d66-9ee4-51ffcac1f654',
  'a51a5283-ba97-4ba2-bd1a-b3a3bb5ef230',
  '967031b9-f84d-482e-990a-ba13dea21e0e',
  '717c1500-50e6-479c-b05d-02ea0fe2a609'
);

-- Delete unreferenced classes
DELETE FROM public.classes
WHERE id IN (
  '35332f51-0fe0-444b-8c45-bd2a780def5e',
  '27984fdd-2953-4313-9391-e004caece7ec',
  'fd548ddb-4ebb-4d66-9ee4-51ffcac1f654',
  'a51a5283-ba97-4ba2-bd1a-b3a3bb5ef230',
  '967031b9-f84d-482e-990a-ba13dea21e0e',
  '717c1500-50e6-479c-b05d-02ea0fe2a609'
)
AND NOT EXISTS (SELECT 1 FROM public.tests WHERE tests.class_id = classes.id);
