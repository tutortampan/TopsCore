-- ============================================================================
-- Migration: Add District and Village to public.students
-- Supports complete Indonesian 4-tier address hierarchy
-- ============================================================================

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS village TEXT;

COMMENT ON COLUMN public.students.district IS 'Indonesian District (Kecamatan)';
COMMENT ON COLUMN public.students.village IS 'Indonesian Village (Desa / Kelurahan)';
