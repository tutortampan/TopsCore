// @ts-nocheck
// TOPSCORE LMS — Edge Function: submit-test
// Server-authoritative scoring, grading, best score resolution, and usage logging.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function damerauLevenshtein(a: string, b: string): number {
  const la = a.length, lb = b.length;
  const dp: number[][] = Array.from({ length: la + 1 }, (_, i) =>
    Array.from({ length: lb + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost);
      }
    }
  }
  return dp[la][lb];
}

const ENGLISH_CONTRACTIONS: Record<string, string> = {
  "i'm": "i am", "you're": "you are", "he's": "he is", "she's": "she is",
  "it's": "it is", "we're": "we are", "they're": "they are",
  "i'll": "i will", "you'll": "you will", "he'll": "he will", "she'll": "she will",
  "it'll": "it will", "we'll": "we will", "they'll": "they will",
  "i've": "i have", "you've": "you have", "we've": "we have", "they've": "they have",
  "i'd": "i would", "you'd": "you would", "he'd": "he would", "she'd": "she would",
  "we'd": "we would", "they'd": "they would",
  "can't": "cannot", "cannot": "cannot", "can not": "cannot",
  "don't": "do not", "doesn't": "does not", "didn't": "did not",
  "won't": "will not", "isn't": "is not", "aren't": "are not",
  "wasn't": "was not", "weren't": "were not",
  "haven't": "have not", "hasn't": "has not", "hadn't": "had not",
  "wouldn't": "would not", "shouldn't": "should not", "couldn't": "could not",
  "let's": "let us", "that's": "that is", "there's": "there is",
  "what's": "what is", "who's": "who is", "where's": "where is"
};

function cleanPunctuationAndSymbols(text: string): string {
  if (!text) return "";
  let s = text.toLowerCase().trim();

  // 1. Normalize all quote and apostrophe variants to standard ASCII single quote '
  s = s.replace(/[\u2018\u2019\u201A\u201B\u0060\u00B4]/g, "'");

  // 2. Normalize contractions BEFORE stripping punctuation
  for (const [contracted, expanded] of Object.entries(ENGLISH_CONTRACTIONS)) {
    const reg = new RegExp('\\b' + contracted.replace("'", "['’]?") + '\\b', 'gi');
    s = s.replace(reg, expanded);
  }

  // Also handle common speech-to-text / typed contractions that omit apostrophe
  s = s.replace(/\bim\b/g, 'i am');
  s = s.replace(/\bill\b/g, 'i will');
  s = s.replace(/\bdont\b/g, 'do not');
  s = s.replace(/\bcant\b/g, 'cannot');
  s = s.replace(/\bwont\b/g, 'will not');
  s = s.replace(/\byoure\b/g, 'you are');
  s = s.replace(/\btheyre\b/g, 'they are');
  s = s.replace(/\bweve\b/g, 'we have');
  s = s.replace(/\bive\b/g, 'i have');

  // 3. Strip all punctuation and typographical symbols
  s = s.replace(/[()[\]{}\-–—_.,;:!?'"`~*&^%$#@+\\/]/g, " ");

  // 4. Collapse multiple spaces and trim
  return s.replace(/\s+/g, " ").trim();
}

function stripAllPunctuationAndSpaces(text: string): string {
  if (!text) return "";
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function expandAnswerVariants(raw: string): string[] {
  if (!raw) return [];
  const variants = new Set<string>();
  variants.add(raw);
  if (raw.includes("(") && raw.includes(")")) {
    const withoutParens = raw.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
    if (withoutParens) variants.add(withoutParens);
    const strippedParens = raw.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
    if (strippedParens) variants.add(strippedParens);
  }
  return Array.from(variants);
}

function parseValidAnswers(row: any): string[] {
  let list: string[] = [];
  if (Array.isArray(row.accepted_answers_snapshot) && row.accepted_answers_snapshot.length > 0) {
    list = row.accepted_answers_snapshot.map((s: any) => String(s));
  } else if (typeof row.accepted_answers_snapshot === "string") {
    list = row.accepted_answers_snapshot.split(/[;/|]/);
  } else if (row.correct_answer_snapshot) {
    list = String(row.correct_answer_snapshot).split(/[;/|]/);
  }

  const allVariants: string[] = [];
  for (const item of list) {
    const parts = String(item).split(/[;/|]/);
    for (const p of parts) {
      const trimmed = p.trim();
      if (trimmed) {
        expandAnswerVariants(trimmed).forEach(v => allVariants.push(v));
      }
    }
  }
  return allVariants;
}

function evaluateStudentAnswer(
  studentAnswer: string,
  validAnswers: string[],
  isSpeech: boolean = false
): { result: string; score: number; is_correct: boolean; similarity_score: number } {
  const normStudent = cleanPunctuationAndSymbols(studentAnswer);
  const compactStudent = stripAllPunctuationAndSpaces(studentAnswer);

  if (!normStudent && !compactStudent) {
    return { result: "incorrect", score: 0.0, is_correct: false, similarity_score: 0 };
  }

  for (const rawValid of validAnswers) {
    const normValid = cleanPunctuationAndSymbols(rawValid);
    const compactValid = stripAllPunctuationAndSpaces(rawValid);

    if (normStudent === normValid || (compactStudent && compactStudent === compactValid)) {
      return { result: "correct", score: 1.0, is_correct: true, similarity_score: 1.0 };
    }

    if (isSpeech) {
      const targetLength = normValid.length;
      const dist = damerauLevenshtein(normStudent, normValid);
      const similarity = targetLength > 0 ? Math.max(0, 1 - dist / targetLength) : 0;

      if (similarity >= 0.85 || dist <= 2) {
        return { result: "correct", score: 1.0, is_correct: true, similarity_score: Math.max(0.85, similarity) };
      }
      if (similarity >= 0.65) {
        return { result: "minor_spelling_error", score: 0.5, is_correct: true, similarity_score: similarity };
      }
    } else {
      const targetLength = normValid.length;
      const dist = damerauLevenshtein(normStudent, normValid);
      const similarity = targetLength > 0 ? Math.max(0, 1 - dist / targetLength) : 0;

      if (dist === 0) {
        return { result: "correct", score: 1.0, is_correct: true, similarity_score: 1.0 };
      }
      if (dist <= 2 && targetLength >= 4) {
        return { result: "minor_spelling_error", score: 0.5, is_correct: true, similarity_score: similarity };
      }
    }
  }

  return { result: "incorrect", score: 0.0, is_correct: false, similarity_score: 0.0 };
}

function calculateGrade(pct: number): string {
  if (pct >= 100) return "★";
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 60) return "C";
  if (pct >= 30) return "D";
  return "E";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const attempt_id = payload.attempt_id;
    const answers = payload.answers; // array of { attempt_answer_id, student_answer }

    if (!attempt_id) {
      return new Response(JSON.stringify({ error: "Missing attempt_id." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch Attempt
    const { data: attempt, error: attErr } = await supabase
      .from("attempts")
      .select("*")
      .eq("id", attempt_id)
      .single();

    if (attErr || !attempt) {
      return new Response(JSON.stringify({ error: "Attempt not found." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const targetTestId = attempt.test_id;

    // Idempotency check
    const currentStatus = String(attempt.status || "").toLowerCase();
    if (["submitted", "auto_submitted", "evaluated"].includes(currentStatus)) {
      return new Response(JSON.stringify({
        message: "Attempt already submitted.",
        attempt,
        already_submitted: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Fetch Questions Snapshot
    const { data: attemptAnswers, error: ansErr } = await supabase
      .from("attempt_answers")
      .select("*")
      .eq("attempt_id", attempt_id);

    if (ansErr || !attemptAnswers || attemptAnswers.length === 0) {
      return new Response(JSON.stringify({ error: "No answers found for attempt." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Batch Update Student Answers
    const answersMap = new Map<string, string>();
    if (Array.isArray(answers)) {
      for (const a of answers) {
        if (a.attempt_answer_id) {
          answersMap.set(a.attempt_answer_id, a.student_answer ?? "");
        }
      }
    }

    // 4. Server-Authoritative Scoring
    let totalScore = 0;
    let correctCount = 0;
    const totalQuestions = attemptAnswers.length;
    const updates: any[] = [];

    for (const row of attemptAnswers) {
      const studentAns = answersMap.has(row.id)
        ? answersMap.get(row.id)!
        : (row.student_answer ?? "");

      const validAnswers = parseValidAnswers(row);
      const isSpeech = row.question_snapshot?.answer_type === "spoken" ||
                       row.question_type_snapshot === "spoken" ||
                       row.answer_type === "spoken";

      const evalResult = evaluateStudentAnswer(studentAns, validAnswers, isSpeech);

      totalScore += evalResult.score;
      if (evalResult.is_correct) correctCount++;

      updates.push({
        id: row.id,
        student_answer: studentAns,
        is_correct: evalResult.is_correct,
        similarity_score: evalResult.similarity_score,
        evaluation_result: evalResult.result,
        score: evalResult.score,
        answered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    for (const u of updates) {
      await supabase
        .from("attempt_answers")
        .update({
          student_answer: u.student_answer,
          is_correct: u.is_correct,
          similarity_score: u.similarity_score,
          evaluation_result: u.evaluation_result,
          score: u.score,
          answered_at: u.answered_at,
          updated_at: u.updated_at
        })
        .eq("id", u.id);
    }

    // 5. Calculate Percentage & Grade
    const rawPercentage = totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0;
    const roundedPct = Math.round(rawPercentage * 100) / 100;

    let effectiveScore = roundedPct;
    if (attempt.is_remedial_unlocked) {
      effectiveScore = Math.min(roundedPct, 60.0);
    }

    const grade = calculateGrade(effectiveScore);

    // 6. Update Attempt Record
    const now = new Date();
    const finalStatus = payload.is_auto_submit ? "auto_submitted" : "submitted";

    const { data: updatedAttempt, error: updErr } = await supabase
      .from("attempts")
      .update({
        status: finalStatus,
        submitted_at: now.toISOString(),
        score: totalScore,
        correct_count: correctCount,
        total_questions: totalQuestions,
        percentage: roundedPct,
        effective_score: effectiveScore,
        grade,
        updated_at: now.toISOString()
      })
      .eq("id", attempt_id)
      .select()
      .single();

    if (updErr) throw updErr;

    // 7. Resolve Best Score across attempts
    const { data: allAttempts } = await supabase
      .from("attempts")
      .select("id, effective_score, percentage, created_at")
      .eq("student_id", attempt.student_id)
      .eq("test_id", targetTestId)
      .in("status", ["submitted", "auto_submitted", "evaluated", "SUBMITTED", "AUTO_SUBMITTED", "EVALUATED"])
      .order("effective_score", { ascending: false })
      .order("percentage", { ascending: false })
      .order("created_at", { ascending: false });

    if (allAttempts && allAttempts.length > 0) {
      allAttempts.sort((a: any, b: any) => {
        const scoreA = Number(a.percentage ?? a.effective_score ?? 0);
        const scoreB = Number(b.percentage ?? b.effective_score ?? 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      const bestId = allAttempts[0].id;
      for (const a of allAttempts) {
        await supabase
          .from("attempts")
          .update({ is_best_score: a.id === bestId })
          .eq("id", a.id);
      }
    }

    // 8. Auto-Leveling Logic for Exams
    const { data: testRec } = await supabase
      .from("tests")
      .select("test_type, test_subtype, class_id, level_id, minimum_required_score, payload, classes(level_id)")
      .eq("id", targetTestId)
      .single();

    const levelUpThreshold = Number(testRec?.minimum_required_score ?? testRec?.payload?.minimum_required_score ?? 75);
    if (testRec && testRec.test_type === 'exam' && roundedPct >= levelUpThreshold) {
      if (testRec.classes && testRec.classes.level_id) {
         const { data: currLevel } = await supabase.from("levels").select("level_number").eq("id", testRec.classes.level_id).single();
         if (currLevel) {
           const nextLevelNum = currLevel.level_number + 1;
           const { data: nextLevel } = await supabase.from("levels").select("id").eq("level_number", nextLevelNum).maybeSingle();
           if (nextLevel) {
             const { data: studRec } = await supabase.from("students").select("batch_id").eq("id", attempt.student_id).single();
             if (studRec && studRec.batch_id) {
                const { data: batchRec } = await supabase.from("batches").select("current_level_id").eq("id", studRec.batch_id).single();
                if (batchRec && batchRec.current_level_id) {
                   const { data: batchLevel } = await supabase.from("levels").select("level_number").eq("id", batchRec.current_level_id).single();
                   if (!batchLevel || batchLevel.level_number < nextLevelNum) {
                      await supabase.from("batches").update({ current_level_id: nextLevel.id }).eq("id", studRec.batch_id);
                   }
                }
             }
           }
         }
      }
    }

    return new Response(JSON.stringify({
      message: "Test submitted successfully.",
      attempt: updatedAttempt,
      score: totalScore,
      total_questions: totalQuestions,
      percentage: roundedPct,
      effective_score: effectiveScore,
      grade
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("submit-test error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
