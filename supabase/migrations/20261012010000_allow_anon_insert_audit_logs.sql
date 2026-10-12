-- Allow anon students to insert audit log records for cheating events and security tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'anon_insert_audit_logs'
  ) THEN
    CREATE POLICY anon_insert_audit_logs ON audit_logs
      FOR INSERT TO anon
      WITH CHECK (actor_role = 'student');
  END IF;
END $$;
