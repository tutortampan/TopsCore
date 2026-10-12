-- Migration: Backfill classes.code and add check/index
-- Purpose: Ensures all classes have a standardized machine-readable code and future additions are properly populated.

UPDATE public.classes 
SET code = 'BASIC_ENGLISH_1' 
WHERE name ILIKE '%Basic English%' AND code IS NULL;

UPDATE public.classes 
SET code = 'STORYTELLING_2' 
WHERE name ILIKE '%2nd Storytelling%' AND code IS NULL;

UPDATE public.classes 
SET code = 'VOCABULARY_3' 
WHERE name ILIKE '%Vocabulary%' AND code IS NULL;

UPDATE public.classes 
SET code = 'VOCAB_MASTER_3' 
WHERE name ILIKE '%Vocab Master%' AND code IS NULL;

-- Default fallback generator for any remaining null codes
UPDATE public.classes
SET code = UPPER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '_', 'g'))
WHERE code IS NULL AND name IS NOT NULL;
