-- ============================================================================
-- TOPSCORE LMS — FULL SYSTEM TERMINOLOGY MIGRATION
-- Migration: 20261027160000_assessment_to_test_overhaul.sql
-- Deprecate & Purge: 'Assessment' -> 'Test' (Plural: 'Tests')
-- Sub-categories: 'quiz' (Daily tasks/drills) | 'exam' (Formal scheduled examinations)
-- ============================================================================

BEGIN;

-- 1. Create the new test_type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'test_type') THEN
        CREATE TYPE public.test_type AS ENUM ('quiz', 'exam');
    END IF;
END $$;

-- 2. Create the new 'tests' table (replacing 'assessments')
CREATE TABLE IF NOT EXISTS public.tests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
    level_id uuid REFERENCES public.levels(id) ON DELETE SET NULL,
    test_type public.test_type NOT NULL DEFAULT 'quiz',
    test_subtype text, -- Preserves granular archetype: VOCAB_TASK, PHRASE_TASK, VOCAB_TEST, PHRASE_TEST
    title text,
    description text,
    status text DEFAULT 'DRAFT'::text,
    availability_start timestamptz,
    availability_end timestamptz,
    working_duration_minutes integer DEFAULT 60,
    prerequisite_test_id uuid REFERENCES public.tests(id) ON DELETE SET NULL,
    created_by text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    deleted_at timestamptz,
    institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
    program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
    prerequisite_id uuid REFERENCES public.tests(id) ON DELETE SET NULL,
    module_type text,
    schedule_mode text DEFAULT 'flexible'::text,
    window_start timestamptz,
    window_end timestamptz,
    question_order text DEFAULT 'random'::text,
    payload jsonb,
    shell_code text,
    module_id uuid REFERENCES public.modules(id),
    answer_type text DEFAULT 'written'::text,
    is_dynamic_shell boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 999,
    topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
    category text DEFAULT 'TEST'::text,
    display_name text,
    minimum_required_score numeric DEFAULT 0,
    max_attempts integer DEFAULT 0,
    retake_allowed boolean DEFAULT true
);

-- 3. Create the new 'test_items' table (replacing 'assessment_questions')
CREATE TABLE IF NOT EXISTS public.test_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    question_id uuid,
    question_text_snapshot text NOT NULL,
    accepted_answers_snapshot jsonb DEFAULT '[]'::jsonb NOT NULL,
    topic_snapshot text NOT NULL,
    word_type_snapshot text,
    display_order integer NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    deleted_at timestamptz,
    answer_type text DEFAULT 'written'::text,
    options_snapshot jsonb DEFAULT '[]'::jsonb
);

-- 4. Create secondary relational tables
CREATE TABLE IF NOT EXISTS public.test_topics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.test_results (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
    test_id uuid REFERENCES public.tests(id) ON DELETE CASCADE,
    module_type varchar(50) NOT NULL,
    final_score integer DEFAULT 0 NOT NULL,
    raw_evaluation_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    transcript text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 5. Safe Data Transformation & Backfilling into 'tests'
INSERT INTO public.tests (
    id, class_id, level_id, test_type, test_subtype, title, description, status,
    availability_start, availability_end, working_duration_minutes, prerequisite_test_id,
    created_by, created_at, updated_at, deleted_at, institution_id, program_id,
    prerequisite_id, module_type, schedule_mode, window_start, window_end,
    question_order, payload, shell_code, module_id, answer_type, is_dynamic_shell,
    display_order, topic_id, category, display_name, minimum_required_score,
    max_attempts, retake_allowed
)
SELECT 
    a.id, a.class_id, a.level_id,
    CASE 
        WHEN a.assessment_category = 'TEST' OR a.assessment_type LIKE '%TEST%' OR a.assessment_type = 'EXAM' THEN 'exam'::public.test_type
        ELSE 'quiz'::public.test_type
    END,
    a.assessment_type, a.title, a.description, a.status,
    a.availability_start, a.availability_end, a.working_duration_minutes, a.prerequisite_assessment_id,
    a.created_by, a.created_at, a.updated_at, a.deleted_at, a.institution_id, a.program_id,
    a.prerequisite_id, a.module_type, a.schedule_mode, a.window_start, a.window_end,
    a.question_order, a.payload, a.shell_code, a.module_id, a.answer_type, a.is_dynamic_shell,
    a.display_order, a.topic_id, 'TEST', a.display_name, a.minimum_required_score,
    a.max_attempts, a.retake_allowed
FROM public.assessments a
ON CONFLICT (id) DO UPDATE SET
    test_type = EXCLUDED.test_type,
    test_subtype = EXCLUDED.test_subtype,
    title = EXCLUDED.title,
    shell_code = EXCLUDED.shell_code,
    payload = EXCLUDED.payload,
    working_duration_minutes = EXCLUDED.working_duration_minutes,
    minimum_required_score = EXCLUDED.minimum_required_score,
    updated_at = now();

-- 6. Backfill 'test_items' from 'assessment_questions' (if any exist)
INSERT INTO public.test_items (
    id, test_id, question_id, question_text_snapshot, accepted_answers_snapshot,
    topic_snapshot, word_type_snapshot, display_order, created_at, deleted_at,
    answer_type, options_snapshot
)
SELECT 
    q.id, q.assessment_id, q.question_id, q.question_text_snapshot, q.accepted_answers_snapshot,
    q.topic_snapshot, q.word_type_snapshot, q.display_order, q.created_at, q.deleted_at,
    q.answer_type, q.options_snapshot
FROM public.assessment_questions q
ON CONFLICT (id) DO NOTHING;

-- 7. Add 'test_id' columns to dependent tables & Backfill
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS test_id uuid REFERENCES public.tests(id) ON DELETE CASCADE;
UPDATE public.attempts SET test_id = assessment_id WHERE test_id IS NULL AND assessment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attempts_test_id ON public.attempts(test_id);

ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS test_id uuid REFERENCES public.tests(id) ON DELETE CASCADE;
UPDATE public.assignments SET test_id = assessment_id WHERE test_id IS NULL AND assessment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assignments_test_id ON public.assignments(test_id);

ALTER TABLE public.student_submissions ADD COLUMN IF NOT EXISTS test_id uuid REFERENCES public.tests(id) ON DELETE CASCADE;
UPDATE public.student_submissions SET test_id = assessment_id WHERE test_id IS NULL AND assessment_id IS NOT NULL;

ALTER TABLE public.question_usage_history ADD COLUMN IF NOT EXISTS test_id uuid REFERENCES public.tests(id) ON DELETE SET NULL;
UPDATE public.question_usage_history SET test_id = assessment_id WHERE test_id IS NULL AND assessment_id IS NOT NULL;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exam_history') THEN
        ALTER TABLE public.exam_history ADD COLUMN IF NOT EXISTS test_id uuid REFERENCES public.tests(id) ON DELETE CASCADE;
        UPDATE public.exam_history SET test_id = assessment_id WHERE test_id IS NULL AND assessment_id IS NOT NULL;
    END IF;
END $$;

-- 8. Add Indexes, Triggers, and RLS Policies for new tables
CREATE INDEX IF NOT EXISTS idx_tests_class_id ON public.tests(class_id);
CREATE INDEX IF NOT EXISTS idx_tests_level_id ON public.tests(level_id);
CREATE INDEX IF NOT EXISTS idx_tests_test_type ON public.tests(test_type);
CREATE INDEX IF NOT EXISTS idx_tests_status ON public.tests(status);
CREATE INDEX IF NOT EXISTS idx_tests_display_order ON public.tests(display_order);
CREATE INDEX IF NOT EXISTS idx_tests_shell_code ON public.tests(shell_code);
CREATE INDEX IF NOT EXISTS idx_test_items_test_id ON public.test_items(test_id);

CREATE OR REPLACE TRIGGER trg_tests_updated_at 
BEFORE UPDATE ON public.tests 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tests' AND policyname = 'auth_all_tests') THEN
        CREATE POLICY "auth_all_tests" ON public.tests TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tests' AND policyname = 'anon_select_tests') THEN
        CREATE POLICY "anon_select_tests" ON public.tests FOR SELECT TO anon USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tests' AND policyname = 'service_role_all_tests') THEN
        CREATE POLICY "service_role_all_tests" ON public.tests TO service_role USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'test_items' AND policyname = 'auth_all_test_items') THEN
        CREATE POLICY "auth_all_test_items" ON public.test_items TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'test_items' AND policyname = 'anon_select_test_items') THEN
        CREATE POLICY "anon_select_test_items" ON public.test_items FOR SELECT TO anon USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'test_items' AND policyname = 'service_role_all_test_items') THEN
        CREATE POLICY "service_role_all_test_items" ON public.test_items TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 9. Recreate and Update RPC Functions
CREATE OR REPLACE FUNCTION public.reorder_test(p_test_id uuid, p_new_order integer, p_class_id uuid) 
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_old_order INTEGER;
BEGIN
    SELECT display_order INTO v_old_order
    FROM public.tests
    WHERE id = p_test_id AND class_id = p_class_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Test not found in class %', p_class_id;
    END IF;

    IF v_old_order = p_new_order THEN
        RETURN;
    END IF;

    IF v_old_order < p_new_order THEN
        UPDATE public.tests
        SET display_order = display_order - 1
        WHERE class_id = p_class_id
          AND display_order > v_old_order
          AND display_order <= p_new_order
          AND id != p_test_id;
    ELSE
        UPDATE public.tests
        SET display_order = display_order + 1
        WHERE class_id = p_class_id
          AND display_order >= p_new_order
          AND display_order < v_old_order
          AND id != p_test_id;
    END IF;

    UPDATE public.tests
    SET display_order = p_new_order
    WHERE id = p_test_id;
END;
$$;

-- Update emergency_submit_attempt to support test_id seamlessly
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
  v_test_id uuid;
  v_is_remedial boolean;
  v_test_type text;
  v_ans RECORD;
  v_ans_elem jsonb;
  v_ans_id uuid;
  v_ans_val text;
  v_total_points numeric := 0;
  v_correct_count integer := 0;
  v_total_questions integer := 0;
  v_percentage numeric := 0;
  v_effective_score numeric := 0;
  v_grade text := 'E';
  v_result jsonb;
  v_norm_student text;
  v_is_match boolean;
  v_acc_elem text;
  v_valid_str text;
  v_part text;
BEGIN
  -- 1. Fetch Attempt (supports test_id or fallback assessment_id)
  SELECT id, student_id, COALESCE(test_id, assessment_id) AS test_id, status, is_remedial_unlocked
  INTO v_attempt
  FROM public.attempts
  WHERE id = p_attempt_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt not found: %', p_attempt_id;
  END IF;

  v_student_id := v_attempt.student_id;
  v_test_id := v_attempt.test_id;
  v_is_remedial := COALESCE(v_attempt.is_remedial_unlocked, false);

  -- 2. Idempotency Check
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

    IF v_is_match THEN
      v_total_points := v_total_points + 1.0;
      v_correct_count := v_correct_count + 1;
      UPDATE public.attempt_answers
      SET score = 1.00, is_correct = true, evaluation_result = 'correct', similarity_score = 1.00, updated_at = NOW()
      WHERE id = v_ans.id;
    ELSE
      UPDATE public.attempt_answers
      SET score = 0.00, is_correct = false, evaluation_result = 'incorrect', similarity_score = 0.00, updated_at = NOW()
      WHERE id = v_ans.id;
    END IF;
  END LOOP;

  -- 5. Calculate Score & Grade
  IF v_total_questions > 0 THEN
    v_percentage := round((v_total_points / v_total_questions::numeric) * 100.0, 2);
  ELSE
    v_percentage := 0;
  END IF;

  v_effective_score := v_percentage;

  -- Remedial cap check for summative tests (KKM 60% Cap)
  IF v_is_remedial THEN
    SELECT test_type::text INTO v_test_type FROM public.tests WHERE id = v_test_id;
    IF v_test_type = 'exam' AND v_effective_score > 60 THEN
      v_effective_score := 60;
    END IF;
  END IF;

  -- Official Grading Scale: ★ 100%, A 90-99%, B 80-89%, C 60-79%, D 30-59%, E 0-29%
  IF v_effective_score >= 100 THEN
    v_grade := '★';
  ELSIF v_effective_score >= 90 THEN
    v_grade := 'A';
  ELSIF v_effective_score >= 80 THEN
    v_grade := 'B';
  ELSIF v_effective_score >= 60 THEN
    v_grade := 'C';
  ELSIF v_effective_score >= 30 THEN
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
      test_id = COALESCE(test_id, v_test_id),
      updated_at = NOW()
  WHERE id = p_attempt_id;

  -- 7. Best Score Resolution
  UPDATE public.attempts
  SET is_best_score = false
  WHERE student_id = v_student_id AND (test_id = v_test_id OR assessment_id = v_test_id);

  UPDATE public.attempts
  SET is_best_score = true
  WHERE id = (
    SELECT id FROM public.attempts
    WHERE student_id = v_student_id
      AND (test_id = v_test_id OR assessment_id = v_test_id)
      AND lower(status) IN ('submitted', 'auto_submitted', 'evaluated')
    ORDER BY COALESCE(effective_score, percentage, 0) DESC, submitted_at DESC
    LIMIT 1
  );

  SELECT to_jsonb(a.*) INTO v_result FROM public.attempts a WHERE a.id = p_attempt_id;
  RETURN v_result;
END;
$$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
