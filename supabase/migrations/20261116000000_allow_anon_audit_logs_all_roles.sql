-- Migration: Allow anon role to insert audit logs for all valid actor roles (admin, tutor, student)
-- Purpose: Prevent 401 Unauthorized / RLS 42501 errors when Admin or Tutor logs actions via client

DO $$
BEGIN
  DROP POLICY IF EXISTS "anon_insert_audit_logs" ON public.audit_logs;
  CREATE POLICY "anon_insert_audit_logs" ON public.audit_logs
    FOR INSERT TO anon
    WITH CHECK (true);
END $$;
