-- Migration: Add foreign key constraints for class_meetings and class_meeting_exceptions to class_instances
ALTER TABLE ONLY "public"."class_meetings"
    DROP CONSTRAINT IF EXISTS "class_meetings_class_instance_id_fkey",
    ADD CONSTRAINT "class_meetings_class_instance_id_fkey" FOREIGN KEY ("class_instance_id") REFERENCES "public"."class_instances"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."class_meeting_exceptions"
    DROP CONSTRAINT IF EXISTS "class_meeting_exceptions_class_instance_id_fkey",
    ADD CONSTRAINT "class_meeting_exceptions_class_instance_id_fkey" FOREIGN KEY ("class_instance_id") REFERENCES "public"."class_instances"("id") ON DELETE CASCADE;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
