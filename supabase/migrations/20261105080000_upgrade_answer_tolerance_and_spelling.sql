-- ==============================================================================
-- Migration: 20261105080000_upgrade_answer_tolerance_and_spelling.sql
-- Description: Upgrade clean_answer_text, strip_answer_symbols, and
--              emergency_submit_attempt RPC with full hyphen, punctuation,
--              and letter-by-letter spelling space tolerance.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.clean_answer_text(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(regexp_replace(
    regexp_replace(
      lower(COALESCE(p_text, '')),
      '[()\[\]{}\-–—\u2010-\u2015\u2212\uFE63\uFF0D_.,;:!?''"`~*&^%$#@+\\/]', ' ', 'g'
    ),
    '\s+', ' ', 'g'
  ));
$$;

CREATE OR REPLACE FUNCTION public.strip_answer_symbols(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(lower(COALESCE(p_text, '')), '[^a-z0-9]', '', 'g');
$$;

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
  v_compact_student text;
  v_is_match boolean;
  v_acc_elem text;
  v_cand text;
  v_cand_clean text;
  v_cand_compact text;
  v_cand_without_parens text;
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
    v_norm_student := public.clean_answer_text(v_ans.student_answer);
    v_compact_student := public.strip_answer_symbols(v_ans.student_answer);

    IF v_norm_student <> '' OR v_compact_student <> '' THEN
      -- A. Check accepted_answers_snapshot
      IF v_ans.accepted_answers_snapshot IS NOT NULL THEN
        IF jsonb_typeof(to_jsonb(v_ans.accepted_answers_snapshot)) = 'array' THEN
          FOR v_acc_elem IN SELECT * FROM jsonb_array_elements_text(to_jsonb(v_ans.accepted_answers_snapshot))
          LOOP
            FOREACH v_cand IN ARRAY string_to_array(v_acc_elem, ';')
            LOOP
              v_cand_clean := public.clean_answer_text(v_cand);
              v_cand_compact := public.strip_answer_symbols(v_cand);

              IF (v_norm_student <> '' AND (v_norm_student = v_cand_clean OR v_compact_student = v_cand_compact))
                 OR (v_compact_student <> '' AND v_compact_student = v_cand_compact) THEN
                v_is_match := true;
                EXIT;
              END IF;

              IF v_cand LIKE '%(%' AND v_cand LIKE '%)%' THEN
                v_cand_without_parens := public.clean_answer_text(regexp_replace(v_cand, '\([^)]*\)', ' ', 'g'));
                IF (v_norm_student <> '' AND (v_norm_student = v_cand_without_parens OR v_compact_student = public.strip_answer_symbols(v_cand_without_parens)))
                   OR (v_compact_student <> '' AND v_compact_student = public.strip_answer_symbols(v_cand_without_parens)) THEN
                  v_is_match := true;
                  EXIT;
                END IF;
              END IF;
            END LOOP;
            IF v_is_match THEN EXIT; END IF;
          END LOOP;
        ELSE
          v_valid_str := v_ans.accepted_answers_snapshot #>> '{}';
          IF v_valid_str IS NOT NULL THEN
            FOREACH v_part IN ARRAY string_to_array(v_valid_str, ';')
            LOOP
              v_cand_clean := public.clean_answer_text(v_part);
              v_cand_compact := public.strip_answer_symbols(v_part);

              IF (v_norm_student <> '' AND (v_norm_student = v_cand_clean OR v_compact_student = v_cand_compact))
                 OR (v_compact_student <> '' AND v_compact_student = v_cand_compact) THEN
                v_is_match := true;
                EXIT;
              END IF;

              IF v_part LIKE '%(%' AND v_part LIKE '%)%' THEN
                v_cand_without_parens := public.clean_answer_text(regexp_replace(v_part, '\([^)]*\)', ' ', 'g'));
                IF (v_norm_student <> '' AND (v_norm_student = v_cand_without_parens OR v_compact_student = public.strip_answer_symbols(v_cand_without_parens)))
                   OR (v_compact_student <> '' AND v_compact_student = public.strip_answer_symbols(v_cand_without_parens)) THEN
                  v_is_match := true;
                  EXIT;
                END IF;
              END IF;
            END LOOP;
          END IF;
        END IF;
      END IF;

      -- B. Check correct_answer_snapshot
      IF NOT v_is_match AND v_ans.correct_answer_snapshot IS NOT NULL THEN
        FOREACH v_part IN ARRAY string_to_array(v_ans.correct_answer_snapshot, ';')
        LOOP
          v_cand_clean := public.clean_answer_text(v_part);
          v_cand_compact := public.strip_answer_symbols(v_part);

          IF (v_norm_student <> '' AND (v_norm_student = v_cand_clean OR v_compact_student = v_cand_compact))
             OR (v_compact_student <> '' AND v_compact_student = v_cand_compact) THEN
            v_is_match := true;
            EXIT;
          END IF;

          IF v_part LIKE '%(%' AND v_part LIKE '%)%' THEN
            v_cand_without_parens := public.clean_answer_text(regexp_replace(v_part, '\([^)]*\)', ' ', 'g'));
            IF (v_norm_student <> '' AND (v_norm_student = v_cand_without_parens OR v_compact_student = public.strip_answer_symbols(v_cand_without_parens)))
               OR (v_compact_student <> '' AND v_compact_student = public.strip_answer_symbols(v_cand_without_parens)) THEN
              v_is_match := true;
              EXIT;
            END IF;
          END IF;
        END LOOP;
      END IF;
    END IF;

    IF v_is_match THEN
      v_total_points := v_total_points + 1;
      v_correct_count := v_correct_count + 1;
      UPDATE public.attempt_answers
      SET score = 1,
          is_correct = true,
          evaluation_result = 'correct',
          updated_at = NOW()
      WHERE id = v_ans.id;
    ELSE
      UPDATE public.attempt_answers
      SET score = 0,
          is_correct = false,
          evaluation_result = 'incorrect',
          updated_at = NOW()
      WHERE id = v_ans.id;
    END IF;
  END LOOP;

  -- 5. Calculate Percentage, Effective Score, and Official Grade
  IF v_total_questions > 0 THEN
    v_percentage := round((v_total_points / v_total_questions) * 100, 2);
  ELSE
    v_percentage := 0;
  END IF;

  v_effective_score := v_percentage;
  IF v_is_remedial THEN
    v_effective_score := LEAST(v_percentage, 60.0);
  END IF;

  -- Authoritative Grading scale (★ = 100%, A = 90-99%, B = 80-89%, C = 60-79%, D = 30-59%, E = 0-29%)
  IF v_effective_score = 100.0 THEN
    v_grade := '★';
  ELSIF v_effective_score >= 90.0 THEN
    v_grade := 'A';
  ELSIF v_effective_score >= 80.0 THEN
    v_grade := 'B';
  ELSIF v_effective_score >= 60.0 THEN
    v_grade := 'C';
  ELSIF v_effective_score >= 30.0 THEN
    v_grade := 'D';
  ELSE
    v_grade := 'E';
  END IF;

  -- 6. Update Attempt Record
  UPDATE public.attempts
  SET status = COALESCE(p_status, 'submitted'),
      submitted_at = NOW(),
      score = v_total_points,
      correct_count = v_correct_count,
      total_questions = v_total_questions,
      percentage = v_percentage,
      effective_score = v_effective_score,
      grade = v_grade,
      updated_at = NOW()
  WHERE id = p_attempt_id;

  SELECT to_jsonb(a.*) INTO v_result FROM public.attempts a WHERE a.id = p_attempt_id;
  RETURN v_result;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.clean_answer_text(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.strip_answer_symbols(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.emergency_submit_attempt(uuid, jsonb, text) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

