// @ts-nocheck
// TOP ENGLISH CLASS — Edge Function: submit-Assessment (Assessment V1)
// Server-authoritative scoring, grading, best score resolution, and usage logging.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// Damerau-Levenshtein & Normalization
// ============================================================
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

function cleanPunctuationAndSymbols(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/[()\[\]{}\-–—_.,;:!?'"`~*&^%$#@+\\/]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\bi'm\b/g, "i am")
    .replace(/\bcan't\b/g, "cannot")
    .replace(/\bdon't\b/g, "do not")
    .trim();
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

  let bestResult = "incorrect";
  let bestScore = 0.0;
  let bestSimilarity = 0.0;

  for (const valid of validAnswers) {
    const normCorrect = cleanPunctuationAndSymbols(valid);
    const compactCorrect = stripAllPunctuationAndSpaces(valid);
    if (!normCorrect && !compactCorrect) continue;

    // 1. Direct match with punctuation stripped & collapsed spaces
    if (normStudent === normCorrect || compactStudent === compactCorrect) {
      return { result: "correct", score: 1.0, is_correct: true, similarity_score: 1.0 };
    }

    const distNorm = damerauLevenshtein(normStudent, normCorrect);
    const distCompact = damerauLevenshtein(compactStudent, compactCorrect);
    const dist = Math.min(distNorm, distCompact);

    const maxLen = Math.max(normStudent.length, normCorrect.length);
    const minLen = Math.min(normStudent.length, normCorrect.length);
    const similarity = maxLen > 0 ? (maxLen - dist) / maxLen : 0;

    if (similarity > bestSimilarity) bestSimilarity = similarity;

    // Leeway for 1 or 2 letters:
    // Short word safeguards: length <= 2 requires exact match; length 3 allows dist <= 1; length >= 4 allows dist <= 2
    const isWithin2Letters = (minLen >= 4 && dist <= 2) || (minLen === 3 && dist <= 1) || (minLen > 0 && dist <= 1 && distNorm <= 1);

    if (isWithin2Letters) {
      if (isSpeech) {
        // FOR SPEECH: Full leeway of 1-2 letters & undetected punctuation is treated as CORRECT (1.0 pt)
        return {
          result: "correct",
          score: 1.0,
          is_correct: true,
          similarity_score: Math.max(bestSimilarity, 0.95)
        };
      } else {
        // FOR WRITTEN: standard minor spelling error (0.5 pt)
        if (bestScore < 0.5) {
          bestResult = "minor_spelling_error";
          bestScore = 0.5;
        }
      }
    }
  }

  return {
    result: bestResult,
    score: bestScore,
    is_correct: bestScore === 1.0,
    similarity_score: Math.round(bestSimilarity * 1000) / 1000
  };
}

function calculateGrade(pct: number): string {
  if (pct >= 100) return "S";
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 60) return "C";
  if (pct >= 30) return "D";
  return "E";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { attempt_id, answers, status: clientStatus } = await req.json();

    if (!attempt_id) {
      return new Response(JSON.stringify({ error: "Missing attempt_id." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Load Attempt
    const { data: attempt, error: attErr } = await supabase
      .from("attempts")
      .select("*")
      .eq("id", attempt_id)
      .single();

    if (attErr || !attempt) throw new Error("Attempt not found.");

    const currentStatus = String(attempt.status || '').toLowerCase();
    if (!["in_progress"].includes(currentStatus)) {
      return new Response(JSON.stringify({ error: "Attempt has already been submitted or closed." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const now = new Date();
    const deadline = new Date(attempt.expires_at || attempt.expected_end_at);
    const isExpired = now > deadline;
    let finalStatus = isExpired ? "auto_submitted" : (clientStatus || "submitted");

    // 2. Load Existing Attempt Answers
    const { data: answerRows, error: ansErr } = await supabase
      .from("attempt_answers")
      .select("*")
      .eq("attempt_id", attempt_id);

    if (ansErr || !answerRows || answerRows.length === 0) {
      throw new Error("No questions found for this attempt.");
    }

    // 3. Map Submitted Answers
    const submittedMap: Record<string, string> = {};
    if (Array.isArray(answers)) {
      for (const a of answers) {
        if (a && a.attempt_answer_id) submittedMap[a.attempt_answer_id] = a.student_answer || "";
      }
    } else if (answers && typeof answers === "object") {
      for (const [k, v] of Object.entries(answers)) {
        submittedMap[k] = String(v || "");
      }
    }

    let totalScore = 0;
    let correctCount = 0;
    const totalQuestions = answerRows.length;
    const historyInserts: any[] = [];

    // 4. Evaluate Each Question (updates run in parallel chunks of 40 to stay inside Edge time limits)
    const pendingUpdates: any[] = [];
    for (const row of answerRows) {
      const studentAnswer = submittedMap[row.id] ?? row.student_answer ?? "";
      const isSpeech = row.question_snapshot?.answer_type === "speech_to_text" || 
                       row.question_snapshot?.answer_type === "spoken" ||
                       row.question_type_snapshot === "speech_to_text" ||
                       row.question_type_snapshot === "spoken";
      const evalRes = evaluateStudentAnswer(studentAnswer, validAnswers, isSpeech);

      totalScore += evalRes.score;
      if (evalRes.is_correct) correctCount++;

      pendingUpdates.push({
        id: row.id,
        patch: {
          student_answer: studentAnswer,
          evaluation_result: evalRes.result,
          score: evalRes.score,
          is_correct: evalRes.is_correct,
          similarity_score: evalRes.similarity_score,
          answered_at: now.toISOString()
        }
      });

      if (row.question_id) {
        historyInserts.push({
          question_id: row.question_id,
          assessment_id: attempt.assessment_id,
          attempt_id: attempt.id,
          student_id: attempt.student_id,
          used_at: now.toISOString(),
          topic_name: row.topic_snapshot || "General"
        });
      }
    }
    for (let i = 0; i < pendingUpdates.length; i += 40) {
      const results = await Promise.all(
        pendingUpdates.slice(i, i + 40).map((u: any) => supabase.from("attempt_answers").update(u.patch).eq("id", u.id))
      );
      const failed = results.find((r: any) => r.error);
      if (failed) throw failed.error;
    }

    // 5. Calculate Percentage and Grade
    const percentage = totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0;
    const roundedPct = Math.round(percentage * 100) / 100;

    // 5b. Remedial Attempt Handling (Official Rule)
    // Remedial attempts are capped at maximum 60% effective score.
    // Grade follows the effective score directly (capped at 60% = Grade C), with is_remedial_unlocked preserving the remedial status.
    const isRemedial = Boolean(attempt.is_remedial_unlocked || attempt.is_remedial);
    const effectivePct = isRemedial ? Math.min(roundedPct, 60.0) : roundedPct;
    const grade = calculateGrade(Math.round(effectivePct));

    // 6. Update Attempt
    const { data: updatedAttempt, error: updErr } = await supabase
      .from("attempts")
      .update({
        submitted_at: now.toISOString(),
        status: finalStatus,
        score: totalScore,
        correct_count: correctCount,
        total_questions: totalQuestions,
        percentage: roundedPct,
        grade,
        effective_score: effectivePct,
        /* remedial_cap_applied: isRemedialCapApplied */
      })
      .eq("id", attempt_id)
      .select()
      .single();

    if (updErr) throw updErr;

    // 7. Resolve Best Score across attempts for this student & assessment
    const targetAssessmentId = attempt.assessment_id;
    const { data: allAttempts } = await supabase
      .from("attempts")
      .select("id, effective_score, percentage, created_at")
      .eq("student_id", attempt.student_id)
      .eq("assessment_id", targetAssessmentId)
      .in("status", ["submitted", "auto_submitted", "evaluated", "SUBMITTED", "AUTO_SUBMITTED", "EVALUATED"])
      .order("effective_score", { ascending: false })
      .order("percentage", { ascending: false })
      .order("created_at", { ascending: false });

    if (allAttempts && allAttempts.length > 0) {
      // Safe in-memory sorting: avoids PostgREST 'NULLS FIRST' bug where null effective_score was picked over high scores
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

    // 7b. Auto-Leveling Logic (legacy EXAM/QUIZ promotion — unchanged semantics)
    const { data: asmRec } = await supabase
      .from("assessments")
      .select("assessment_type, assessment_category, class_id, level_id, payload, classes(level_id)")
      .eq("id", targetAssessmentId)
      .single();

    if (asmRec && (asmRec.assessment_type === 'EXAM' || asmRec.assessment_type === 'QUIZ') && roundedPct >= 75) {
      if (asmRec.classes && asmRec.classes.level_id) {
         const { data: currLevel } = await supabase.from("levels").select("level_number").eq("id", asmRec.classes.level_id).single();
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

    // 7c. Dynamic-shell Level Completion.
    // The FINAL theme (highest theme_code among this class+level's TEST shells) is the graduation gate.
    // When every final-theme TEST shell has a best score >= 60%, the student's progress record is marked
    // 'Level Completed'. A next-level promotion happens ONLY if a higher level exists (Level 3 is terminal).
    let levelCompleted = false;
    if (asmRec && asmRec.assessment_category === 'TEST' && asmRec.payload && asmRec.payload.is_dynamic_shell
        && asmRec.payload.theme_code && roundedPct >= 60 && asmRec.class_id && asmRec.level_id) {
      const { data: levelTests } = await supabase
        .from("assessments")
        .select("id, payload")
        .eq("class_id", asmRec.class_id)
        .eq("level_id", asmRec.level_id)
        .eq("assessment_category", "TEST")
        .is("deleted_at", null);
      const codes = (levelTests || []).map((t: any) => String(t.payload?.theme_code || "")).filter(Boolean).sort();
      const finalTheme = codes.length ? codes[codes.length - 1] : null;
      if (finalTheme && asmRec.payload.theme_code === finalTheme) {
        const finalIds = (levelTests || []).filter((t: any) => t.payload?.theme_code === finalTheme).map((t: any) => t.id);
        const { data: finalAttempts } = await supabase
          .from("attempts")
          .select("assessment_id, effective_score, percentage")
          .eq("student_id", attempt.student_id)
          .in("assessment_id", finalIds)
          .in("status", ["submitted", "auto_submitted", "evaluated", "SUBMITTED", "AUTO_SUBMITTED", "EVALUATED"]);
        const passed = new Set<string>();
        for (const a of (finalAttempts || [])) {
          if ((a.effective_score ?? a.percentage ?? 0) >= 60) passed.add(a.assessment_id);
        }
        if (finalIds.length > 0 && passed.size === finalIds.length) {
          const { data: lvlRow } = await supabase.from("levels").select("level_number").eq("id", asmRec.level_id).single();
          const levelNumber = lvlRow?.level_number ?? null;
          const { data: prog } = await supabase
            .from("progress").select("id, highest_score")
            .eq("student_id", attempt.student_id).eq("class_id", asmRec.class_id).maybeSingle();
          const progPatch: any = {
            level_status: "Level Completed",
            level_completed_at: now.toISOString(),
            unlocked_level: levelNumber,
            highest_score: Math.max(Number(prog?.highest_score || 0), roundedPct),
            updated_at: now.toISOString()
          };
          const progRes = prog
            ? await supabase.from("progress").update(progPatch).eq("id", prog.id)
            : await supabase.from("progress").insert({ student_id: attempt.student_id, class_id: asmRec.class_id, ...progPatch });
          if (progRes.error) throw progRes.error;
          levelCompleted = true;

          if (levelNumber !== null) {
            const { data: nextLevel } = await supabase.from("levels").select("id").eq("level_number", levelNumber + 1).maybeSingle();
            if (nextLevel) {
              const { data: studRec } = await supabase.from("students").select("batch_id").eq("id", attempt.student_id).single();
              if (studRec?.batch_id) {
                await supabase.from("batches").update({ current_level_id: nextLevel.id }).eq("id", studRec.batch_id);
              }
            }
          }
        }
      }
    }

    // 8. Record Usage History (Non-blocking)
    if (historyInserts.length > 0) {
      supabase.from("question_usage_history").insert(historyInserts).then();
    }

    return new Response(JSON.stringify({
      attempt_id,
      status: finalStatus,
      score: totalScore,
      correct_count: correctCount,
      total_questions: totalQuestions,
      percentage: roundedPct.toFixed(2),
      grade,
      level_completed: levelCompleted
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("submit-Assessment error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
