// @ts-nocheck
// TOPSCORE LMS — Edge Function: start-test
// Server-authoritative test start. Creates or resumes an attempt.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// VAULT DISTRACTOR SELECTION & SIMILARITY ENGINE (PHASE 357)
// ============================================================

function scoreDistractorSimilarity(target: any, candidate: any): number {
  if (!target || !candidate) return 0;
  let score = 0;

  // 1. Topic & Theme Proximity (Max 35 pts)
  const targetTopic = (target.topic || target.topic_code || '').trim().toLowerCase();
  const candTopic = (candidate.topic || candidate.topic_code || '').trim().toLowerCase();
  const targetTheme = (target.theme || target.theme_code || '').trim().toLowerCase();
  const candTheme = (candidate.theme || candidate.theme_code || '').trim().toLowerCase();

  if (targetTopic && candTopic && targetTopic === candTopic) {
    score += 35;
  } else if (targetTheme && candTheme && targetTheme === candTheme) {
    score += 15;
  }

  // 2. Part of Speech / Word Type Match (Max 25 pts)
  const targetType = (target.word_type || '').trim().toLowerCase();
  const candType = (candidate.word_type || '').trim().toLowerCase();
  if (targetType && candType) {
    if (targetType === candType) {
      score += 25;
    } else {
      const verbGroup = ['verb', 'phrasal verb', 'irregular verb'];
      const modifierGroup = ['adjective', 'adverb'];
      if ((verbGroup.includes(targetType) && verbGroup.includes(candType)) ||
          (modifierGroup.includes(targetType) && modifierGroup.includes(candType))) {
        score += 12;
      }
    }
  }

  // 3. Length & Structural Parity (Max 20 pts)
  const targetEng = (target.english || '').split('/')[0].trim();
  const candEng = (candidate.english || '').split('/')[0].trim();
  const targetWords = targetEng.split(/\s+/).filter(Boolean);
  const candWords = candEng.split(/\s+/).filter(Boolean);

  if (targetWords.length > 1 || candWords.length > 1) {
    const wordDiff = Math.abs(targetWords.length - candWords.length);
    if (wordDiff === 0) {
      score += 20;
    } else if (wordDiff === 1) {
      score += 10;
    }
  } else {
    const charDiff = Math.abs(targetEng.length - candEng.length);
    if (charDiff <= 2) {
      score += 15;
    } else if (charDiff <= 4) {
      score += 8;
    }
  }

  // 4. Lexical / Syntactic Overlap & Collocation (Max 15 pts)
  const tLower = targetEng.toLowerCase();
  const cLower = candEng.toLowerCase();

  if (targetWords.length > 1 && candWords.length > 1) {
    const tFirst = targetWords[0].toLowerCase();
    const cFirst = candWords[0].toLowerCase();
    const tLast = targetWords[targetWords.length - 1].toLowerCase();
    const cLast = candWords[candWords.length - 1].toLowerCase();

    if (tFirst === cFirst || tLast === cLast) {
      score += 15;
    } else {
      const tTokens = new Set(targetWords.map((w: string) => w.toLowerCase()));
      const hasOverlap = candWords.some((w: string) => tTokens.has(w.toLowerCase()));
      if (hasOverlap) score += 8;
    }
  } else {
    if (tLower.length >= 4 && cLower.length >= 4) {
      if (tLower.slice(0, 3) === cLower.slice(0, 3) || tLower.slice(-3) === cLower.slice(-3)) {
        score += 10;
      }
    }
  }

  // 5. Deterministic tie-breaker / jitter (0 to 3 pts)
  score += Math.random() * 3;

  return score;
}

function rankDistractorsForVaultItem(target: any, candidatePool: any[], count = 4): string[] {
  if (!target || !Array.isArray(candidatePool) || candidatePool.length === 0) {
    return [];
  }

  const accepted = (target.english ? target.english.split('/') : [])
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);
  const targetIndo = (target.indonesian || '').trim().toLowerCase();
  const phraseTypes = ['expression', 'idiom', 'proverb', 'phrase'];
  const isTargetPhrase = phraseTypes.includes((target.word_type || '').toLowerCase()) || target.category === 'phrases';

  const seenCandidates = new Set<string>();
  const eligible = candidatePool.filter((cand: any) => {
    if (!cand) return false;
    const candEng = (cand.english || '').split('/')[0].trim();
    if (!candEng) return false;
    const candEngLower = candEng.toLowerCase();
    if (seenCandidates.has(candEngLower)) return false;

    // Anti-leak: cannot match any accepted answer
    if (accepted.includes(candEngLower)) return false;
    const candVariants = (cand.english || '').split('/').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
    if (candVariants.some((v: string) => accepted.includes(v))) return false;

    // Indonesian translation collision check
    if (targetIndo && (cand.indonesian || '').trim().toLowerCase() === targetIndo) return false;

    // Modality alignment: words only compete with words, phrases only with phrases
    const isCandPhrase = phraseTypes.includes((cand.word_type || '').toLowerCase()) || cand.category === 'phrases';
    if (isTargetPhrase !== isCandPhrase) return false;

    seenCandidates.add(candEngLower);
    return true;
  });

  if (eligible.length === 0) return [];

  const scored = eligible.map((cand: any) => ({
    candidate: cand,
    english: (cand.english || '').split('/')[0].trim(),
    score: scoreDistractorSimilarity(target, cand)
  }));

  scored.sort((a: any, b: any) => b.score - a.score);

  return scored.slice(0, count).map((s: any) => s.english);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const student_id = payload.student_id;
    const test_id = payload.test_id;

    if (!student_id || !test_id) {
      return new Response(JSON.stringify({ error: "Missing student_id or test_id." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch Student Details
    const { data: student } = await supabase
      .from("students")
      .select("id, institution_id, program_id, batch_id, level_id, is_active, batches!batch_id(current_level_id)")
      .eq("id", student_id)
      .is("deleted_at", null)
      .single();

    if (!student || !student.is_active) {
      return new Response(JSON.stringify({ error: "Student not found or inactive." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Fetch Test Details
    let test: any = null;
    const { data: tData, error: tErr } = await supabase
      .from("tests")
      .select("*")
      .eq("id", test_id)
      .is("deleted_at", null)
      .single();

    if (!tErr && tData) {
      test = tData;
    }

    if (!test) {
      return new Response(JSON.stringify({ error: "Test not found." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const currentStatus = String(test.status || '').toUpperCase();
    if (currentStatus !== 'PUBLISHED' && currentStatus !== 'ACTIVE') {
      return new Response(JSON.stringify({ error: "Test is not available (not published)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Check Eligibility / Access Rules (Level & Program Centric — AGENTS.md 2.5)
    let isEligible = false;
    let assignmentWindow: { start: string | null; end: string | null } = {
      start: test.availability_start || null,
      end: test.availability_end || null
    };

    let testProgramId = test.program_id;
    if (!testProgramId && test.class_id) {
      const { data: clsRec } = await supabase.from("classes").select("program_id").eq("id", test.class_id).maybeSingle();
      if (clsRec?.program_id) testProgramId = clsRec.program_id;
    }

    const instMatch = !test.institution_id || !student.institution_id || test.institution_id === student.institution_id;
    const progMatch = !testProgramId || !student.program_id || testProgramId === student.program_id;
    if (instMatch && progMatch) {
      isEligible = true;
    }

    // Strict multi-tenant isolation guard: never permit cross-program test access
    if (testProgramId && student.program_id && testProgramId !== student.program_id) {
      isEligible = false;
    }

    if (!isEligible) {
      return new Response(JSON.stringify({ error: "Student not eligible for this test." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 4. Check Availability Window
    const now = new Date();
    const effectiveStart = assignmentWindow.start || test.availability_start;
    const effectiveEnd = assignmentWindow.end || test.availability_end;

    if (effectiveStart && now < new Date(effectiveStart)) {
      return new Response(JSON.stringify({ error: "This test is not yet available." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (effectiveEnd && now > new Date(effectiveEnd)) {
      return new Response(JSON.stringify({ error: "This test is no longer available." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 5. Check Prerequisite Test
    const isStandaloneTryout = test.payload?.is_standalone_tryout === true;
    const prereqId = test.prerequisite_test_id;
    if (prereqId && !isStandaloneTryout) {
      const [prereqAttRes, prereqTestRes] = await Promise.all([
        supabase
          .from("attempts")
          .select("effective_score, percentage, status, is_remedial_unlocked, is_forgiven, total_questions, correct_count, score, forgiven_reason")
          .eq("student_id", student_id)
          .eq("test_id", prereqId)
          .in("status", ["submitted", "auto_submitted", "evaluated", "SUBMITTED", "AUTO_SUBMITTED", "EVALUATED"]),
        supabase
          .from("tests")
          .select("id, payload, test_type, test_subtype, category, shell_code, title, minimum_required_score")
          .eq("id", prereqId)
          .single()
      ]);
      const prereqAttempts = prereqAttRes.data || [];
      const prereqTest = prereqTestRes.data;

      const isPrereqExam = (prereqTest?.test_type || '').toLowerCase() === 'exam' ||
                           (prereqTest?.category || '').toUpperCase() === 'EXAM' ||
                           (prereqTest?.shell_code || '').toUpperCase().endsWith('-EXAM');
      const isPrereqUnified = Boolean(
        prereqTest?.payload?.is_unified === true ||
        prereqTest?.payload?.category === 'unified' ||
        prereqTest?.category === 'unified' ||
        (prereqTest?.test_subtype && prereqTest.test_subtype.startsWith('UNIFIED'))
      );
      const defaultPrereqMin = isPrereqExam ? 60 : 50;
      const reqScore = Number(test.payload?.prerequisite_min_score) ||
                       Number(prereqTest?.minimum_required_score) ||
                       Number(prereqTest?.payload?.min_score) ||
                       defaultPrereqMin;

      let passCount = 0;
      let wordsPasses = 0;
      let phrasesPasses = 0;

      if (isPrereqUnified && !isPrereqExam) {
        (prereqAttempts || []).forEach((a: any) => {
          const fr = String(a.forgiven_reason || '');
          const mMatch = fr.match(/MANUAL_REPS:?\s*(\d+)(?:\/(\d+))?(?:\s*(WORDS|PHRASES))?/i);
          if (mMatch) {
            const reps = Math.min(7, parseInt(mMatch[1], 10));
            const comp = (mMatch[3] || '').toUpperCase();
            if (comp === 'PHRASES') phrasesPasses = Math.max(phrasesPasses, reps);
            else if (comp === 'WORDS') wordsPasses = Math.max(wordsPasses, reps);
            else {
              wordsPasses = Math.max(wordsPasses, reps);
              phrasesPasses = Math.max(phrasesPasses, reps);
            }
          }
          if (a.is_forgiven) {
            wordsPasses = Math.max(wordsPasses, 7);
            phrasesPasses = Math.max(phrasesPasses, 7);
            return;
          }
          const pct = a.effective_score != null ? Number(a.effective_score) : Number(a.percentage || 0);
          const isRem = Boolean(a.is_remedial_unlocked || a.is_remedial);
          if (pct >= reqScore || (isRem && pct >= 60)) {
            const tQ = Number(a.total_questions || 0);
            const cCount = Number(a.correct_count || a.score || 0);
            const isPhrases = (tQ > 0 && tQ <= 20) || (cCount > 0 && cCount <= 10) || /PHRASES/i.test(fr);
            if (isPhrases) phrasesPasses++;
            else wordsPasses++;
          }
        });
        passCount = Math.min(wordsPasses, phrasesPasses);
      } else {
        (prereqAttempts || []).forEach((a: any) => {
          const fr = String(a.forgiven_reason || '');
          const mMatch = fr.match(/MANUAL_REPS:?\s*(\d+)/i);
          if (mMatch) {
            passCount = Math.max(passCount, Math.min(7, parseInt(mMatch[1], 10)));
          }
          if (a.is_forgiven) {
            passCount = Math.max(passCount, 7);
          } else {
            const pct = a.effective_score != null ? Number(a.effective_score) : Number(a.percentage || 0);
            const isRem = Boolean(a.is_remedial_unlocked || a.is_remedial);
            if (pct >= reqScore || (isRem && pct >= 60)) {
              passCount++;
            }
          }
        });
      }

      const requiredPasses = isPrereqExam ? 1 : 7;
      if (passCount < requiredPasses) {
        const errorMsg = isPrereqExam
          ? `Prerequisite not completed. You must pass "${prereqTest?.title || 'the prerequisite exam'}" with at least ${reqScore}% before starting this test.`
          : (isPrereqUnified
              ? `Prerequisite not completed. You must achieve 7×7 Repetitive Mastery on both Words (${wordsPasses}/${requiredPasses}) and Phrases (${phrasesPasses}/${requiredPasses}) with at least ${reqScore}% on "${prereqTest?.title || 'the prerequisite task'}" before starting this test.`
              : `Prerequisite not completed. You must achieve 7×7 Repetitive Mastery (${passCount}/${requiredPasses} passes with at least ${reqScore}%) on "${prereqTest?.title || 'the prerequisite task'}" before starting this test.`);
        return new Response(JSON.stringify({
          error: errorMsg
        }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // 5b. Strict Cross-Theme Prerequisite: Taking ANY test in Theme B, C, or D requires passing prior theme's exams with >= 60%
    const currentThemeEdge = String(test.payload?.theme_code || (test.shell_code ? test.shell_code.replace(/^[0-9]+/, '').charAt(0) : '')).toUpperCase();
    const themeSeqEdge = ['A', 'B', 'C', 'D'];
    const curThemeIdxEdge = themeSeqEdge.indexOf(currentThemeEdge);
    const isRemedialSessionEdge = test.payload?.test_session?.is_remedial === true ||
      (Array.isArray(test.payload?.test_session?.remedial_student_ids) && test.payload.test_session.remedial_student_ids.includes(student_id));

    if (curThemeIdxEdge > 0 && !isStandaloneTryout && !isRemedialSessionEdge) {
      const priorTheme = themeSeqEdge[curThemeIdxEdge - 1];
      const { data: priorExams } = await supabase
        .from('tests')
        .select('id, title, payload, shell_code, test_type, minimum_required_score')
        .eq('class_id', test.class_id)
        .eq('level_id', test.level_id)
        .eq('test_type', 'exam')
        .eq('status', 'PUBLISHED')
        .is('deleted_at', null)
        .neq('id', test.id);

      const matchingPriorExams = (priorExams || []).filter((t: any) => {
        const tc = t.payload?.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : '');
        return String(tc).toUpperCase() === priorTheme;
      });

      if (matchingPriorExams.length > 0) {
        const priorExamIds = matchingPriorExams.map((t: any) => t.id);
        const { data: priorAttempts } = await supabase
          .from('attempts')
          .select('test_id, percentage, effective_score, status, is_remedial_unlocked, is_remedial, is_forgiven')
          .eq('student_id', student_id)
          .in('test_id', priorExamIds)
          .in('status', ["submitted", "auto_submitted", "evaluated", "SUBMITTED", "AUTO_SUBMITTED", "EVALUATED"]);

        const passedPriorIds = new Set();
        (priorAttempts || []).forEach((att: any) => {
          const pe = matchingPriorExams.find((e: any) => e.id === att.test_id);
          const reqScore = Number(pe?.minimum_required_score) || Number(pe?.payload?.min_score) || 60;
          const pct = att.effective_score != null ? Number(att.effective_score) : Number(att.percentage || 0);
          const isRem = Boolean(att.is_remedial_unlocked || att.is_remedial);
          if (pct >= reqScore || (isRem && pct >= 60) || att.is_forgiven) {
            passedPriorIds.add(att.test_id);
          }
        });

        const failedAny = priorExamIds.some((id: any) => !passedPriorIds.has(id));
        if (failedAny) {
          const unpassedExam = matchingPriorExams.find((e: any) => !passedPriorIds.has(e.id));
          const reqScore = Number(unpassedExam?.minimum_required_score) || Number(unpassedExam?.payload?.min_score) || 60;
          return new Response(JSON.stringify({ error: `Prerequisite not completed. You must pass all Theme ${priorTheme} Exams with at least ${reqScore}% before taking Theme ${currentThemeEdge} tests.` }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
    }

    // 6. Check for existing in-progress attempt (Resume)
    const { data: existing } = await supabase
      .from("attempts")
      .select("*")
      .eq("student_id", student_id)
      .eq("test_id", test_id)
      .in("status", ["in_progress", "IN_PROGRESS"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      const deadline = new Date(existing.expires_at || existing.expected_end_at);
      if (now > deadline) {
        // Auto-clean expired attempt without throwing 410 error; proceed to provision fresh attempt
        await supabase.from("attempts")
          .update({ status: "expired", submitted_at: now.toISOString() })
          .eq("id", existing.id);
      } else {
        // Fetch saved answers for this attempt and resume cleanly
        const { data: rawAnswers } = await supabase
          .from("attempt_answers")
          .select("id, question_id, question_snapshot, topic_snapshot, question_type_snapshot, student_answer, score")
          .eq("attempt_id", existing.id)
          .order("created_at");

        const sanitizedResumedAnswers = (rawAnswers || []).map((a: any) => {
          const snap = typeof a.question_snapshot === "string"
            ? (() => { try { return JSON.parse(a.question_snapshot); } catch(_) { return {}; } })()
            : (a.question_snapshot ? { ...a.question_snapshot } : {});
          delete snap.correct_answer;
          delete snap.accepted_answers;
          delete snap.accepted_answers_snapshot;
          delete snap.correct_answer_snapshot;
          return {
            id: a.id,
            question_id: a.question_id,
            question_snapshot: snap,
            topic_snapshot: a.topic_snapshot,
            question_type_snapshot: a.question_type_snapshot,
            student_answer: a.student_answer,
            score: a.score
          };
        });

        return new Response(JSON.stringify({
          attempt: existing,
          answers: sanitizedResumedAnswers,
          resumed: true,
          test: {
            id: test.id,
            title: test.title,
            test_type: test.test_type,
            test_subtype: test.test_subtype,
            shell_code: test.shell_code || test.payload?.shell_code,
            answer_type: test.answer_type || test.payload?.answer_type,
            payload: test.payload,
            working_duration_minutes: test.working_duration_minutes,
            question_order: test.question_order || test.payload?.question_order || 'random'
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // 7. Check Attempt Limits
    const { data: pastAttemptsData } = await supabase
      .from("attempts")
      .select("*")
      .eq("student_id", student_id)
      .eq("test_id", test_id)
      .in("status", ["submitted", "auto_submitted", "evaluated", "expired", "SUBMITTED", "AUTO_SUBMITTED", "EVALUATED", "EXPIRED"])
      .order("created_at", { ascending: false });

    const attemptCount = pastAttemptsData?.length || 0;

    // Self-paced retake eligibility: student is Alumni, has previously passed (>= 60%), was forgiven by tutor (is_forgiven: true), or has remedial unlocked
    const isAlumni = (student.program_status || '').toUpperCase() === 'ALUMNI';
    const hasPastRemedialUnlocked = (pastAttemptsData || []).some((a: any) => Boolean(a.is_remedial_unlocked || a.is_remedial));
    const isEligibleForSelfPaced = isAlumni || (pastAttemptsData || []).some((a: any) => {
      const pct = a.effective_score != null ? Number(a.effective_score) : Number(a.percentage || 0);
      return pct >= 60 || Boolean(a.is_forgiven) || Boolean(a.is_remedial_unlocked || a.is_remedial);
    });

    // Exam retake cap: max 2 retakes = max 3 attempts total (unless authorized for remedial by tutor OR eligible for 24/7 self-paced retake)
    const isRemedialSession = test.payload?.test_session?.is_remedial === true ||
                              (Array.isArray(test.payload?.test_session?.remedial_student_ids) && test.payload.test_session.remedial_student_ids.includes(student_id)) ||
                              hasPastRemedialUnlocked;
    if (test.test_type === 'exam' && attemptCount >= 3 && !isRemedialSession && !isEligibleForSelfPaced) {
      return new Response(JSON.stringify({ error: "Maximum retake limit reached (2 retakes allowed)." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (test.max_attempts && attemptCount >= test.max_attempts && !isRemedialSession && !isEligibleForSelfPaced) {
      return new Response(JSON.stringify({ error: "Maximum attempts reached for this test." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 8. Fetch Questions / Items
    let snapQuestions: any = [];
    if (test.payload && test.payload.is_dynamic_shell) {
      const studentLevelId = student.level_id || student.batches?.current_level_id;
      let studentLevelNum: number | null = null;
      if (studentLevelId) {
        const { data: sLvl } = await supabase.from('levels').select('level_number').eq('id', studentLevelId).single();
        if (sLvl && typeof sLvl.level_number === 'number') {
          studentLevelNum = sLvl.level_number;
        }
      }

      let testLevelNum: number | null = null;
      if (test.level_id) {
        const { data: tLvl } = await supabase.from('levels').select('level_number').eq('id', test.level_id).single();
        if (tLvl && typeof tLvl.level_number === 'number') {
          testLevelNum = tLvl.level_number;
        }
      }

      // Check level gating:
      // Level 0 and Level 99 (Alumni) have universal lifetime access across all levels.
      // Active students (Level >= 1) have Cumulative Retroactive Access: they can take any test where testLevelNum <= studentLevelNum.
      if (!isStandaloneTryout && studentLevelNum !== null && testLevelNum !== null) {
        if (studentLevelNum !== 0 && studentLevelNum !== 99 && !isAlumni && testLevelNum > studentLevelNum) {
          return new Response(JSON.stringify({ error: `Level mismatch. You do not have access to Level ${testLevelNum} tests.` }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      // Validation: Strict Theme Prerequisites for Exams
      if (!isStandaloneTryout && test.test_type === 'exam') {
        const isFlexible = (test.schedule_mode || test.payload?.schedule_mode) === 'flexible';
        const liveSession = test.payload?.test_session;

        // 1. Session check: only required if strict schedule mode or liveSession is configured
        if (!isFlexible && (test.schedule_mode === 'strict' || liveSession)) {
          const isSessionUnlocked = liveSession?.status === 'UNLOCKED' && (!liveSession.auto_close_at || new Date(liveSession.auto_close_at) > now);
          const isWhitelisted = isSessionUnlocked && (!Array.isArray(liveSession.allowed_student_ids) || liveSession.allowed_student_ids.length === 0 || liveSession.allowed_student_ids.includes(student_id));

          if (!isSessionUnlocked) {
            // Bypass session lock if student has already passed or is forgiven (24/7 self-paced retake)
            if (!isEligibleForSelfPaced) {
              return new Response(JSON.stringify({ error: "This test session has not been opened by the Tutor yet." }), {
                status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
          } else if (!isWhitelisted && !isEligibleForSelfPaced) {
            return new Response(JSON.stringify({ error: "You are not on the attendance whitelist for today's test session." }), {
              status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        }

        // 2. Strict Prerequisite Tasks check: Must pass ALL theme tasks 7 times >= 70% (7×7 Mastery)
        // Exempt authorized remedial attempts and students eligible for self-paced retakes
        const isStudentRemedialAuthorized = isRemedialSession ||
          (Array.isArray(liveSession?.remedial_student_ids) && liveSession.remedial_student_ids.includes(student_id)) ||
          hasPastRemedialUnlocked;
        const themeCode = test.payload?.theme_code;
        const isExamTest = (test.test_type || '').toLowerCase() === 'exam' ||
                           test.category === 'EXAM' ||
                           (test.shell_code || '').endsWith('-EXAM');
        const topicCode = test.payload?.topic_code;
        const topicNum = parseInt(String(topicCode || '').replace(/^[A-Za-z]+/, ''), 10);

        if (isExamTest && themeCode && !isStudentRemedialAuthorized && !isEligibleForSelfPaced) {
          const { data: siblingTasks } = await supabase
            .from('tests')
            .select('id, payload, test_type, category, shell_code')
            .eq('class_id', test.class_id)
            .eq('level_id', test.level_id)
            .is('deleted_at', null)
            .contains('payload', { theme_code: themeCode });

          const filteredTasks = (siblingTasks || []).filter((t: any) => {
            const isEx = (t.test_type || '').toLowerCase() === 'exam' ||
                         t.category === 'EXAM' ||
                         (t.shell_code || '').endsWith('-EXAM');
            return !isEx;
          });

          if (filteredTasks && filteredTasks.length > 0) {
            const taskIds = filteredTasks.map((t: any) => t.id);
            const { data: siblingAttempts } = await supabase
              .from('attempts')
              .select('test_id, percentage, effective_score, is_best_score, status, is_forgiven')
              .eq('student_id', student_id)
              .in('test_id', taskIds)
              .in('status', ["submitted", "auto_submitted", "evaluated", "SUBMITTED", "AUTO_SUBMITTED", "EVALUATED"]);

            const passCountByTask: Record<string, number> = {};
            if (siblingAttempts) {
              siblingAttempts.forEach((att: any) => {
                if (att.is_forgiven) {
                  passCountByTask[att.test_id] = Math.max(passCountByTask[att.test_id] || 0, 7);
                } else {
                  const pct = att.effective_score != null ? Number(att.effective_score) : Number(att.percentage || 0);
                  const st = siblingTasks.find((t: any) => t.id === att.test_id);
                  const minReq = Number(st?.minimum_required_score) || Number(st?.payload?.min_score) || 50;
                  if (pct >= minReq) {
                    passCountByTask[att.test_id] = (passCountByTask[att.test_id] || 0) + 1;
                  }
                }
              });
            }

            const unmasteredTask = siblingTasks.find((t: any) => (passCountByTask[t.id] || 0) < 7);
            if (unmasteredTask) {
              const minReq = Number(unmasteredTask.minimum_required_score) || Number(unmasteredTask.payload?.min_score) || 50;
              return new Response(JSON.stringify({ error: `Prerequisite not completed. You must achieve 7×7 Repetitive Mastery (7 passes with at least ${minReq}%) on all Theme Tasks before taking the Exam.` }), {
                status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
          }
        } else if (!isExamTest && themeCode && topicNum > 1 && !isStudentRemedialAuthorized) {
          // Phase 298: Linear Topic Gating — Topic K requires 7/7 Mastery on Topic K-1
          const priorTopicNum = topicNum - 1;
          const { data: priorTopicTasks } = await supabase
            .from('tests')
            .select('id, payload, test_type, category, shell_code, minimum_required_score')
            .eq('class_id', test.class_id)
            .eq('level_id', test.level_id)
            .is('deleted_at', null);

          const filteredPriorTasks = (priorTopicTasks || []).filter((t: any) => {
            const isEx = (t.test_type || '').toLowerCase() === 'exam' ||
                         t.category === 'EXAM' ||
                         (t.shell_code || '').endsWith('-EXAM');
            if (isEx) return false;
            const tc = String(t.payload?.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : '')).toUpperCase();
            if (tc !== themeCode) return false;
            const tTop = parseInt(String(t.payload?.topic_code || '').replace(/^[A-Za-z]+/, ''), 10);
            return tTop === priorTopicNum;
          });

          if (filteredPriorTasks && filteredPriorTasks.length > 0) {
            const priorTaskIds = filteredPriorTasks.map((t: any) => t.id);
            const { data: priorAttempts } = await supabase
              .from('attempts')
              .select('test_id, percentage, effective_score, status, is_forgiven, total_questions, correct_count, score, forgiven_reason')
              .eq('student_id', student_id)
              .in('test_id', priorTaskIds)
              .in('status', ["submitted", "auto_submitted", "evaluated", "SUBMITTED", "AUTO_SUBMITTED", "EVALUATED"]);

            const taskMap: Record<string, any> = Object.fromEntries(filteredPriorTasks.map((t: any) => [t.id, t]));
            const passCountByTask: Record<string, number> = {};
            const wordsPassByTask: Record<string, number> = {};
            const phrasesPassByTask: Record<string, number> = {};

            if (priorAttempts) {
              priorAttempts.forEach((att: any) => {
                const tid = att.test_id;
                const tObj = taskMap[tid];
                const isUni = tObj?.payload?.is_unified === true || tObj?.category === 'unified' || (tObj?.test_subtype && tObj.test_subtype.startsWith('UNIFIED'));
                const fr = String(att.forgiven_reason || '');
                const mMatch = fr.match(/MANUAL_REPS:?\s*(\d+)(?:\/(\d+))?(?:\s*(WORDS|PHRASES))?/i);

                if (mMatch) {
                  const reps = Math.min(7, parseInt(mMatch[1], 10));
                  const comp = (mMatch[3] || '').toUpperCase();
                  if (comp === 'PHRASES') phrasesPassByTask[tid] = Math.max(phrasesPassByTask[tid] || 0, reps);
                  else if (comp === 'WORDS') wordsPassByTask[tid] = Math.max(wordsPassByTask[tid] || 0, reps);
                  else {
                    wordsPassByTask[tid] = Math.max(wordsPassByTask[tid] || 0, reps);
                    phrasesPassByTask[tid] = Math.max(phrasesPassByTask[tid] || 0, reps);
                  }
                  passCountByTask[tid] = Math.max(passCountByTask[tid] || 0, reps);
                }

                if (att.is_forgiven) {
                  passCountByTask[tid] = Math.max(passCountByTask[tid] || 0, 7);
                  wordsPassByTask[tid] = Math.max(wordsPassByTask[tid] || 0, 7);
                  phrasesPassByTask[tid] = Math.max(phrasesPassByTask[tid] || 0, 7);
                  return;
                }

                const pct = att.effective_score != null ? Number(att.effective_score) : Number(att.percentage || 0);
                const minReq = Number(taskMap[tid]?.minimum_required_score || taskMap[tid]?.payload?.min_score || 50);
                if (pct >= minReq) {
                  if (isUni) {
                    const tQ = Number(att.total_questions || 0);
                    const cCount = Number(att.correct_count || att.score || 0);
                    const isPhrases = (tQ > 0 && tQ <= 20) || (cCount > 0 && cCount <= 10) || /PHRASES/i.test(fr);
                    if (isPhrases) phrasesPassByTask[tid] = (phrasesPassByTask[tid] || 0) + 1;
                    else wordsPassByTask[tid] = (wordsPassByTask[tid] || 0) + 1;
                  } else {
                    passCountByTask[tid] = (passCountByTask[tid] || 0) + 1;
                  }
                }
              });
            }

            const unmasteredTask = filteredPriorTasks.find((t: any) => {
              const isUni = t.payload?.is_unified === true || t.category === 'unified' || (t.test_subtype && t.test_subtype.startsWith('UNIFIED'));
              if (isUni) {
                return (wordsPassByTask[t.id] || 0) < 7 || (phrasesPassByTask[t.id] || 0) < 7;
              }
              return (passCountByTask[t.id] || 0) < 7;
            });

            if (unmasteredTask) {
              const unmasteredMin = unmasteredTask.minimum_required_score || unmasteredTask.payload?.min_score || 50;
              return new Response(JSON.stringify({
                error: `Prerequisite not completed. You must achieve 7×7 Repetitive Mastery on both Words and Phrases (7 passes each with at least ${unmasteredMin}%) on Topic ${themeCode}${priorTopicNum} before starting Topic ${topicNum}.`
              }), {
                status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
          }
        }

        // Phase 298: Intra-Theme Words Exam and Phrases Exam are flexible PEERS (neither locks the other).
        // Sibling Words Exam check removed. Students can choose Words first or Phrases first.

        // 4. Strict Cross-Theme Exam Prerequisite: Taking Theme B, C, or D requires passing prior theme's exams (>= 70%)
        const themeSeq = ['A', 'B', 'C', 'D'];
        const curThemeIdx = themeSeq.indexOf(String(themeCode || '').toUpperCase());
        if (curThemeIdx > 0 && !isStandaloneTryout && test.test_type === 'exam') {
          const priorTheme = themeSeq[curThemeIdx - 1];
          const { data: priorExams } = await supabase
            .from('tests')
            .select('id, title, payload, shell_code, test_type, minimum_required_score')
            .eq('class_id', test.class_id)
            .eq('level_id', test.level_id)
            .eq('test_type', 'exam')
            .eq('status', 'PUBLISHED')
            .is('deleted_at', null)
            .neq('id', test.id);

          const matchingPriorExams = (priorExams || []).filter((t: any) => {
            const tc = t.payload?.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : '');
            return String(tc).toUpperCase() === priorTheme;
          });

          if (matchingPriorExams.length > 0) {
            const priorExamIds = matchingPriorExams.map((t: any) => t.id);
            const { data: priorAttempts } = await supabase
              .from('attempts')
              .select('test_id, percentage, effective_score, status, is_remedial_unlocked, is_forgiven, is_remedial')
              .eq('student_id', student_id)
              .in('test_id', priorExamIds)
              .in('status', ["submitted", "auto_submitted", "evaluated", "SUBMITTED", "AUTO_SUBMITTED", "EVALUATED"]);

            const passedPriorIds = new Set();
            (priorAttempts || []).forEach((att: any) => {
              if (att.is_forgiven) {
                passedPriorIds.add(att.test_id);
                return;
              }
              const pe = matchingPriorExams.find((e: any) => e.id === att.test_id);
              const reqScore = Number(pe?.minimum_required_score) || Number(pe?.payload?.min_score) || 60;
              const pct = att.effective_score != null ? Number(att.effective_score) : Number(att.percentage || 0);
              if ((att.is_remedial_unlocked || att.is_remedial) && pct >= 60) {
                passedPriorIds.add(att.test_id);
              } else if (pct >= reqScore) {
                passedPriorIds.add(att.test_id);
              }
            });

            const failedAny = priorExamIds.some((id: any) => !passedPriorIds.has(id));
            if (failedAny) {
              const unpassedExam = matchingPriorExams.find((e: any) => !passedPriorIds.has(e.id));
              const reqScore = Number(unpassedExam?.minimum_required_score) || Number(unpassedExam?.payload?.min_score) || 60;
              return new Response(JSON.stringify({ error: `Prerequisite not completed. You must pass all Theme ${priorTheme} Exams with at least ${reqScore}% before taking Theme ${themeCode} Exams.` }), {
                status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
          }
        }
      }

      const themeCode = test.payload.theme_code;
      const topicCode = test.payload.topic_code;

      let levelNum = 1;
      if (test.level_id) {
        const { data: levelRec } = await supabase
          .from('levels')
          .select('level_number')
          .eq('id', test.level_id)
          .single();
        if (levelRec && levelRec.level_number != null) levelNum = Number(levelRec.level_number);
      }

      let query = supabase.from("vocabulary_vault").select("*").is("deleted_at", null).eq("target_level", levelNum).range(0, 4999);

      const isThemeTest = (test.category === 'EXAM' || test.category === 'TEST' || String(test.test_type).toLowerCase() === 'exam' || test.test_subtype === 'VOCAB_EXAM' || test.test_subtype === 'PHRASE_EXAM' || test.test_subtype === 'VOCAB_TEST' || test.test_subtype === 'PHRASE_TEST' || (test.shell_code && (test.shell_code.includes('-EXAM') || test.shell_code.includes('-TEST')))) && !topicCode;

      const themes = test.payload?.themes;
      if (topicCode) {
          if (themeCode) query = query.eq("theme_code", themeCode);
          const candidateCodes = [
              String(topicCode).toUpperCase(),
              (/^[0-9]+$/.test(String(topicCode)) && themeCode) ? `${String(themeCode).toUpperCase()}${topicCode}` : null,
              String(topicCode).replace(/^[A-Za-z]/, '')
          ].filter(Boolean);
          query = query.in("topic_code", candidateCodes);
      } else if (themes && Array.isArray(themes) && themes.length > 0 && levelNum !== 0) {
          query = query.in("theme_code", themes);
      } else if (isThemeTest && themeCode) {
          if (levelNum === 0) {
              query = query.eq("theme_code", themeCode);
          } else {
              const allThemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
              const idx = allThemes.indexOf(String(themeCode).toUpperCase());
              if (idx !== -1) {
                  const targetThemes = allThemes.slice(0, idx + 1);
                  query = query.in("theme_code", targetThemes);
              } else {
                  query = query.eq("theme_code", themeCode);
              }
          }
      } else if (themeCode) {
          query = query.eq("theme_code", themeCode);
      }

      const { data: vaultData } = await query;
      let vaultWords = vaultData || [];
      const category = test.payload.category || 'vocab';
      const isUnified = category === 'all' ||
                        category === 'unified' ||
                        test.payload?.is_unified === true ||
                        test.payload?.is_unified_test === true;

      const orderSetting = String(test.question_order || test.payload?.question_order || 'random').toLowerCase();

      if (isUnified) {
        let wordsPool = vaultWords.filter((w: any) => {
          const wt = (w.word_type || '').toLowerCase();
          return !['expression', 'idiom', 'proverb', 'phrase'].includes(wt);
        });
        let phrasesPool = vaultWords.filter((w: any) => {
          const wt = (w.word_type || '').toLowerCase();
          return ['expression', 'idiom', 'proverb', 'phrase'].includes(wt);
        });

        if (orderSetting === 'random') {
          wordsPool.sort(() => Math.random() - 0.5);
          phrasesPool.sort(() => Math.random() - 0.5);
        } else {
          wordsPool.sort((a: any, b: any) => (a.indonesian || "").localeCompare(b.indonesian || ""));
          phrasesPool.sort((a: any, b: any) => (a.indonesian || "").localeCompare(b.indonesian || ""));
        }

        const taggedWords = wordsPool.map((w: any) => ({ ...w, test_section: 'words', section_label: 'Part 1: Words' }));
        const taggedPhrases = phrasesPool.map((p: any) => ({ ...p, test_section: 'phrases', section_label: 'Part 2: Phrases' }));

        vaultWords = [...taggedWords, ...taggedPhrases];
      } else {
        vaultWords = vaultWords.filter((w: any) => {
           const wt = (w.word_type || '').toLowerCase();
           const isPhrase = ['expression', 'idiom', 'proverb', 'phrase'].includes(wt);
           return category === 'phrases' ? isPhrase : !isPhrase;
        });

        if (orderSetting === 'random') {
          vaultWords.sort(() => Math.random() - 0.5);
        } else {
          vaultWords.sort((a: any, b: any) => (a.indonesian || "").localeCompare(b.indonesian || ""));
        }
      }

      // Safety clamp: strictly respect configured total questions bounds (e.g. 40 for task, 120 for exam)
      const maxTargetQuestions = test.payload?.total_questions || test.total_questions;
      if (maxTargetQuestions && Number(maxTargetQuestions) > 0 && vaultWords.length > Number(maxTargetQuestions)) {
        vaultWords = vaultWords.slice(0, Number(maxTargetQuestions));
      }

      const liveSession = test.payload?.test_session;
      const isLiveSessionActive = liveSession?.status === 'UNLOCKED' && (!liveSession.auto_close_at || new Date(liveSession.auto_close_at) > now);
      const isSelfPacedRetake = !isLiveSessionActive && isEligibleForSelfPaced && test.test_type === 'exam';

      let dynamicAnswerType = ((test.answer_type && test.answer_type !== 'MULTIPLE_CHOICE') ? test.answer_type : null) || test.payload?.answer_type || (test.test_subtype === 'PHRASE_TEST' ? 'selection' : 'spoken');

      const sessAnsweringMode = liveSession?.answering_mode;
      const sessModes = liveSession?.answering_modes;

      let classSettings: any = null;
      if (test.class_id) {
        try {
          const { data: csRow } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', `class_test_settings_${test.class_id}`)
            .maybeSingle();
          if (csRow?.value) {
            classSettings = typeof csRow.value === 'string' ? JSON.parse(csRow.value) : csRow.value;
          }
        } catch (_) {}
      }
      const isExamTest = String(test.test_type || '').toLowerCase() === 'exam' || String(test.category || '').toUpperCase() === 'EXAM';
      const payloadWordsAns = test.payload?.words_answer_type || test.payload?.wordsAnswerType;
      const payloadPhrasesAns = test.payload?.phrases_answer_type || test.payload?.phrasesAnswerType;
      const settingsWordsAns = isExamTest ? classSettings?.wordsExamAnswer : classSettings?.wordsTaskAnswer;
      const settingsPhrasesAns = isExamTest ? classSettings?.phrasesExamAnswer : classSettings?.phrasesTaskAnswer;

      let wordsAnswerType = sessModes?.words || sessAnsweringMode || payloadWordsAns || settingsWordsAns || dynamicAnswerType;
      let phrasesAnswerType = sessModes?.phrases || sessAnsweringMode || payloadPhrasesAns || settingsPhrasesAns || (isUnified ? (dynamicAnswerType === 'written' ? 'selection' : dynamicAnswerType) : dynamicAnswerType);

      if (isSelfPacedRetake) {
        // Outside active tutor sessions, self-paced retakes strictly enforce 100% SPOKEN modality (SSOT Standard)
        dynamicAnswerType = 'spoken';
        wordsAnswerType = 'spoken';
        phrasesAnswerType = 'spoken';
      } else {
        if (test.answer_type === 'written' || (test.shell_code && test.shell_code.endsWith('-WORDS-EXAM')) || (test.title && test.title.toUpperCase().includes('WORDS EXAM'))) {
          wordsAnswerType = sessModes?.words || sessAnsweringMode || 'written';
        }
        if (!test.payload?.answer_type && !(test.answer_type && test.answer_type !== 'MULTIPLE_CHOICE')) {
           if (test.test_subtype === 'VOCAB_TASK' || test.test_subtype === 'PHRASE_TASK') {
             wordsAnswerType = sessModes?.words || sessAnsweringMode || 'spoken';
             phrasesAnswerType = sessModes?.phrases || sessAnsweringMode || 'spoken';
           } else if (test.test_subtype === 'VOCAB_TEST') {
             wordsAnswerType = sessModes?.words || sessAnsweringMode || 'spoken';
           } else if (test.test_subtype === 'PHRASE_TEST') {
             phrasesAnswerType = sessModes?.phrases || sessAnsweringMode || 'selection';
           }
        }
      }

      if (vaultWords && vaultWords.length > 0) {
        let distractorPool: any[] = [];
        const isWordsSelection = wordsAnswerType === 'dropdown' || wordsAnswerType === 'selection' || wordsAnswerType === 'multiple_choice' || wordsAnswerType === 'recognition';
        const isPhrasesSelection = phrasesAnswerType === 'dropdown' || phrasesAnswerType === 'selection' || phrasesAnswerType === 'multiple_choice' || phrasesAnswerType === 'recognition';
        const needsDistractorPool = isWordsSelection || isPhrasesSelection;

        if (needsDistractorPool) {
            let distractorQuery = supabase.from('vocabulary_vault')
                .select('id, english, indonesian, word_type, topic, topic_code, theme, theme_code, category, target_level')
                .eq('target_level', levelNum)
                .is('deleted_at', null)
                .range(0, 4999);

            const { data: allData } = await distractorQuery;
            if (allData && allData.length > 0) {
                distractorPool = allData;
            } else {
                const { data: broaderData } = await supabase.from('vocabulary_vault')
                    .select('id, english, indonesian, word_type, topic, topic_code, theme, theme_code, category, target_level')
                    .is('deleted_at', null)
                    .range(0, 4999);
                distractorPool = broaderData || [];
            }
        }

        snapQuestions = vaultWords.map((vw: any, idx: number) => {
             const accepted = vw.english ? vw.english.split('/').map((s: string) => s.trim()) : [];
             let options = null;

             const isPhraseItem = vw.test_section === 'phrases' || vw.section_label?.includes('Phrases') || ['expression', 'idiom', 'proverb', 'phrase'].includes((vw.word_type || '').toLowerCase());
             const itemAnswerType = isPhraseItem ? phrasesAnswerType : wordsAnswerType;
             const isItemSelection = itemAnswerType === 'dropdown' || itemAnswerType === 'selection' || itemAnswerType === 'multiple_choice' || itemAnswerType === 'recognition';

             if (isItemSelection) {
                 const correctAnswer = accepted[0] || "N/A";
                 const numDistractors = (itemAnswerType === 'dropdown_10') ? 9 : 4;
                 const rankedDistractors = rankDistractorsForVaultItem(vw, distractorPool, numDistractors);
                 options = [correctAnswer, ...rankedDistractors].sort(() => 0.5 - Math.random());
             }

             return {
                 question_id: isUuid(vw.id) ? vw.id : null,
                 item_code: vw.item_code || vw.id || null,
                 question_text_snapshot: vw.indonesian || "N/A",
                 accepted_answers_snapshot: accepted,
                 options_snapshot: options ? options : null,
                 topic_snapshot: vw.topic || vw.topic_code || "General",
                 word_type_snapshot: vw.word_type,
                 display_order: idx + 1,
                 answer_type: itemAnswerType,
                 test_section: vw.test_section || (isPhraseItem ? 'phrases' : 'words'),
                 section_label: vw.section_label || (isPhraseItem ? 'Part 2: Phrases' : 'Part 1: Words')
             };
        });
      }
    } else {
      snapQuestions = test.payload?.questions || [];
    }

    if (!snapQuestions || snapQuestions.length === 0) {
      return new Response(JSON.stringify({ error: "Test has no questions available." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!isUnified && String(test.question_order || test.payload?.question_order || 'random').toLowerCase() === 'random') {
      snapQuestions.sort(() => Math.random() - 0.5);
    }

    // 9. Create New Attempt
    const isPhrase = test.test_subtype?.includes('PHRASE') || (test.shell_code && test.shell_code.includes('PHRASE')) || test.category === 'phrases' || test.payload?.category === 'phrases';

    // Standar Pacing SSOT (DECISION-063 Khusus Vocabulary Class):
    // Words: 10s spoken / 15s written / 10s selection
    // Phrases: 20s spoken / 10s selection / 20s written
    let manualDuration = Number(test.working_duration_minutes || test.payload?.working_duration_minutes || 0);
    let autoCalcMinutes = 10;

    if (isUnified) {
      const wordsAns = String(sessModes?.words || sessAnsweringMode || test.answer_type || 'written').toLowerCase();
      const phrasesAns = String(sessModes?.phrases || (wordsAns === 'written' ? 'selection' : wordsAns)).toLowerCase();
      const wPace = wordsAns === 'written' ? 15 : 10;
      const pPace = (phrasesAns === 'selection' || phrasesAns === 'multiple_choice' || phrasesAns === 'recognition') ? 10 : 20;

      let wCount = 0;
      let pCount = 0;
      snapQuestions.forEach((q: any) => {
        if (q.test_section === 'phrases' || q.category === 'phrases') pCount++;
        else wCount++;
      });
      if (wCount === 0 && pCount === 0) {
        wCount = snapQuestions.length > 50 ? 160 : 40;
        pCount = snapQuestions.length - wCount;
      }
      const totalSec = (wCount * wPace) + (pCount * pPace);
      autoCalcMinutes = Math.max(1, Math.ceil(totalSec / 60));
    } else {
      const ansType = String(test.answer_type || 'spoken').toLowerCase();
      let pace = 10;
      if (isPhrase) {
        pace = (ansType === 'selection' || ansType === 'multiple_choice' || ansType === 'recognition') ? 10 : 20;
      } else {
        pace = (ansType === 'written') ? 15 : 10;
      }
      autoCalcMinutes = Math.max(1, Math.ceil((snapQuestions.length * pace) / 60));
    }

    let durationMinutes = manualDuration > 0 ? manualDuration : autoCalcMinutes;
    if (test.test_type === 'exam' && effectiveEnd && !isSelfPacedRetake) {
      const diffMs = new Date(effectiveEnd).getTime() - now.getTime();
      durationMinutes = Math.max(1, Math.ceil(diffMs / (60 * 1000)));
    }
    const expiresAt = (test.test_type === 'exam' && effectiveEnd && !isSelfPacedRetake)
      ? new Date(effectiveEnd)
      : new Date(now.getTime() + durationMinutes * 60 * 1000);

    const isRemedialAttempt = Boolean(isStudentRemedialAuthorized || hasPastRemedialUnlocked);

    const attemptPayload: any = {
      student_id,
      test_id,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: "in_progress",
      score: 0,
      percentage: 0,
      total_questions: snapQuestions.length,
      is_remedial_unlocked: isRemedialAttempt,
      is_remedial: isRemedialAttempt
    };

    const { data: newAttempt, error: attemptErr } = await supabase
      .from("attempts")
      .insert(attemptPayload)
      .select()
      .single();

    if (attemptErr) throw attemptErr;

    // 10. Populate attempt_answers
    const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    const answerInserts = snapQuestions.map((sq: any) => ({
      attempt_id: newAttempt.id,
      question_id: isUuid(sq.question_id) ? sq.question_id : null,
      question_snapshot: {
        item_code: sq.item_code || sq.question_id || null,
        question_text: sq.question_text_snapshot || sq.question_text || sq.prompt,
        word_type: sq.word_type_snapshot || sq.word_type,
        topic: sq.topic_snapshot || sq.topic,
        display_order: sq.display_order,
        answer_type: sq.answer_type || dynamicAnswerType || 'spoken',
        options_snapshot: sq.options_snapshot || [],
        test_section: sq.test_section || null,
        section_label: sq.section_label || null,
        target_demonstrative: sq.target_demonstrative || null,
        accepted_answers: sq.accepted_answers_snapshot || sq.accepted_answers || null,
        module: sq.module || test.payload?.module || (test.module_type === 'POINT_AND_SPEAK' ? 'description' : null)
      },
      topic_snapshot: sq.topic_snapshot || sq.topic,
      question_type_snapshot: sq.word_type_snapshot || sq.word_type,
      accepted_answers_snapshot: sq.accepted_answers_snapshot || sq.accepted_answers,
      correct_answer_snapshot: Array.isArray(sq.accepted_answers_snapshot || sq.accepted_answers) ? (sq.accepted_answers_snapshot || sq.accepted_answers).join(';') : String(sq.accepted_answers_snapshot || sq.accepted_answers || ''),
      student_answer: null,
      score: 0
    }));

    const insertedAnswers: any[] = [];
    for (let i = 0; i < answerInserts.length; i += 100) {
      const chunk = answerInserts.slice(i, i + 100);
      const { data: chunkRows, error: insAnsErr } = await supabase
        .from("attempt_answers")
        .insert(chunk)
        .select("id, question_id, question_snapshot, topic_snapshot, question_type_snapshot, student_answer, score");
      if (insAnsErr) {
        await supabase.from("attempt_answers").delete().eq("attempt_id", newAttempt.id);
        await supabase.from("attempts").delete().eq("id", newAttempt.id);
        throw insAnsErr;
      }
      if (chunkRows) insertedAnswers.push(...chunkRows);
    }

    const sanitizedNewAnswers = (insertedAnswers || []).map((a: any) => {
      const snap = typeof a.question_snapshot === "string"
        ? (() => { try { return JSON.parse(a.question_snapshot); } catch(_) { return {}; } })()
        : (a.question_snapshot ? { ...a.question_snapshot } : {});
      delete snap.correct_answer;
      delete snap.accepted_answers;
      delete snap.accepted_answers_snapshot;
      delete snap.correct_answer_snapshot;
      return {
        id: a.id,
        question_id: a.question_id,
        question_snapshot: snap,
        topic_snapshot: a.topic_snapshot,
        question_type_snapshot: a.question_type_snapshot,
        student_answer: a.student_answer,
        score: a.score
      };
    });

    return new Response(JSON.stringify({
      attempt: newAttempt,
      answers: sanitizedNewAnswers,
      resumed: false,
      test: {
        id: test.id,
        title: test.title,
        test_type: test.test_type,
        test_subtype: test.test_subtype,
        shell_code: test.shell_code || test.payload?.shell_code,
        answer_type: dynamicAnswerType || test.answer_type || test.payload?.answer_type,
        payload: test.payload,
        working_duration_minutes: durationMinutes,
        question_order: test.question_order || test.payload?.question_order || 'random'
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("start-test error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
