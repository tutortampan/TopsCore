-- ==============================================================================
-- TOPSCORE LMS MIGRATION — 20261125010000
-- Enforce Strict Inactive Student Status Synchronization (SSOT)
-- Rule: Inactive students must never appear anywhere in the system until reactivated.
-- Syncs is_active and program_status bidirectionally across public.students.
-- ==============================================================================

-- 1. Reconcile known inactive students in Batch 134 and across the system
UPDATE public.students
SET is_active = false, program_status = 'INACTIVE', updated_at = NOW()
WHERE id IN (
  'b3ed594c-6700-4f38-be11-cf3dd6c40c29', -- Riska Fetrosia (NIS 134009)
  '9061b732-ae90-4786-a781-013b5ee68310', -- Abdul Basit (NIS 134012)
  '66d73c5f-3f58-41d0-9be9-aad3158afb62', -- Adinda Karunia Farela (NIS 134013)
  '6353b138-6bb5-4145-a5a7-d3f34eb760bf'  -- Ida Wayan Gana Surya Arta (NIS 134017)
);

-- 2. Ensure any student with program_status = 'INACTIVE' or 'HOLD' has is_active = false
UPDATE public.students
SET is_active = false, updated_at = NOW()
WHERE UPPER(COALESCE(program_status, '')) IN ('INACTIVE', 'HOLD')
  AND is_active = true;

-- 3. Ensure any student with is_active = false (except ALUMNI / GRADUATED) has program_status = 'INACTIVE'
UPDATE public.students
SET program_status = 'INACTIVE', updated_at = NOW()
WHERE is_active = false
  AND UPPER(COALESCE(program_status, '')) NOT IN ('ALUMNI', 'GRADUATED', 'COMPLETED', 'PROGRAM_COMPLETED', 'INACTIVE');

-- 4. Create or replace bidirectional synchronization trigger function
CREATE OR REPLACE FUNCTION public.sync_student_active_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If student is ALUMNI/GRADUATED/COMPLETED, do not override to INACTIVE
  IF UPPER(COALESCE(NEW.program_status, '')) IN ('ALUMNI', 'GRADUATED', 'COMPLETED', 'PROGRAM_COMPLETED') THEN
    RETURN NEW;
  END IF;

  -- Case A: program_status set to INACTIVE or HOLD -> force is_active to false
  IF UPPER(COALESCE(NEW.program_status, '')) IN ('INACTIVE', 'HOLD') THEN
    NEW.is_active := false;

  -- Case B: is_active set to false -> force program_status to INACTIVE
  ELSIF NEW.is_active = false THEN
    NEW.program_status := 'INACTIVE';

  -- Case C: is_active set to true while program_status was INACTIVE -> restore program_status to ACTIVE
  ELSIF NEW.is_active = true AND UPPER(COALESCE(NEW.program_status, '')) = 'INACTIVE' THEN
    NEW.program_status := 'ACTIVE';

  -- Case D: program_status set to ACTIVE or IN_PROGRESS -> ensure is_active is true
  ELSIF UPPER(COALESCE(NEW.program_status, '')) IN ('ACTIVE', 'IN_PROGRESS') THEN
    NEW.is_active := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach trigger to public.students
DROP TRIGGER IF EXISTS trg_sync_student_active_status ON public.students;
CREATE TRIGGER trg_sync_student_active_status
BEFORE INSERT OR UPDATE OF is_active, program_status ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.sync_student_active_status();
