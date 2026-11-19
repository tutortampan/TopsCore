-- Migration: Allow anon role full CRUD on tests, topics, modules, and site_settings tables
-- Purpose: Permit Top Office Admin Console (authenticating through session-based master auth using the anon client)
-- to manage test passing scores, durations, status, topics, modules, and site settings without encountering
-- RLS blockades (PGRST116: "Cannot coerce the result to a single JSON object").

DO $$
BEGIN
  -- 1. tests table
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tests' AND policyname = 'admin_all_tests') THEN
    CREATE POLICY "admin_all_tests" ON public.tests TO anon USING (true) WITH CHECK (true);
  END IF;

  -- 2. topics table
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'topics' AND policyname = 'admin_all_topics') THEN
    CREATE POLICY "admin_all_topics" ON public.topics TO anon USING (true) WITH CHECK (true);
  END IF;

  -- 3. site_settings table
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'site_settings' AND policyname = 'admin_all_site_settings') THEN
    CREATE POLICY "admin_all_site_settings" ON public.site_settings TO anon USING (true) WITH CHECK (true);
  END IF;

  -- 4. modules table
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'modules' AND policyname = 'admin_all_modules') THEN
    CREATE POLICY "admin_all_modules" ON public.modules TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;
