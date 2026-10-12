-- ==============================================================================
-- Migration: 20261012_fix_auto_close_expired_attempts.sql
-- Description: Fix auto_close_expired_attempts to target public.attempts and
--              support optional p_attempt_id parameter with SECURITY DEFINER.
-- ==============================================================================

DROP FUNCTION IF EXISTS public.auto_close_expired_attempts();

CREATE OR REPLACE FUNCTION public.auto_close_expired_attempts(p_attempt_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_attempt_id IS NOT NULL THEN
    UPDATE public.attempts
    SET status = 'auto_submitted',
        submitted_at = COALESCE(expires_at, NOW()),
        updated_at = NOW()
    WHERE id = p_attempt_id
      AND lower(status) = 'in_progress';
  ELSE
    UPDATE public.attempts
    SET status = 'auto_submitted',
        submitted_at = COALESCE(expires_at, NOW()),
        updated_at = NOW()
    WHERE lower(status) = 'in_progress'
      AND expires_at < NOW();
  END IF;
END;
$$;

-- Grant permissions to public roles and service_role
GRANT EXECUTE ON FUNCTION public.auto_close_expired_attempts(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.auto_close_expired_attempts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_close_expired_attempts(uuid) TO service_role;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
