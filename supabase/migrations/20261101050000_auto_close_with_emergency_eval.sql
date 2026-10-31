-- ==============================================================================
-- Migration: 20261101050000_auto_close_with_emergency_eval.sql
-- Description: Upgrade auto_close_expired_attempts to evaluate all answered
--              questions via emergency_submit_attempt instead of blindly
--              setting score = 0. Resolves the 44% zero-score loss on timeout.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.auto_close_expired_attempts(p_attempt_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
BEGIN
  IF p_attempt_id IS NOT NULL THEN
    -- Evaluate and authoritatively close the specified attempt
    PERFORM public.emergency_submit_attempt(p_attempt_id, NULL, 'auto_submitted');
  ELSE
    -- Loop over all expired in-progress attempts and calculate their true score
    FOR v_rec IN 
      SELECT id 
      FROM public.attempts 
      WHERE lower(status) = 'in_progress' 
        AND expires_at < NOW()
    LOOP
      PERFORM public.emergency_submit_attempt(v_rec.id, NULL, 'auto_submitted');
    END LOOP;
  END IF;
END;
$$;

-- Grant permissions to public roles and service_role
GRANT EXECUTE ON FUNCTION public.auto_close_expired_attempts(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.auto_close_expired_attempts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_close_expired_attempts(uuid) TO service_role;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
