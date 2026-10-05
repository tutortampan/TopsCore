-- Description: Add program_id to classes to complete the hierarchy (Institution -> Program -> Class -> Assessment)

ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL;
