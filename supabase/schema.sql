


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."auto_close_expired_attempts"("p_attempt_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO "public"
    AS $$
BEGIN
  IF p_attempt_id IS NOT NULL THEN
    UPDATE public.attempts
    SET status = 'auto_submitted',
        submitted_at = COALESCE(expires_at, NOW()),
        updated_at = NOW()
    WHERE id = p_attempt_id
      AND lower(status) = 'in_progress';
  ELSE
    UPDATE public.attempts
    SET status = 'auto_submitted',
        submitted_at = COALESCE(expires_at, NOW()),
        updated_at = NOW()
    WHERE lower(status) = 'in_progress'
      AND expires_at < NOW();
  END IF;
END;
$$;


ALTER FUNCTION "public"."auto_close_expired_attempts"("p_attempt_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_server_time_wita"() RETURNS timestamp with time zone
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT NOW() AT TIME ZONE 'Asia/Makassar';
$$;


ALTER FUNCTION "public"."get_server_time_wita"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."merge_student_import"("import_filename" "text", "records" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  record_item jsonb;
  existing_student public.students%rowtype;
  imported_id text;
  imported_name text;
  imported_dob date;
  inserted_count integer := 0;
  updated_count integer := 0;
  rejected_count integer := 0;
  duplicate_warning_count integer := 0;
  errors jsonb := '[]'::jsonb;
begin
  if coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'tutor' then
    raise exception 'Tutor authorization is required';
  end if;
  if jsonb_typeof(records) <> 'array' then
    raise exception 'Import records must be an array';
  end if;

  for record_item in select value from jsonb_array_elements(records)
  loop
    imported_id := nullif(trim(record_item->>'student_id'), '');
    imported_name := nullif(trim(record_item->>'full_name'), '');
    imported_dob := nullif(record_item->>'date_of_birth', '')::date;

    if imported_id is null or imported_name is null then
      rejected_count := rejected_count + 1;
      errors := errors || jsonb_build_array(jsonb_build_object(
        'student_id', imported_id, 'full_name', imported_name,
        'error', 'Student ID and full name are required'
      ));
      continue;
    end if;

    select * into existing_student from public.students
      where student_id = imported_id
      or (lower(full_name) = lower(imported_name)
          and date_of_birth is not distinct from imported_dob)
      limit 1
      for update;

    if found then
      if existing_student.student_id <> imported_id then
        duplicate_warning_count := duplicate_warning_count + 1;
        errors := errors || jsonb_build_array(jsonb_build_object(
          'student_id', imported_id, 'full_name', imported_name,
          'error', 'Possible duplicate matched by name and date of birth'
        ));
        continue;
      end if;
      update public.students set
        full_name = imported_name,
        date_of_birth = imported_dob,
        gender = nullif(lower(record_item->>'gender'), ''),
        photo_url = nullif(record_item->>'photo_url', ''),
        program = nullif(trim(record_item->>'program'), ''),
        class_name = nullif(trim(record_item->>'class_name'), ''),
        current_level = nullif(trim(record_item->>'current_level'), ''),
        status = coalesce(nullif(record_item->>'status', ''), 'active')
        where id = existing_student.id;
      updated_count := updated_count + 1;
    else
      insert into public.students (
        student_id, full_name, date_of_birth, gender, photo_url,
        program, class_name, current_level, status
      ) values (
        imported_id, imported_name, imported_dob,
        nullif(lower(record_item->>'gender'), ''),
        nullif(record_item->>'photo_url', ''),
        nullif(trim(record_item->>'program'), ''),
        nullif(trim(record_item->>'class_name'), ''),
        nullif(trim(record_item->>'current_level'), ''),
        coalesce(nullif(record_item->>'status', ''), 'active')
      );
      inserted_count := inserted_count + 1;
    end if;
  end loop;

  insert into public.student_import_logs (
    performed_by, source_filename, processed_count, inserted_count,
    updated_count, rejected_count, duplicate_warning_count, status, errors
  ) values (
    auth.uid(), import_filename, jsonb_array_length(records), inserted_count,
    updated_count, rejected_count, duplicate_warning_count, 'committed', errors
  );

  return jsonb_build_object(
    'processed', jsonb_array_length(records),
    'inserted', inserted_count,
    'updated', updated_count,
    'rejected', rejected_count,
    'duplicate_warnings', duplicate_warning_count,
    'errors', errors
  );
exception when others then
  raise;
end;
$$;


ALTER FUNCTION "public"."merge_student_import"("import_filename" "text", "records" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reorder_assessment"("p_assessment_id" "uuid", "p_new_order" integer, "p_class_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_old_order INTEGER;
BEGIN
    -- 1. Get the current order of the assessment
    SELECT display_order INTO v_old_order
    FROM public.assessments
    WHERE id = p_assessment_id AND class_id = p_class_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Assessment not found in class %', p_class_id;
    END IF;

    -- 2. If no change, return
    IF v_old_order = p_new_order THEN
        RETURN;
    END IF;

    -- 3. Shift intervening items
    IF v_old_order < p_new_order THEN
        -- Moving down: Shift items up (decrement) that are between old_order + 1 and new_order
        UPDATE public.assessments
        SET display_order = display_order - 1
        WHERE class_id = p_class_id
          AND display_order > v_old_order
          AND display_order <= p_new_order
          AND id != p_assessment_id;
    ELSE
        -- Moving up: Shift items down (increment) that are between new_order and old_order - 1
        UPDATE public.assessments
        SET display_order = display_order + 1
        WHERE class_id = p_class_id
          AND display_order >= p_new_order
          AND display_order < v_old_order
          AND id != p_assessment_id;
    END IF;

    -- 4. Set the new order for the target assessment
    UPDATE public.assessments
    SET display_order = p_new_order
    WHERE id = p_assessment_id;

END;
$$;


ALTER FUNCTION "public"."reorder_assessment"("p_assessment_id" "uuid", "p_new_order" integer, "p_class_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_student_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_student_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_student_batch_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- If batch_id changed (or is being set for the first time)
    IF (OLD.batch_id IS DISTINCT FROM NEW.batch_id) THEN
        -- Update the timestamp for joining the new batch
        NEW.batch_joined_at = NOW();

        -- If the student is LEAVING an old batch (not just being created)
        IF OLD.batch_id IS NOT NULL THEN
            -- Automatically insert them into additional_members for any ACTIVE class instances of the old batch
            -- so that the tutor does not lose access to their grading sheet.
            INSERT INTO additional_members (class_instance_id, student_id)
            SELECT id, OLD.id
            FROM class_instances
            WHERE batch_id = OLD.batch_id
              AND status = 'active'
            ON CONFLICT (class_instance_id, student_id) DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_student_batch_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_student_hierarchy"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  class_program_id uuid;
  level_class_id uuid;
begin
  if new.class_id is not null then
    select program_id, status into class_program_id
    from public.classes where id = new.class_id;
    if class_program_id is null or (new.program_id is not null and class_program_id <> new.program_id) then
      raise exception 'Student class does not belong to the selected program';
    end if;
  end if;
  if new.level_id is not null then
    select class_id into level_class_id from public.levels where id = new.level_id;
    if level_class_id is null or (new.class_id is not null and level_class_id <> new.class_id) then
      raise exception 'Student level does not belong to the selected class';
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_student_hierarchy"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."achievement_targets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "level_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "mandatory" boolean DEFAULT false NOT NULL,
    "completion_criteria" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "achievement_targets_name_check" CHECK (("length"(TRIM(BOTH FROM "name")) > 0)),
    CONSTRAINT "achievement_targets_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."achievement_targets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."additional_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_instance_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."additional_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessment_attempt_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assessment_attempt_id" "uuid" NOT NULL,
    "question_id" "uuid",
    "question_snapshot" "jsonb" NOT NULL,
    "topic_snapshot" "text",
    "word_type_snapshot" "text",
    "accepted_answers_snapshot" "jsonb",
    "correct_answer_snapshot" "text",
    "student_answer" "text",
    "is_correct" boolean,
    "similarity_score" numeric(4,3),
    "evaluation_result" "text",
    "score" numeric(5,2),
    "answered_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "challenge_attempt_answers_evaluation_result_check" CHECK (("evaluation_result" = ANY (ARRAY['correct'::"text", 'minor_spelling_error'::"text", 'incorrect'::"text", NULL::"text"])))
);


ALTER TABLE "public"."assessment_attempt_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessment_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "assessment_instance_id" "uuid" NOT NULL,
    "attempt_number" integer DEFAULT 1 NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "submitted_at" timestamp with time zone,
    "status" "text" DEFAULT 'in_progress'::"text" NOT NULL,
    "score" numeric(5,2),
    "correct_count" integer DEFAULT 0,
    "total_questions" integer DEFAULT 0,
    "percentage" numeric(5,2),
    "grade" "text",
    "effective_score" numeric(5,2),
    "is_best_score" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "challenge_attempts_status_check" CHECK (("lower"("status") = ANY (ARRAY['not_started'::"text", 'in_progress'::"text", 'submitted'::"text", 'auto_submitted'::"text", 'expired'::"text", 'cancelled'::"text", 'pending_evaluation'::"text", 'evaluated'::"text"])))
);


ALTER TABLE "public"."assessment_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessment_instances" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "assessment_id" "uuid",
    "class_instance_id" "uuid",
    "student_id" "uuid",
    "batch_id" "uuid",
    "title_override" "text",
    "availability_start" timestamp with time zone,
    "availability_end" timestamp with time zone,
    "working_duration_minutes" integer,
    "max_attempts" integer DEFAULT 0,
    "result_policy" "text" DEFAULT 'HIGHEST'::"text",
    "status" "text" DEFAULT 'ACTIVE'::"text",
    "assigned_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."assessment_instances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessment_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assessment_id" "uuid" NOT NULL,
    "question_id" "uuid",
    "question_text_snapshot" "text" NOT NULL,
    "accepted_answers_snapshot" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "topic_snapshot" "text" NOT NULL,
    "word_type_snapshot" "text",
    "display_order" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "answer_type" "text" DEFAULT 'written'::"text",
    "options_snapshot" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."assessment_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessment_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid",
    "assessment_id" "uuid",
    "module_type" character varying(50) NOT NULL,
    "final_score" integer DEFAULT 0 NOT NULL,
    "raw_evaluation_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "transcript" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."assessment_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessment_topics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assessment_id" "uuid" NOT NULL,
    "topic_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."assessment_topics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid",
    "level_id" "uuid",
    "assessment_type" "text" DEFAULT 'EVALUATION'::"text",
    "title" "text",
    "description" "text",
    "status" "text" DEFAULT 'DRAFT'::"text",
    "availability_start" timestamp with time zone,
    "availability_end" timestamp with time zone,
    "working_duration_minutes" integer DEFAULT 60,
    "prerequisite_assessment_id" "uuid",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "institution_id" "uuid",
    "program_id" "uuid",
    "prerequisite_id" "uuid",
    "assessment_category" character varying(10),
    "module_type" "text",
    "schedule_mode" "text" DEFAULT 'flexible'::"text",
    "window_start" timestamp with time zone,
    "window_end" timestamp with time zone,
    "question_order" "text" DEFAULT 'random'::"text",
    "payload" "jsonb",
    "shell_code" "text",
    "module_id" "uuid",
    "answer_type" "text" DEFAULT 'MULTIPLE_CHOICE'::"text",
    "is_dynamic_shell" boolean DEFAULT false NOT NULL,
    "display_order" integer DEFAULT 999,
    "topic_id" "uuid",
    "category" "text" DEFAULT 'ASSESSMENT'::"text",
    "display_name" "text",
    "minimum_required_score" numeric DEFAULT 0,
    "max_attempts" integer DEFAULT 0,
    "retake_allowed" boolean DEFAULT true,
    CONSTRAINT "assessments_assessment_category_check" CHECK ((("assessment_category")::"text" = ANY ((ARRAY['TASK'::character varying, 'TEST'::character varying])::"text"[])))
);


ALTER TABLE "public"."assessments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assessment_id" "uuid" NOT NULL,
    "assignment_type" "text" NOT NULL,
    "batch_id" "uuid",
    "student_id" "uuid",
    "availability_start" timestamp with time zone,
    "availability_end" timestamp with time zone,
    "assigned_by" "text",
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "assignments_assignment_type_check" CHECK (("assignment_type" = ANY (ARRAY['BATCH'::"text", 'STUDENT'::"text"]))),
    CONSTRAINT "assignments_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"]))),
    CONSTRAINT "chk_assignment_target" CHECK (((("assignment_type" = 'BATCH'::"text") AND ("batch_id" IS NOT NULL) AND ("student_id" IS NULL)) OR (("assignment_type" = 'STUDENT'::"text") AND ("student_id" IS NOT NULL) AND ("batch_id" IS NULL))))
);


ALTER TABLE "public"."assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attempt_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "attempt_id" "uuid" NOT NULL,
    "question_id" "uuid",
    "question_snapshot" "jsonb" NOT NULL,
    "topic_snapshot" "text",
    "question_type_snapshot" "text",
    "accepted_answers_snapshot" "jsonb",
    "correct_answer_snapshot" "text",
    "student_answer" "text",
    "is_correct" boolean,
    "similarity_score" numeric(4,3),
    "evaluation_result" "text",
    "score" numeric(5,2),
    "answered_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "word_type_snapshot" "text",
    CONSTRAINT "attempt_answers_evaluation_result_check" CHECK (("evaluation_result" = ANY (ARRAY['correct'::"text", 'minor_spelling_error'::"text", 'incorrect'::"text", NULL::"text"])))
);


ALTER TABLE "public"."attempt_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "assessment_id" "uuid" NOT NULL,
    "attempt_number" integer DEFAULT 1 NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "submitted_at" timestamp with time zone,
    "status" "text" DEFAULT 'in_progress'::"text" NOT NULL,
    "score" numeric(5,2),
    "correct_count" integer DEFAULT 0,
    "total_questions" integer DEFAULT 0,
    "percentage" numeric(5,2),
    "grade" "text",
    "effective_score" numeric(5,2),
    "is_best_score" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_remedial_unlocked" boolean DEFAULT false,
    CONSTRAINT "attempts_status_check" CHECK (("lower"("status") = ANY (ARRAY['not_started'::"text", 'in_progress'::"text", 'submitted'::"text", 'auto_submitted'::"text", 'expired'::"text", 'cancelled'::"text", 'pending_evaluation'::"text", 'evaluated'::"text"])))
);


ALTER TABLE "public"."attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_user_id" "uuid",
    "actor_role" "text" NOT NULL,
    "action" "text" NOT NULL,
    "entity_type" "text",
    "entity_id" "uuid",
    "old_value" "jsonb",
    "new_value" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "program_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "enrollment_date" "date",
    "actual_final_date" "date",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "current_level_id" "uuid"
);


ALTER TABLE "public"."batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cec_app_state" (
    "id" integer NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cec_app_state_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."cec_app_state" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_instances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "batch_id" "uuid" NOT NULL,
    "class_id" "uuid" NOT NULL,
    "start_date" "date",
    "estimated_finish" "date",
    "actual_finish" "date",
    "recurring_schedule" "jsonb",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "class_instances_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'finished'::"text"])))
);


ALTER TABLE "public"."class_instances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_levels" (
    "class_id" "uuid" NOT NULL,
    "level_id" "uuid" NOT NULL
);


ALTER TABLE "public"."class_levels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_meeting_exceptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_instance_id" "uuid" NOT NULL,
    "original_date" "date" NOT NULL,
    "exception_type" "text" NOT NULL,
    "rescheduled_date" "date",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "class_meeting_exceptions_exception_type_check" CHECK (("exception_type" = ANY (ARRAY['CANCELED'::"text", 'RESCHEDULED'::"text", 'MISSED'::"text"])))
);


ALTER TABLE "public"."class_meeting_exceptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_meetings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_instance_id" "uuid" NOT NULL,
    "meeting_number" integer NOT NULL,
    "scheduled_date" timestamp with time zone NOT NULL,
    "actual_date" timestamp with time zone,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "class_meetings_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'completed'::"text", 'missed'::"text", 'cancelled'::"text", 'rescheduled'::"text"])))
);


ALTER TABLE "public"."class_meetings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "description" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "level_id" "uuid",
    "program_id" "uuid",
    "institution_id" "uuid"
);


ALTER TABLE "public"."classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "batch_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "left_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "enrollments_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exam_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "assessment_id" "uuid" NOT NULL,
    "action_type" character varying(50) NOT NULL,
    "old_payload" "jsonb",
    "new_payload" "jsonb",
    "acted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."exam_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."institutions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "map_location" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."institutions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."levels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "level_number" integer NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."levels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "module_type" character varying(50) NOT NULL,
    "description" "text",
    "config_schema" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."professional_skills" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_professional_id" "uuid",
    "skill_name" "text" NOT NULL,
    "proficiency_level" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."professional_skills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."programs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."programs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "class_id" "uuid" NOT NULL,
    "unlocked_level" integer DEFAULT 1 NOT NULL,
    "highest_score" numeric(5,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "level_status" "text",
    "level_completed_at" timestamp with time zone
);


ALTER TABLE "public"."progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "is_system" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."question_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_usage_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid",
    "assessment_id" "uuid",
    "attempt_id" "uuid",
    "student_id" "uuid",
    "used_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "class_name" "text",
    "topic_name" "text"
);


ALTER TABLE "public"."question_usage_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "topic_id" "uuid" NOT NULL,
    "question_type" "text",
    "question_text" "text" NOT NULL,
    "accepted_answers" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "previous_correct_answer" "text",
    "last_edited_at" timestamp with time zone DEFAULT "now"(),
    "subject_id" "uuid",
    "word_type" "text",
    "metadata" "jsonb"
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."requirement_targets" (
    "requirement_id" "uuid" NOT NULL,
    "target_id" "uuid" NOT NULL
);


ALTER TABLE "public"."requirement_targets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."requirements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "level_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "mandatory" boolean DEFAULT false NOT NULL,
    "requirement_type" "text" DEFAULT 'custom'::"text" NOT NULL,
    "completion_criteria" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "requirements_name_check" CHECK (("length"(TRIM(BOTH FROM "name")) > 0)),
    CONSTRAINT "requirements_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."requirements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scholarships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "scholarship_name" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "starts_on" "date",
    "ends_on" "date",
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "scholarships_scholarship_name_check" CHECK (("length"(TRIM(BOTH FROM "scholarship_name")) > 0)),
    CONSTRAINT "scholarships_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."scholarships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_settings" (
    "key" "text" NOT NULL,
    "value" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."site_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_accounts" (
    "student_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "auth_email" "text" NOT NULL,
    "account_status" "text" DEFAULT 'active'::"text" NOT NULL,
    "password_not_set" boolean DEFAULT true NOT NULL,
    "password_created_at" timestamp with time zone,
    "password_updated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_login_at" timestamp with time zone,
    CONSTRAINT "student_accounts_account_status_check" CHECK (("account_status" = ANY (ARRAY['active'::"text", 'disabled'::"text"])))
);


ALTER TABLE "public"."student_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_import_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "performed_by" "uuid",
    "source_filename" "text" NOT NULL,
    "processed_count" integer DEFAULT 0 NOT NULL,
    "inserted_count" integer DEFAULT 0 NOT NULL,
    "updated_count" integer DEFAULT 0 NOT NULL,
    "rejected_count" integer DEFAULT 0 NOT NULL,
    "duplicate_warning_count" integer DEFAULT 0 NOT NULL,
    "status" "text" NOT NULL,
    "errors" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "student_import_logs_status_check" CHECK (("status" = ANY (ARRAY['preview'::"text", 'committed'::"text", 'rolled_back'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."student_import_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_progress" (
    "student_id" "uuid" NOT NULL,
    "progress_percent" numeric(5,2) DEFAULT 0 NOT NULL,
    "completed_requirements" integer DEFAULT 0 NOT NULL,
    "total_requirements" integer DEFAULT 0 NOT NULL,
    "completed_targets" integer DEFAULT 0 NOT NULL,
    "total_targets" integer DEFAULT 0 NOT NULL,
    "next_level" "text",
    "next_level_eligible" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "student_progress_completed_requirements_check" CHECK (("completed_requirements" >= 0)),
    CONSTRAINT "student_progress_completed_targets_check" CHECK (("completed_targets" >= 0)),
    CONSTRAINT "student_progress_progress_percent_check" CHECK ((("progress_percent" >= (0)::numeric) AND ("progress_percent" <= (100)::numeric))),
    CONSTRAINT "student_progress_total_requirements_check" CHECK (("total_requirements" >= 0)),
    CONSTRAINT "student_progress_total_targets_check" CHECK (("total_targets" >= 0))
);


ALTER TABLE "public"."student_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_requirement_progress" (
    "student_id" "uuid" NOT NULL,
    "requirement_id" "uuid" NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "evidence" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."student_requirement_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "assessment_id" "uuid" NOT NULL,
    "status" character varying(20) DEFAULT 'IN_PROGRESS'::character varying,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "submitted_at" timestamp with time zone,
    "overall_score" numeric(5,2),
    "ai_transcript" "text",
    "ai_feedback" "jsonb",
    "teacher_override_score" numeric(5,2),
    "teacher_override_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."student_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_target_progress" (
    "student_id" "uuid" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "evidence" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."student_target_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."students" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "program_id" "uuid" NOT NULL,
    "batch_id" "uuid",
    "batch_joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "gender" "text",
    "birth_date" "date",
    "pin_hash" "text" NOT NULL,
    "photo_url" "text",
    "photo_status" "text" DEFAULT 'not_set'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "education" "text",
    "level_id" "uuid",
    "program_status" "text" DEFAULT 'IN_PROGRESS'::"text",
    CONSTRAINT "students_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text"]))),
    CONSTRAINT "students_photo_status_check" CHECK (("photo_status" = ANY (ARRAY['not_set'::"text", 'pending'::"text", 'set'::"text"])))
);


ALTER TABLE "public"."students" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subjects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "institution_id" "uuid",
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "code" "text",
    "description" "text",
    "status" "text" DEFAULT 'active'::"text"
);


ALTER TABLE "public"."subjects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."topics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_professionals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "full_name" "text" NOT NULL,
    "title" "text",
    "bio" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "cv_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_professionals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vocabulary_vault" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "topic" "text" NOT NULL,
    "indonesian" "text" NOT NULL,
    "english" "text" NOT NULL,
    "word_type" "text" DEFAULT 'Verb'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "target_level" integer DEFAULT 1,
    "theme" "text",
    "theme_code" character varying(10),
    "topic_code" character varying(10)
);


ALTER TABLE "public"."vocabulary_vault" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."word_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "is_system" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."word_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_records" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_professional_id" "uuid",
    "company_name" "text" NOT NULL,
    "role_title" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."work_records" OWNER TO "postgres";


ALTER TABLE ONLY "public"."achievement_targets"
    ADD CONSTRAINT "achievement_targets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."additional_members"
    ADD CONSTRAINT "additional_members_class_instance_id_student_id_key" UNIQUE ("class_instance_id", "student_id");



ALTER TABLE ONLY "public"."additional_members"
    ADD CONSTRAINT "additional_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_instances"
    ADD CONSTRAINT "assessment_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_questions"
    ADD CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_results"
    ADD CONSTRAINT "assessment_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_topics"
    ADD CONSTRAINT "assessment_topics_assessment_id_topic_id_key" UNIQUE ("assessment_id", "topic_id");



ALTER TABLE ONLY "public"."assessment_topics"
    ADD CONSTRAINT "assessment_topics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attempt_answers"
    ADD CONSTRAINT "attempt_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attempts"
    ADD CONSTRAINT "attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cec_app_state"
    ADD CONSTRAINT "cec_app_state_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_attempt_answers"
    ADD CONSTRAINT "challenge_attempt_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_attempts"
    ADD CONSTRAINT "challenge_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_instances"
    ADD CONSTRAINT "class_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_levels"
    ADD CONSTRAINT "class_levels_pkey" PRIMARY KEY ("class_id", "level_id");



ALTER TABLE ONLY "public"."class_meeting_exceptions"
    ADD CONSTRAINT "class_meeting_exceptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_meetings"
    ADD CONSTRAINT "class_meetings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_student_id_batch_id_key" UNIQUE ("student_id", "batch_id");



ALTER TABLE ONLY "public"."exam_history"
    ADD CONSTRAINT "exam_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."institutions"
    ADD CONSTRAINT "institutions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."levels"
    ADD CONSTRAINT "levels_level_number_key" UNIQUE ("level_number");



ALTER TABLE ONLY "public"."levels"
    ADD CONSTRAINT "levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_module_type_key" UNIQUE ("module_type");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."professional_skills"
    ADD CONSTRAINT "professional_skills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."progress"
    ADD CONSTRAINT "progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."progress"
    ADD CONSTRAINT "progress_student_id_class_id_key" UNIQUE ("student_id", "class_id");



ALTER TABLE ONLY "public"."question_types"
    ADD CONSTRAINT "question_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."question_types"
    ADD CONSTRAINT "question_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_usage_history"
    ADD CONSTRAINT "question_usage_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requirement_targets"
    ADD CONSTRAINT "requirement_targets_pkey" PRIMARY KEY ("requirement_id", "target_id");



ALTER TABLE ONLY "public"."requirements"
    ADD CONSTRAINT "requirements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scholarships"
    ADD CONSTRAINT "scholarships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."student_accounts"
    ADD CONSTRAINT "student_accounts_auth_email_key" UNIQUE ("auth_email");



ALTER TABLE ONLY "public"."student_accounts"
    ADD CONSTRAINT "student_accounts_pkey" PRIMARY KEY ("student_id");



ALTER TABLE ONLY "public"."student_accounts"
    ADD CONSTRAINT "student_accounts_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."student_import_logs"
    ADD CONSTRAINT "student_import_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_progress"
    ADD CONSTRAINT "student_progress_pkey" PRIMARY KEY ("student_id");



ALTER TABLE ONLY "public"."student_requirement_progress"
    ADD CONSTRAINT "student_requirement_progress_pkey" PRIMARY KEY ("student_id", "requirement_id");



ALTER TABLE ONLY "public"."student_submissions"
    ADD CONSTRAINT "student_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_target_progress"
    ADD CONSTRAINT "student_target_progress_pkey" PRIMARY KEY ("student_id", "target_id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_professionals"
    ADD CONSTRAINT "user_professionals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vocabulary_vault"
    ADD CONSTRAINT "vocabulary_vault_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."word_types"
    ADD CONSTRAINT "word_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."word_types"
    ADD CONSTRAINT "word_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_records"
    ADD CONSTRAINT "work_records_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_assessment_instances_assessment_id" ON "public"."assessment_instances" USING "btree" ("assessment_id");



CREATE INDEX "idx_assessment_instances_batch_id" ON "public"."assessment_instances" USING "btree" ("batch_id");



CREATE INDEX "idx_assessment_instances_student_id" ON "public"."assessment_instances" USING "btree" ("student_id");



CREATE INDEX "idx_assessment_questions_assessment_id" ON "public"."assessment_questions" USING "btree" ("assessment_id");



CREATE INDEX "idx_assessment_results_assessment_id" ON "public"."assessment_results" USING "btree" ("assessment_id");



CREATE INDEX "idx_assessment_results_module_type" ON "public"."assessment_results" USING "btree" ("module_type");



CREATE INDEX "idx_assessment_results_student_id" ON "public"."assessment_results" USING "btree" ("student_id");



CREATE INDEX "idx_assessment_topics_assessment_id" ON "public"."assessment_topics" USING "btree" ("assessment_id");



CREATE INDEX "idx_assessments_assessment_category" ON "public"."assessments" USING "btree" ("assessment_category");



CREATE INDEX "idx_assessments_class_id" ON "public"."assessments" USING "btree" ("class_id");



CREATE INDEX "idx_assessments_created_by" ON "public"."assessments" USING "btree" ("created_by");



CREATE INDEX "idx_assessments_display_order" ON "public"."assessments" USING "btree" ("display_order");



CREATE INDEX "idx_assessments_prerequisite_id" ON "public"."assessments" USING "btree" ("prerequisite_id");



CREATE INDEX "idx_assessments_program_id" ON "public"."assessments" USING "btree" ("program_id");



CREATE INDEX "idx_assessments_shell_code" ON "public"."assessments" USING "btree" ("shell_code");



CREATE INDEX "idx_assessments_status" ON "public"."assessments" USING "btree" ("status");



CREATE INDEX "idx_assignments_assessment_id" ON "public"."assignments" USING "btree" ("assessment_id");



CREATE INDEX "idx_assignments_batch_id" ON "public"."assignments" USING "btree" ("batch_id");



CREATE INDEX "idx_assignments_student_id" ON "public"."assignments" USING "btree" ("student_id");



CREATE INDEX "idx_attempts_assessment_id" ON "public"."attempts" USING "btree" ("assessment_id");



CREATE INDEX "idx_enrollments_batch_id" ON "public"."enrollments" USING "btree" ("batch_id");



CREATE INDEX "idx_enrollments_student_id" ON "public"."enrollments" USING "btree" ("student_id");



CREATE INDEX "idx_meeting_exceptions_class" ON "public"."class_meeting_exceptions" USING "btree" ("class_instance_id", "original_date");



CREATE INDEX "idx_questions_subject_id" ON "public"."questions" USING "btree" ("subject_id");



CREATE INDEX "idx_questions_topic_id" ON "public"."questions" USING "btree" ("topic_id");



CREATE INDEX "idx_quh_assessment_id" ON "public"."question_usage_history" USING "btree" ("assessment_id");



CREATE INDEX "idx_quh_question_id" ON "public"."question_usage_history" USING "btree" ("question_id");



CREATE INDEX "idx_quh_student_id" ON "public"."question_usage_history" USING "btree" ("student_id");



CREATE INDEX "idx_vault_english_deleted" ON "public"."vocabulary_vault" USING "btree" ("english", "deleted_at");



CREATE INDEX "idx_vault_indonesian_deleted" ON "public"."vocabulary_vault" USING "btree" ("indonesian", "deleted_at");



CREATE INDEX "idx_vault_topic_deleted" ON "public"."vocabulary_vault" USING "btree" ("topic", "deleted_at");



CREATE INDEX "idx_vocab_vault_target_level" ON "public"."vocabulary_vault" USING "btree" ("target_level");



CREATE INDEX "idx_vocab_vault_topic" ON "public"."vocabulary_vault" USING "btree" ("topic");



CREATE INDEX "idx_vocabulary_vault_target_level" ON "public"."vocabulary_vault" USING "btree" ("target_level");



CREATE INDEX "idx_vocabulary_vault_theme" ON "public"."vocabulary_vault" USING "btree" ("theme");



CREATE INDEX "idx_vocabulary_vault_theme_code" ON "public"."vocabulary_vault" USING "btree" ("theme_code");



CREATE INDEX "idx_vocabulary_vault_topic_code" ON "public"."vocabulary_vault" USING "btree" ("topic_code");



CREATE INDEX "scholarships_student_id_idx" ON "public"."scholarships" USING "btree" ("student_id");



CREATE OR REPLACE TRIGGER "scholarships_touch_updated_at" BEFORE UPDATE ON "public"."scholarships" FOR EACH ROW EXECUTE FUNCTION "public"."touch_student_updated_at"();



CREATE OR REPLACE TRIGGER "trg_assessments_updated_at" BEFORE UPDATE ON "public"."assessments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_attempt_answers_updated_at" BEFORE UPDATE ON "public"."attempt_answers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_attempts_updated_at" BEFORE UPDATE ON "public"."attempts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_batches_updated_at" BEFORE UPDATE ON "public"."batches" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_class_instances_updated_at" BEFORE UPDATE ON "public"."class_instances" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_enrollments_updated_at" BEFORE UPDATE ON "public"."enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_institutions_updated_at" BEFORE UPDATE ON "public"."institutions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_professional_skills_updated_at" BEFORE UPDATE ON "public"."professional_skills" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_programs_updated_at" BEFORE UPDATE ON "public"."programs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_progress_updated_at" BEFORE UPDATE ON "public"."progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_questions_updated_at" BEFORE UPDATE ON "public"."questions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_students_updated_at" BEFORE UPDATE ON "public"."students" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_subjects_updated_at" BEFORE UPDATE ON "public"."classes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_subjects_updated_at" BEFORE UPDATE ON "public"."subjects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_topics_updated_at" BEFORE UPDATE ON "public"."topics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_user_professionals_updated_at" BEFORE UPDATE ON "public"."user_professionals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_work_records_updated_at" BEFORE UPDATE ON "public"."work_records" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_student_batch_change" BEFORE UPDATE ON "public"."students" FOR EACH ROW EXECUTE FUNCTION "public"."trg_student_batch_change"();



ALTER TABLE ONLY "public"."additional_members"
    ADD CONSTRAINT "additional_members_class_instance_id_fkey" FOREIGN KEY ("class_instance_id") REFERENCES "public"."class_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."additional_members"
    ADD CONSTRAINT "additional_members_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessment_questions"
    ADD CONSTRAINT "assessment_questions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessment_results"
    ADD CONSTRAINT "assessment_results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessment_topics"
    ADD CONSTRAINT "assessment_topics_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessment_topics"
    ADD CONSTRAINT "assessment_topics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id");



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_prerequisite_assessment_id_fkey" FOREIGN KEY ("prerequisite_assessment_id") REFERENCES "public"."assessments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_prerequisite_id_fkey" FOREIGN KEY ("prerequisite_id") REFERENCES "public"."assessments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attempt_answers"
    ADD CONSTRAINT "attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attempts"
    ADD CONSTRAINT "attempts_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attempts"
    ADD CONSTRAINT "attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_current_level_id_fkey" FOREIGN KEY ("current_level_id") REFERENCES "public"."levels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessment_attempt_answers"
    ADD CONSTRAINT "challenge_attempt_answers_challenge_attempt_id_fkey" FOREIGN KEY ("assessment_attempt_id") REFERENCES "public"."assessment_attempts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_instances"
    ADD CONSTRAINT "class_instances_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_instances"
    ADD CONSTRAINT "class_instances_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_meetings"
    ADD CONSTRAINT "class_meetings_class_instance_id_fkey" FOREIGN KEY ("class_instance_id") REFERENCES "public"."class_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_meeting_exceptions"
    ADD CONSTRAINT "class_meeting_exceptions_class_instance_id_fkey" FOREIGN KEY ("class_instance_id") REFERENCES "public"."class_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_levels"
    ADD CONSTRAINT "class_levels_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_levels"
    ADD CONSTRAINT "class_levels_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professional_skills"
    ADD CONSTRAINT "professional_skills_user_professional_id_fkey" FOREIGN KEY ("user_professional_id") REFERENCES "public"."user_professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."progress"
    ADD CONSTRAINT "progress_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."progress"
    ADD CONSTRAINT "progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_usage_history"
    ADD CONSTRAINT "question_usage_history_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."question_usage_history"
    ADD CONSTRAINT "question_usage_history_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."question_usage_history"
    ADD CONSTRAINT "question_usage_history_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."question_usage_history"
    ADD CONSTRAINT "question_usage_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requirement_targets"
    ADD CONSTRAINT "requirement_targets_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requirement_targets"
    ADD CONSTRAINT "requirement_targets_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "public"."achievement_targets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_accounts"
    ADD CONSTRAINT "student_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_import_logs"
    ADD CONSTRAINT "student_import_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."student_requirement_progress"
    ADD CONSTRAINT "student_requirement_progress_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_target_progress"
    ADD CONSTRAINT "student_target_progress_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "public"."achievement_targets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id");



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_records"
    ADD CONSTRAINT "work_records_user_professional_id_fkey" FOREIGN KEY ("user_professional_id") REFERENCES "public"."user_professionals"("id") ON DELETE CASCADE;



CREATE POLICY "Allow access to assessment_instances" ON "public"."assessment_instances" USING (true) WITH CHECK (true);



CREATE POLICY "Allow audit writes" ON "public"."exam_history" USING (true);



CREATE POLICY "Allow full access on assessments" ON "public"."assessments" USING (true);



CREATE POLICY "Allow insert on assessment_results" ON "public"."assessment_results" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow manage achievement_targets" ON "public"."achievement_targets" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL)) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Allow manage requirement_targets" ON "public"."requirement_targets" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL)) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Allow manage requirements" ON "public"."requirements" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL)) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Allow manage student_requirement_progress" ON "public"."student_requirement_progress" USING (true) WITH CHECK (true);



CREATE POLICY "Allow manage student_target_progress" ON "public"."student_target_progress" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public app state read" ON "public"."cec_app_state" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public app state update" ON "public"."cec_app_state" FOR UPDATE TO "authenticated", "anon" USING (("id" = 1)) WITH CHECK (("id" = 1));



CREATE POLICY "Allow public app state write" ON "public"."cec_app_state" FOR INSERT TO "authenticated", "anon" WITH CHECK (("id" = 1));



CREATE POLICY "Allow public read on modules" ON "public"."modules" FOR SELECT USING (true);



CREATE POLICY "Allow read achievement_targets" ON "public"."achievement_targets" FOR SELECT USING (true);



CREATE POLICY "Allow read on assessment_results" ON "public"."assessment_results" FOR SELECT USING (true);



CREATE POLICY "Allow read requirement_targets" ON "public"."requirement_targets" FOR SELECT USING (true);



CREATE POLICY "Allow read requirements" ON "public"."requirements" FOR SELECT USING (true);



CREATE POLICY "Allow read student_requirement_progress" ON "public"."student_requirement_progress" FOR SELECT USING (true);



CREATE POLICY "Allow read student_target_progress" ON "public"."student_target_progress" FOR SELECT USING (true);



CREATE POLICY "Allow student read/write submissions" ON "public"."student_submissions" USING (true);



CREATE POLICY "Allow students to read their own profile" ON "public"."students" FOR SELECT USING (true);



CREATE POLICY "Allow update on assessment_results" ON "public"."assessment_results" FOR UPDATE USING (true);



CREATE POLICY "Authenticated users read active requirements" ON "public"."requirements" FOR SELECT TO "authenticated" USING (("status" = 'active'::"text"));



CREATE POLICY "Authenticated users read active targets" ON "public"."achievement_targets" FOR SELECT TO "authenticated" USING (("status" = 'active'::"text"));



CREATE POLICY "Authenticated users read target relationships" ON "public"."requirement_targets" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Student accounts read own record" ON "public"."student_accounts" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Students read own progress" ON "public"."student_progress" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."student_accounts" "account"
  WHERE (("account"."student_id" = "student_progress"."student_id") AND ("account"."user_id" = "auth"."uid"())))));



CREATE POLICY "Students read own requirement progress" ON "public"."student_requirement_progress" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."student_accounts" "account"
  WHERE (("account"."student_id" = "student_requirement_progress"."student_id") AND ("account"."user_id" = "auth"."uid"())))));



CREATE POLICY "Students read own scholarships" ON "public"."scholarships" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."student_accounts" "account"
  WHERE (("account"."student_id" = "scholarships"."student_id") AND ("account"."user_id" = "auth"."uid"())))));



CREATE POLICY "Students read own target progress" ON "public"."student_target_progress" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."student_accounts" "account"
  WHERE (("account"."student_id" = "student_target_progress"."student_id") AND ("account"."user_id" = "auth"."uid"())))));



CREATE POLICY "Tutors manage requirement progress" ON "public"."student_requirement_progress" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'tutor'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'tutor'::"text"));



CREATE POLICY "Tutors manage requirement targets" ON "public"."requirement_targets" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'tutor'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'tutor'::"text"));



CREATE POLICY "Tutors manage requirements" ON "public"."requirements" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'tutor'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'tutor'::"text"));



CREATE POLICY "Tutors manage scholarships" ON "public"."scholarships" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'tutor'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'tutor'::"text"));



CREATE POLICY "Tutors manage student accounts" ON "public"."student_accounts" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'tutor'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'tutor'::"text"));



CREATE POLICY "Tutors manage target progress" ON "public"."student_target_progress" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'tutor'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'tutor'::"text"));



CREATE POLICY "Tutors manage targets" ON "public"."achievement_targets" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'tutor'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'tutor'::"text"));



CREATE POLICY "Vault auth manage" ON "public"."vocabulary_vault" USING (true);



CREATE POLICY "Vault public read" ON "public"."vocabulary_vault" FOR SELECT USING (true);



ALTER TABLE "public"."achievement_targets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."additional_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_all_challenge_attempt_answers" ON "public"."assessment_attempt_answers" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "admin_all_challenge_attempts" ON "public"."assessment_attempts" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "admin_all_class_meetings" ON "public"."class_meetings" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "admin_all_professional_skills" ON "public"."professional_skills" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "admin_all_subjects" ON "public"."subjects" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "admin_all_user_professionals" ON "public"."user_professionals" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "admin_all_word_types" ON "public"."word_types" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "admin_all_work_records" ON "public"."work_records" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "anon_read_assessment_questions" ON "public"."assessment_questions" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_read_assessment_topics" ON "public"."assessment_topics" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_read_assessments" ON "public"."assessments" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_read_assignments" ON "public"."assignments" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_read_enrollments" ON "public"."enrollments" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_read_question_usage_history" ON "public"."question_usage_history" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_read_word_types" ON "public"."word_types" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_additional_members" ON "public"."additional_members" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_assessment_questions" ON "public"."assessment_questions" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_assessment_topics" ON "public"."assessment_topics" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_assessments" ON "public"."assessments" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_assignments" ON "public"."assignments" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_attempt_answers" ON "public"."attempt_answers" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_attempts" ON "public"."attempts" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_audit_logs" ON "public"."audit_logs" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_batches" ON "public"."batches" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_class_instances" ON "public"."class_instances" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_classes" ON "public"."classes" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_enrollments" ON "public"."enrollments" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_institutions" ON "public"."institutions" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_levels" ON "public"."levels" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_programs" ON "public"."programs" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_progress" ON "public"."progress" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_question_types" ON "public"."question_types" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_question_usage_history" ON "public"."question_usage_history" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_questions" ON "public"."questions" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_site_settings" ON "public"."site_settings" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_students" ON "public"."students" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_select_topics" ON "public"."topics" FOR SELECT TO "anon" USING (true);



CREATE POLICY "app state insert" ON "public"."cec_app_state" FOR INSERT TO "authenticated", "anon" WITH CHECK (("id" = 1));



CREATE POLICY "app state read" ON "public"."cec_app_state" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "app state update" ON "public"."cec_app_state" FOR UPDATE TO "authenticated", "anon" USING (("id" = 1)) WITH CHECK (("id" = 1));



ALTER TABLE "public"."assessment_attempt_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessment_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessment_instances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessment_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessment_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessment_topics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attempt_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "auth_all_additional_members" ON "public"."additional_members" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_assessment_questions" ON "public"."assessment_questions" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_assessment_topics" ON "public"."assessment_topics" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_assessments" ON "public"."assessments" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_assignments" ON "public"."assignments" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_attempt_answers" ON "public"."attempt_answers" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_attempts" ON "public"."attempts" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_audit_logs" ON "public"."audit_logs" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_batches" ON "public"."batches" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_class_instances" ON "public"."class_instances" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_classes" ON "public"."classes" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_enrollments" ON "public"."enrollments" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_institutions" ON "public"."institutions" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_levels" ON "public"."levels" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_programs" ON "public"."programs" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_progress" ON "public"."progress" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_question_types" ON "public"."question_types" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_question_usage_history" ON "public"."question_usage_history" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_questions" ON "public"."questions" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_site_settings" ON "public"."site_settings" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_students" ON "public"."students" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all_topics" ON "public"."topics" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cec_app_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_instances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_levels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_meeting_exceptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_meetings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."classes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exam_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."institutions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."levels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."professional_skills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."programs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_read_subjects" ON "public"."subjects" FOR SELECT TO "anon" USING ((("deleted_at" IS NULL) AND ("is_active" = true)));



ALTER TABLE "public"."question_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "question_types_all_service_role" ON "public"."question_types" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "question_types_insert_authenticated" ON "public"."question_types" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "question_types_select_all" ON "public"."question_types" FOR SELECT USING (true);



CREATE POLICY "question_types_update_authenticated" ON "public"."question_types" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."question_usage_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questions_all_service_role" ON "public"."questions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "questions_delete_authenticated" ON "public"."questions" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "questions_insert_authenticated" ON "public"."questions" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "questions_select_all" ON "public"."questions" FOR SELECT USING (true);



CREATE POLICY "questions_update_authenticated" ON "public"."questions" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."requirement_targets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."requirements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scholarships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_all_additional_members" ON "public"."additional_members" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_assessment_questions" ON "public"."assessment_questions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_assessment_topics" ON "public"."assessment_topics" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_assessments" ON "public"."assessments" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_assignments" ON "public"."assignments" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_attempt_answers" ON "public"."attempt_answers" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_attempts" ON "public"."attempts" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_audit_logs" ON "public"."audit_logs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_batches" ON "public"."batches" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_challenge_attempt_answers" ON "public"."assessment_attempt_answers" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_challenge_attempts" ON "public"."assessment_attempts" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_class_instances" ON "public"."class_instances" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_class_meetings" ON "public"."class_meetings" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_enrollments" ON "public"."enrollments" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_institutions" ON "public"."institutions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_levels" ON "public"."levels" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_professional_skills" ON "public"."professional_skills" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_programs" ON "public"."programs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_progress" ON "public"."progress" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_question_usage_history" ON "public"."question_usage_history" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_site_settings" ON "public"."site_settings" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_students" ON "public"."students" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_subjects" ON "public"."classes" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_subjects" ON "public"."subjects" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_user_professionals" ON "public"."user_professionals" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_word_types" ON "public"."question_types" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_word_types" ON "public"."word_types" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_work_records" ON "public"."work_records" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."site_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_import_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_requirement_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_target_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."students" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subjects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."topics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "topics_all_service_role" ON "public"."topics" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "topics_delete_authenticated" ON "public"."topics" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "topics_insert_authenticated" ON "public"."topics" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "topics_select_all" ON "public"."topics" FOR SELECT USING (true);



CREATE POLICY "topics_update_authenticated" ON "public"."topics" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."user_professionals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vault_all_service_role" ON "public"."vocabulary_vault" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "vault_delete_authenticated" ON "public"."vocabulary_vault" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "vault_insert_authenticated" ON "public"."vocabulary_vault" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "vault_select_all" ON "public"."vocabulary_vault" FOR SELECT USING (true);



CREATE POLICY "vault_update_authenticated" ON "public"."vocabulary_vault" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."vocabulary_vault" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."word_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_records" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."auto_close_expired_attempts"("p_attempt_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."auto_close_expired_attempts"("p_attempt_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_close_expired_attempts"("p_attempt_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_server_time_wita"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_server_time_wita"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_server_time_wita"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."merge_student_import"("import_filename" "text", "records" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."merge_student_import"("import_filename" "text", "records" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."merge_student_import"("import_filename" "text", "records" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."reorder_assessment"("p_assessment_id" "uuid", "p_new_order" integer, "p_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reorder_assessment"("p_assessment_id" "uuid", "p_new_order" integer, "p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reorder_assessment"("p_assessment_id" "uuid", "p_new_order" integer, "p_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_student_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_student_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_student_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_student_batch_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_student_batch_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_student_batch_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_student_hierarchy"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_student_hierarchy"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_student_hierarchy"() TO "service_role";


















GRANT ALL ON TABLE "public"."achievement_targets" TO "anon";
GRANT ALL ON TABLE "public"."achievement_targets" TO "authenticated";
GRANT ALL ON TABLE "public"."achievement_targets" TO "service_role";



GRANT ALL ON TABLE "public"."additional_members" TO "anon";
GRANT ALL ON TABLE "public"."additional_members" TO "authenticated";
GRANT ALL ON TABLE "public"."additional_members" TO "service_role";



GRANT ALL ON TABLE "public"."assessment_attempt_answers" TO "anon";
GRANT ALL ON TABLE "public"."assessment_attempt_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."assessment_attempt_answers" TO "service_role";



GRANT ALL ON TABLE "public"."assessment_attempts" TO "anon";
GRANT ALL ON TABLE "public"."assessment_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."assessment_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."assessment_instances" TO "anon";
GRANT ALL ON TABLE "public"."assessment_instances" TO "authenticated";
GRANT ALL ON TABLE "public"."assessment_instances" TO "service_role";



GRANT ALL ON TABLE "public"."assessment_questions" TO "anon";
GRANT ALL ON TABLE "public"."assessment_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."assessment_questions" TO "service_role";



GRANT ALL ON TABLE "public"."assessment_results" TO "anon";
GRANT ALL ON TABLE "public"."assessment_results" TO "authenticated";
GRANT ALL ON TABLE "public"."assessment_results" TO "service_role";



GRANT ALL ON TABLE "public"."assessment_topics" TO "anon";
GRANT ALL ON TABLE "public"."assessment_topics" TO "authenticated";
GRANT ALL ON TABLE "public"."assessment_topics" TO "service_role";



GRANT ALL ON TABLE "public"."assessments" TO "anon";
GRANT ALL ON TABLE "public"."assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."assessments" TO "service_role";



GRANT ALL ON TABLE "public"."assignments" TO "anon";
GRANT ALL ON TABLE "public"."assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."assignments" TO "service_role";



GRANT ALL ON TABLE "public"."attempt_answers" TO "anon";
GRANT ALL ON TABLE "public"."attempt_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."attempt_answers" TO "service_role";



GRANT ALL ON TABLE "public"."attempts" TO "anon";
GRANT ALL ON TABLE "public"."attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."attempts" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."batches" TO "anon";
GRANT ALL ON TABLE "public"."batches" TO "authenticated";
GRANT ALL ON TABLE "public"."batches" TO "service_role";



GRANT ALL ON TABLE "public"."cec_app_state" TO "anon";
GRANT ALL ON TABLE "public"."cec_app_state" TO "authenticated";
GRANT ALL ON TABLE "public"."cec_app_state" TO "service_role";



GRANT ALL ON TABLE "public"."class_instances" TO "anon";
GRANT ALL ON TABLE "public"."class_instances" TO "authenticated";
GRANT ALL ON TABLE "public"."class_instances" TO "service_role";



GRANT ALL ON TABLE "public"."class_levels" TO "anon";
GRANT ALL ON TABLE "public"."class_levels" TO "authenticated";
GRANT ALL ON TABLE "public"."class_levels" TO "service_role";



GRANT ALL ON TABLE "public"."class_meeting_exceptions" TO "anon";
GRANT ALL ON TABLE "public"."class_meeting_exceptions" TO "authenticated";
GRANT ALL ON TABLE "public"."class_meeting_exceptions" TO "service_role";



GRANT ALL ON TABLE "public"."class_meetings" TO "anon";
GRANT ALL ON TABLE "public"."class_meetings" TO "authenticated";
GRANT ALL ON TABLE "public"."class_meetings" TO "service_role";



GRANT ALL ON TABLE "public"."classes" TO "anon";
GRANT ALL ON TABLE "public"."classes" TO "authenticated";
GRANT ALL ON TABLE "public"."classes" TO "service_role";



GRANT ALL ON TABLE "public"."enrollments" TO "anon";
GRANT ALL ON TABLE "public"."enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."exam_history" TO "anon";
GRANT ALL ON TABLE "public"."exam_history" TO "authenticated";
GRANT ALL ON TABLE "public"."exam_history" TO "service_role";



GRANT ALL ON TABLE "public"."institutions" TO "anon";
GRANT ALL ON TABLE "public"."institutions" TO "authenticated";
GRANT ALL ON TABLE "public"."institutions" TO "service_role";



GRANT ALL ON TABLE "public"."levels" TO "anon";
GRANT ALL ON TABLE "public"."levels" TO "authenticated";
GRANT ALL ON TABLE "public"."levels" TO "service_role";



GRANT ALL ON TABLE "public"."modules" TO "anon";
GRANT ALL ON TABLE "public"."modules" TO "authenticated";
GRANT ALL ON TABLE "public"."modules" TO "service_role";



GRANT ALL ON TABLE "public"."professional_skills" TO "anon";
GRANT ALL ON TABLE "public"."professional_skills" TO "authenticated";
GRANT ALL ON TABLE "public"."professional_skills" TO "service_role";



GRANT ALL ON TABLE "public"."programs" TO "anon";
GRANT ALL ON TABLE "public"."programs" TO "authenticated";
GRANT ALL ON TABLE "public"."programs" TO "service_role";



GRANT ALL ON TABLE "public"."progress" TO "anon";
GRANT ALL ON TABLE "public"."progress" TO "authenticated";
GRANT ALL ON TABLE "public"."progress" TO "service_role";



GRANT ALL ON TABLE "public"."question_types" TO "anon";
GRANT ALL ON TABLE "public"."question_types" TO "authenticated";
GRANT ALL ON TABLE "public"."question_types" TO "service_role";



GRANT ALL ON TABLE "public"."question_usage_history" TO "anon";
GRANT ALL ON TABLE "public"."question_usage_history" TO "authenticated";
GRANT ALL ON TABLE "public"."question_usage_history" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON TABLE "public"."requirement_targets" TO "anon";
GRANT ALL ON TABLE "public"."requirement_targets" TO "authenticated";
GRANT ALL ON TABLE "public"."requirement_targets" TO "service_role";



GRANT ALL ON TABLE "public"."requirements" TO "anon";
GRANT ALL ON TABLE "public"."requirements" TO "authenticated";
GRANT ALL ON TABLE "public"."requirements" TO "service_role";



GRANT ALL ON TABLE "public"."scholarships" TO "authenticated";
GRANT ALL ON TABLE "public"."scholarships" TO "service_role";



GRANT ALL ON TABLE "public"."site_settings" TO "anon";
GRANT ALL ON TABLE "public"."site_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."site_settings" TO "service_role";



GRANT ALL ON TABLE "public"."student_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."student_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."student_import_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."student_import_logs" TO "service_role";



GRANT ALL ON TABLE "public"."student_progress" TO "anon";
GRANT ALL ON TABLE "public"."student_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."student_progress" TO "service_role";



GRANT ALL ON TABLE "public"."student_requirement_progress" TO "anon";
GRANT ALL ON TABLE "public"."student_requirement_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."student_requirement_progress" TO "service_role";



GRANT ALL ON TABLE "public"."student_submissions" TO "anon";
GRANT ALL ON TABLE "public"."student_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."student_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."student_target_progress" TO "anon";
GRANT ALL ON TABLE "public"."student_target_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."student_target_progress" TO "service_role";



GRANT ALL ON TABLE "public"."students" TO "anon";
GRANT ALL ON TABLE "public"."students" TO "authenticated";
GRANT ALL ON TABLE "public"."students" TO "service_role";



GRANT ALL ON TABLE "public"."subjects" TO "anon";
GRANT ALL ON TABLE "public"."subjects" TO "authenticated";
GRANT ALL ON TABLE "public"."subjects" TO "service_role";



GRANT ALL ON TABLE "public"."topics" TO "anon";
GRANT ALL ON TABLE "public"."topics" TO "authenticated";
GRANT ALL ON TABLE "public"."topics" TO "service_role";



GRANT ALL ON TABLE "public"."user_professionals" TO "anon";
GRANT ALL ON TABLE "public"."user_professionals" TO "authenticated";
GRANT ALL ON TABLE "public"."user_professionals" TO "service_role";



GRANT ALL ON TABLE "public"."vocabulary_vault" TO "anon";
GRANT ALL ON TABLE "public"."vocabulary_vault" TO "authenticated";
GRANT ALL ON TABLE "public"."vocabulary_vault" TO "service_role";



GRANT ALL ON TABLE "public"."word_types" TO "anon";
GRANT ALL ON TABLE "public"."word_types" TO "authenticated";
GRANT ALL ON TABLE "public"."word_types" TO "service_role";



GRANT ALL ON TABLE "public"."work_records" TO "anon";
GRANT ALL ON TABLE "public"."work_records" TO "authenticated";
GRANT ALL ON TABLE "public"."work_records" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

-- ==============================================================================
-- Migration: 20261012_emergency_submit_rpc.sql
-- Description: Server-authoritative emergency submission fallback RPC
--              executed with SECURITY DEFINER to securely record answers,
--              compute scores/grades on the database, and resolve best scores
--              when Edge Functions are unreachable.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.emergency_submit_attempt(
  p_attempt_id uuid,
  p_answers jsonb DEFAULT NULL,
  p_status text DEFAULT 'submitted'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt RECORD;
  v_student_id uuid;
  v_assessment_id uuid;
  v_is_remedial boolean;
  v_assessment_type text;
  v_ans RECORD;
  v_ans_elem jsonb;
  v_ans_id uuid;
  v_ans_val text;
  v_total_points numeric := 0;
  v_correct_count integer := 0;
  v_total_questions integer := 0;
  v_percentage numeric := 0;
  v_effective_score numeric := 0;
  v_grade text := 'F';
  v_result jsonb;
  v_norm_student text;
  v_is_match boolean;
  v_acc_elem text;
  v_valid_str text;
  v_part text;
BEGIN
  -- 1. Fetch Attempt
  SELECT id, student_id, assessment_id, status, is_remedial_unlocked
  INTO v_attempt
  FROM public.attempts
  WHERE id = p_attempt_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt not found: %', p_attempt_id;
  END IF;

  v_student_id := v_attempt.student_id;
  v_assessment_id := v_attempt.assessment_id;
  v_is_remedial := COALESCE(v_attempt.is_remedial_unlocked, false);

  -- 2. Idempotency Check: if already submitted, return existing attempt
  IF lower(v_attempt.status) IN ('submitted', 'auto_submitted', 'evaluated') THEN
    SELECT to_jsonb(a.*) INTO v_result FROM public.attempts a WHERE a.id = p_attempt_id;
    RETURN v_result;
  END IF;

  -- 3. Save Answers if provided
  IF p_answers IS NOT NULL AND jsonb_typeof(p_answers) = 'array' THEN
    FOR v_ans_elem IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
      v_ans_id := (v_ans_elem->>'attempt_answer_id')::uuid;
      v_ans_val := COALESCE(v_ans_elem->>'student_answer', '');
      IF v_ans_id IS NOT NULL THEN
        UPDATE public.attempt_answers
        SET student_answer = v_ans_val,
            answered_at = NOW(),
            updated_at = NOW()
        WHERE id = v_ans_id AND attempt_id = p_attempt_id;
      END IF;
    END LOOP;
  ELSIF p_answers IS NOT NULL AND jsonb_typeof(p_answers) = 'object' THEN
    FOR v_ans_id, v_ans_val IN SELECT key::uuid, value #>> '{}' FROM jsonb_each(p_answers)
    LOOP
      UPDATE public.attempt_answers
      SET student_answer = COALESCE(v_ans_val, ''),
          answered_at = NOW(),
          updated_at = NOW()
      WHERE id = v_ans_id AND attempt_id = p_attempt_id;
    END LOOP;
  END IF;

  -- 4. Evaluate Each Question in attempt_answers
  FOR v_ans IN
    SELECT id, student_answer, accepted_answers_snapshot, correct_answer_snapshot
    FROM public.attempt_answers
    WHERE attempt_id = p_attempt_id
  LOOP
    v_total_questions := v_total_questions + 1;
    v_is_match := false;
    v_norm_student := regexp_replace(lower(trim(COALESCE(v_ans.student_answer, ''))), '\s+', ' ', 'g');
    v_norm_student := regexp_replace(v_norm_student, '[.!?,]+$', '');

    IF v_norm_student <> '' THEN
      -- Check accepted_answers_snapshot
      IF v_ans.accepted_answers_snapshot IS NOT NULL THEN
        IF jsonb_typeof(to_jsonb(v_ans.accepted_answers_snapshot)) = 'array' THEN
          FOR v_acc_elem IN SELECT * FROM jsonb_array_elements_text(to_jsonb(v_ans.accepted_answers_snapshot))
          LOOP
            IF v_norm_student = regexp_replace(lower(trim(v_acc_elem)), '[.!?,]+$', '') THEN
              v_is_match := true;
              EXIT;
            END IF;
          END LOOP;
        ELSE
          v_valid_str := v_ans.accepted_answers_snapshot #>> '{}';
          IF v_valid_str IS NOT NULL THEN
            FOREACH v_part IN ARRAY string_to_array(v_valid_str, ';')
            LOOP
              IF v_norm_student = regexp_replace(lower(trim(v_part)), '[.!?,]+$', '') THEN
                v_is_match := true;
                EXIT;
              END IF;
            END LOOP;
          END IF;
        END IF;
      END IF;

      -- Check correct_answer_snapshot if not already matched
      IF NOT v_is_match AND v_ans.correct_answer_snapshot IS NOT NULL THEN
        v_valid_str := v_ans.correct_answer_snapshot;
        FOREACH v_part IN ARRAY regexp_split_to_array(v_valid_str, '[;/|]')
        LOOP
          IF v_norm_student = regexp_replace(lower(trim(v_part)), '[.!?,]+$', '') THEN
            v_is_match := true;
            EXIT;
          END IF;
        END LOOP;
      END IF;
    END IF;

    -- Update individual attempt_answer score
    IF v_is_match THEN
      v_total_points := v_total_points + 1.0;
      v_correct_count := v_correct_count + 1;
      UPDATE public.attempt_answers
      SET score = 1.00,
          is_correct = true,
          evaluation_result = 'correct',
          similarity_score = 1.00,
          updated_at = NOW()
      WHERE id = v_ans.id;
    ELSE
      UPDATE public.attempt_answers
      SET score = 0.00,
          is_correct = false,
          evaluation_result = 'incorrect',
          similarity_score = 0.00,
          updated_at = NOW()
      WHERE id = v_ans.id;
    END IF;
  END LOOP;

  -- 5. Calculate Score & Grade (AGENTS.md §2.10)
  IF v_total_questions > 0 THEN
    v_percentage := round((v_total_points / v_total_questions::numeric) * 100.0, 2);
  ELSE
    v_percentage := 0;
  END IF;

  v_effective_score := v_percentage;

  -- Remedial cap check for summative tests (KKM 60% Cap)
  IF v_is_remedial THEN
    SELECT assessment_type INTO v_assessment_type FROM public.assessments WHERE id = v_assessment_id;
    IF (v_assessment_type IN ('EXAM', 'QUIZ', 'TEST', 'VOCAB_TEST', 'UNIFIED_TEST') OR v_assessment_type LIKE '%TEST%') AND v_effective_score > 60 THEN
      v_effective_score := 60;
    END IF;
  END IF;

  -- Centralized authoritative grade mapping (§2.10: E 0-19, D 20-39, C 40-59, B 60-79, A 80-99, Star 100)
  IF v_effective_score >= 100 THEN
    v_grade := 'S';
  ELSIF v_effective_score >= 80 THEN
    v_grade := 'A';
  ELSIF v_effective_score >= 60 THEN
    v_grade := 'B';
  ELSIF v_effective_score >= 40 THEN
    v_grade := 'C';
  ELSIF v_effective_score >= 20 THEN
    v_grade := 'D';
  ELSE
    v_grade := 'E';
  END IF;

  -- 6. Update Attempt
  UPDATE public.attempts
  SET status = COALESCE(p_status, 'submitted'),
      submitted_at = NOW(),
      score = v_total_points,
      correct_count = v_correct_count,
      total_questions = v_total_questions,
      percentage = v_percentage,
      grade = v_grade,
      effective_score = v_effective_score,
      updated_at = NOW()
  WHERE id = p_attempt_id;

  -- 7. Best Score Resolution (§2.7)
  UPDATE public.attempts
  SET is_best_score = false
  WHERE student_id = v_student_id AND assessment_id = v_assessment_id;

  UPDATE public.attempts
  SET is_best_score = true
  WHERE id = (
    SELECT id FROM public.attempts
    WHERE student_id = v_student_id
      AND assessment_id = v_assessment_id
      AND lower(status) IN ('submitted', 'auto_submitted', 'evaluated')
    ORDER BY COALESCE(effective_score, percentage, 0) DESC, submitted_at DESC
    LIMIT 1
  );

  SELECT to_jsonb(a.*) INTO v_result FROM public.attempts a WHERE a.id = p_attempt_id;
  RETURN v_result;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.emergency_submit_attempt(uuid, jsonb, text) TO anon;
GRANT EXECUTE ON FUNCTION public.emergency_submit_attempt(uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.emergency_submit_attempt(uuid, jsonb, text) TO service_role;
