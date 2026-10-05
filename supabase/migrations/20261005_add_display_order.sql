ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999;
CREATE INDEX IF NOT EXISTS idx_assessments_display_order ON public.assessments (display_order);
