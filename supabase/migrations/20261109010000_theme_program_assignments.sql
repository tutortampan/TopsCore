-- 20261109010000_theme_program_assignments.sql
-- Multi-Program Theme Assignment and Topic Blueprint Matrix Support

CREATE TABLE IF NOT EXISTS public.theme_program_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    theme_code TEXT NOT NULL,
    target_level INTEGER NOT NULL,
    program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(theme_code, target_level, program_id)
);

CREATE INDEX IF NOT EXISTS idx_theme_prog_assign 
  ON public.theme_program_assignments(program_id, target_level);

CREATE INDEX IF NOT EXISTS idx_theme_prog_code_lvl 
  ON public.theme_program_assignments(theme_code, target_level);

ALTER TABLE public.theme_program_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read theme_program_assignments" ON public.theme_program_assignments;
CREATE POLICY "Allow public read theme_program_assignments" 
  ON public.theme_program_assignments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated/service_role theme_program_assignments" ON public.theme_program_assignments;
CREATE POLICY "Allow all for authenticated/service_role theme_program_assignments" 
  ON public.theme_program_assignments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon manage theme_program_assignments" ON public.theme_program_assignments;
CREATE POLICY "Allow anon manage theme_program_assignments" 
  ON public.theme_program_assignments FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON public.theme_program_assignments TO anon, authenticated, service_role;

