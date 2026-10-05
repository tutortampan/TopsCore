-- Description: Create many-to-many relationship mapping between Classes and Levels

-- 1. Create junction table
CREATE TABLE IF NOT EXISTS public.class_levels (
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    level_id UUID REFERENCES public.levels(id) ON DELETE CASCADE,
    PRIMARY KEY (class_id, level_id)
);

-- 2. (Optional but recommended) Migrate existing data from classes.level_id to class_levels
INSERT INTO public.class_levels (class_id, level_id)
SELECT id, level_id FROM public.classes WHERE level_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Note: We will keep classes.level_id for now to avoid breaking existing legacy code instantly, 
-- but all NEW features will read from and write to class_levels.
