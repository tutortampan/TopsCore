-- ============================================================================
-- Migration: Add Province and City to public.students
-- Supports official 38 Provinces and 514 Cities/Regencies cascading selection
-- ============================================================================

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT;

-- Comment for metadata documentation
COMMENT ON COLUMN public.students.province IS 'Indonesian Province of Origin (38 Provinces)';
COMMENT ON COLUMN public.students.city IS 'Indonesian Regency or City of Origin (514 Kota & Kabupaten)';
