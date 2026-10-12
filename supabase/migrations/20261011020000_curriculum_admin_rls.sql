-- Allow anon (admin console) to perform full CRUD on curriculum tables
-- Required because the Top Office admin console authenticates through session-based master auth using the anon client.

DO $$
BEGIN
  -- Classes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'classes' AND policyname = 'admin_all_classes') THEN
    CREATE POLICY "admin_all_classes" ON "public"."classes" TO "anon" USING (true) WITH CHECK (true);
  END IF;

  -- Class Levels junction
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'class_levels' AND policyname = 'admin_all_class_levels') THEN
    CREATE POLICY "admin_all_class_levels" ON "public"."class_levels" TO "anon" USING (true) WITH CHECK (true);
  END IF;

  -- Programs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'programs' AND policyname = 'admin_all_programs') THEN
    CREATE POLICY "admin_all_programs" ON "public"."programs" TO "anon" USING (true) WITH CHECK (true);
  END IF;

  -- Batches
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'batches' AND policyname = 'admin_all_batches') THEN
    CREATE POLICY "admin_all_batches" ON "public"."batches" TO "anon" USING (true) WITH CHECK (true);
  END IF;

  -- Institutions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'institutions' AND policyname = 'admin_all_institutions') THEN
    CREATE POLICY "admin_all_institutions" ON "public"."institutions" TO "anon" USING (true) WITH CHECK (true);
  END IF;

  -- Levels
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'levels' AND policyname = 'admin_all_levels') THEN
    CREATE POLICY "admin_all_levels" ON "public"."levels" TO "anon" USING (true) WITH CHECK (true);
  END IF;
END
$$;
