-- ==============================================================================
-- Migration: 20261013080000_speech_answer_tolerance.sql
-- Description: Enable fuzzystrmatch and enhance emergency_submit_attempt RPC
--              with comprehensive punctuation normalization and 1-2 letter tolerance for speech answers.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

CREATE OR REPLACE FUNCTION public.clean_answer_text(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(regexp_replace(
    regexp_replace(
      lower(COALESCE(p_text, '')),
      '[()\[\]{}\-–—_.,;:!?''"`~*&^%$#@+\\/]', ' ', 'g'
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
  v_assessment_id uuid;
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
  v_grade text := 'F';
  v_result jsonb;
  v_norm_student text;
  v_compact_student text;
  v_is_match boolean;
  v_is_minor_typo boolean;
  v_acc_elem text;
  v_part text;
  v_cand text;
  v_cand_clean text;
  v_cand_compact text;
  v_cand_without_parens text;
  v_is_speech boolean;
  v_dist integer;
  v_min_len integer;
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
    SELECT id, student_answer, accepted_answers_snapshot, correct_answer_snapshot, question_snapshot, question_type_snapshot
    FROM public.attempt_answers
    WHERE attempt_id = p_attempt_id
  LOOP
    v_total_questions := v_total_questions + 1;
    v_is_match := false;
    v_is_minor_typo := false;
    
    v_is_speech := (v_ans.question_snapshot->>'answer_type' IN ('speech_to_text', 'spoken'))
                OR (v_ans.question_type_snapshot IN ('speech_to_text', 'spoken'));

    v_norm_student := clean_answer_text(v_ans.student_answer);
    v_compact_student := strip_answer_symbols(v_ans.student_answer);

    IF v_norm_student <> '' OR v_compact_student <> '' THEN
      -- Parse candidate correct answers from accepted_answers_snapshot or correct_answer_snapshot
      IF v_ans.accepted_answers_snapshot IS NOT NULL THEN
        IF jsonb_typeof(to_jsonb(v_ans.accepted_answers_snapshot)) = 'array' THEN
          FOR v_acc_elem IN SELECT * FROM jsonb_array_elements_text(to_jsonb(v_ans.accepted_answers_snapshot))
          LOOP
            FOREACH v_cand IN ARRAY string_to_array(v_acc_elem, ';')
            LOOP
              v_cand_clean := clean_answer_text(v_cand);
              v_cand_compact := strip_answer_symbols(v_cand);

              IF v_norm_student = v_cand_clean OR v_compact_student = v_cand_compact THEN
                v_is_match := true;
                EXIT;
              END IF;

              IF v_cand LIKE '%(%' AND v_cand LIKE '%)%' THEN
                v_cand_without_parens := clean_answer_text(regexp_replace(v_cand, '\([^)]*\)', ' ', 'g'));
                IF v_norm_student = v_cand_without_parens OR v_compact_student = strip_answer_symbols(v_cand_without_parens) THEN
                  v_is_match := true;
                  EXIT;
                END IF;
              END IF;

              v_min_len := LEAST(length(v_norm_student), length(v_cand_clean));
              v_dist := LEAST(levenshtein(v_norm_student, v_cand_clean), levenshtein(v_compact_student, v_cand_compact));

              IF (v_min_len >= 4 AND v_dist <= 2) OR (v_min_len = 3 AND v_dist <= 1) OR (v_min_len > 0 AND v_dist <= 1) THEN
                IF v_is_speech THEN
                  v_is_match := true;
                  EXIT;
                ELSE
                  v_is_minor_typo := true;
                END IF;
              END IF;
            END LOOP;
            IF v_is_match THEN EXIT; END IF;
          END LOOP;
        END IF;
      END IF;

      -- Check correct_answer_snapshot if not already matched
      IF NOT v_is_match AND v_ans.correct_answer_snapshot IS NOT NULL THEN
        FOREACH v_part IN ARRAY regexp_split_to_array(v_ans.correct_answer_snapshot, '[;/|]')
        LOOP
          v_cand_clean := clean_answer_text(v_part);
          v_cand_compact := strip_answer_symbols(v_part);

          IF v_norm_student = v_cand_clean OR v_compact_student = v_cand_compact THEN
            v_is_match := true;
            EXIT;
          END IF;

          IF v_part LIKE '%(%' AND v_part LIKE '%)%' THEN
            v_cand_without_parens := clean_answer_text(regexp_replace(v_part, '\([^)]*\)', ' ', 'g'));
            IF v_norm_student = v_cand_without_parens OR v_compact_student = strip_answer_symbols(v_cand_without_parens) THEN
              v_is_match := true;
              EXIT;
            END IF;
          END IF;

          v_min_len := LEAST(length(v_norm_student), length(v_cand_clean));
          v_dist := LEAST(levenshtein(v_norm_student, v_cand_clean), levenshtein(v_compact_student, v_cand_compact));

          IF (v_min_len >= 4 AND v_dist <= 2) OR (v_min_len = 3 AND v_dist <= 1) OR (v_min_len > 0 AND v_dist <= 1) THEN
            IF v_is_speech THEN
              v_is_match := true;
              EXIT;
            ELSE
              v_is_minor_typo := true;
            END IF;
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
    ELSIF v_is_minor_typo THEN
      v_total_points := v_total_points + 0.5;
      UPDATE public.attempt_answers
      SET score = 0.50,
          is_correct = false,
          evaluation_result = 'minor_spelling_error',
          similarity_score = 0.75,
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

  -- 5. Calculate Percentage and Effective Score
  IF v_total_questions > 0 THEN
    v_percentage := round((v_total_points / v_total_questions::numeric) * 100.0, 2);
  ELSE
    v_percentage := 0;
  END IF;

  v_effective_score := v_percentage;
  IF v_is_remedial THEN
    SELECT assessment_type INTO v_cand_clean FROM public.assessments WHERE id = v_assessment_id;
    IF (v_cand_clean IN ('EXAM', 'QUIZ', 'TEST', 'VOCAB_TEST', 'UNIFIED_TEST') OR v_cand_clean LIKE '%TEST%') AND v_effective_score > 60.00 THEN
      v_effective_score := 60.00;
    END IF;
  END IF;

  -- 6. Determine Grade (Official Scale: ★ 100%, A 90-99%, B 80-89%, C 60-79%, D 30-59%, E 0-29%)
  IF v_effective_score >= 100.00 THEN v_grade := '★';
  ELSIF v_effective_score >= 90.00 THEN v_grade := 'A';
  ELSIF v_effective_score >= 80.00 THEN v_grade := 'B';
  ELSIF v_effective_score >= 60.00 THEN v_grade := 'C';
  ELSIF v_effective_score >= 30.00 THEN v_grade := 'D';
  ELSE v_grade := 'E';
  END IF;

  -- 7. Update Attempt
  UPDATE public.attempts
  SET status = p_status,
      score = v_total_points,
      correct_count = v_correct_count,
      total_questions = v_total_questions,
      percentage = v_percentage,
      effective_score = v_effective_score,
      grade = v_grade,
      submitted_at = NOW(),
      updated_at = NOW()
  WHERE id = p_attempt_id;

  -- 8. Resolve is_best_score
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY student_id, assessment_id
             ORDER BY effective_score DESC, percentage DESC, created_at DESC
           ) as rn
    FROM public.attempts
    WHERE student_id = v_student_id
      AND assessment_id = v_assessment_id
      AND lower(status) IN ('submitted', 'auto_submitted', 'evaluated')
  )
  UPDATE public.attempts a
  SET is_best_score = (r.rn = 1)
  FROM ranked r
  WHERE a.id = r.id;

  -- 9. Return JSON Result
  SELECT to_jsonb(a.*) INTO v_result FROM public.attempts a WHERE a.id = p_attempt_id;
  RETURN v_result;
END;
$$;
