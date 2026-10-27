import pg from 'pg';
const { Client } = pg;

const CLOUD_CONFIG = {
  host: 'db.oclajpyumehpojepcczg.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '100%TopsCore',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
};

async function main() {
  console.log('Connecting to Supabase Cloud PostgreSQL...');
  const client = new Client(CLOUD_CONFIG);
  await client.connect();
  console.log('Connected!');

  const sqlEmergency = `
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
  -- 1. Fetch Attempt (strictly test_id)
  SELECT id, student_id, test_id, status, is_remedial_unlocked
  INTO v_attempt
  FROM public.attempts
  WHERE id = p_attempt_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt not found: %', p_attempt_id;
  END IF;

  v_student_id := v_attempt.student_id;
  v_test_id := v_attempt.test_id;
  v_is_remedial := COALESCE(v_attempt.is_remedial_unlocked, false);

  -- 2. Idempotency Check: if already submitted, return existing attempt
  IF lower(COALESCE(v_attempt.status, '')) IN ('submitted', 'auto_submitted', 'evaluated') THEN
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
    v_norm_student := regexp_replace(lower(trim(COALESCE(v_ans.student_answer, ''))), '\\s+', ' ', 'g');
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

  IF v_is_remedial THEN
    SELECT test_type::text INTO v_test_type FROM public.tests WHERE id = v_test_id;
    IF (v_test_type IN ('exam', 'TEST') OR v_test_type LIKE '%TEST%') AND v_effective_score > 60 THEN
      v_effective_score := 60;
    END IF;
  END IF;

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
  IF v_test_id IS NOT NULL THEN
    UPDATE public.attempts
    SET is_best_score = false
    WHERE student_id = v_student_id AND test_id = v_test_id;

    UPDATE public.attempts
    SET is_best_score = true
    WHERE id = (
      SELECT id FROM public.attempts
      WHERE student_id = v_student_id
        AND test_id = v_test_id
        AND lower(status) IN ('submitted', 'auto_submitted', 'evaluated')
      ORDER BY COALESCE(effective_score, percentage, 0) DESC, submitted_at DESC
      LIMIT 1
    );
  END IF;

  SELECT to_jsonb(a.*) INTO v_result FROM public.attempts a WHERE a.id = p_attempt_id;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.emergency_submit_attempt(uuid, jsonb, text) TO anon;
GRANT EXECUTE ON FUNCTION public.emergency_submit_attempt(uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.emergency_submit_attempt(uuid, jsonb, text) TO service_role;
`;

  await client.query(sqlEmergency);
  console.log('✅ emergency_submit_attempt updated successfully!');

  const sqlAutoClose = `
CREATE OR REPLACE FUNCTION public.auto_close_expired_attempts(p_attempt_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
BEGIN
  IF p_attempt_id IS NOT NULL THEN
    -- Authoritatively evaluate saved answers and calculate score & grade
    PERFORM public.emergency_submit_attempt(p_attempt_id, NULL, 'auto_submitted');
  ELSE
    FOR v_rec IN 
      SELECT id FROM public.attempts 
      WHERE lower(status) = 'in_progress' AND expires_at < NOW()
    LOOP
      PERFORM public.emergency_submit_attempt(v_rec.id, NULL, 'auto_submitted');
    END LOOP;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_close_expired_attempts(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.auto_close_expired_attempts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_close_expired_attempts(uuid) TO service_role;
`;

  await client.query(sqlAutoClose);
  console.log('✅ auto_close_expired_attempts updated successfully!');

  await client.end();
  console.log('All migrations applied successfully!');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
