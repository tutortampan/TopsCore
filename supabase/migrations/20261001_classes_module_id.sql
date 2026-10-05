-- Description: Bind module_id to classes directly, as per user's request.
-- This ensures that a Class is intrinsically tied to a specific Assessment Engine module.

ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL;
