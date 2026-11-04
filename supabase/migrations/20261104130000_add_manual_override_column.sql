-- Phase 305: Add is_manual_override column to attempts table
-- (is_forgiven, forgiven_by, forgiven_at, forgiven_reason already exist from previous migration)

ALTER TABLE public.attempts
  ADD COLUMN IF NOT EXISTS is_manual_override BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_attempts_is_manual_override
  ON public.attempts(is_manual_override)
  WHERE is_manual_override = TRUE;

COMMENT ON COLUMN public.attempts.is_manual_override IS
  'TRUE if score was manually entered by admin/tutor (e.g., from offline exam paper).';

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'attempts'
  AND column_name IN ('is_forgiven', 'is_manual_override', 'forgiven_by', 'forgiven_at', 'forgiven_reason');

