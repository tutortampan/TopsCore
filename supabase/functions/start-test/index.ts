// @ts-nocheck
// TOPSCORE LMS — Edge Function: start-test
// Server-authoritative test start. Creates or resumes an attempt.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      .select("id, institution_id, program_id, batch_id, is_active, batches!batch_id(current_level_id)")
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

    // 3. Check Eligibility / Access Rules
    let isEligible = false;
    let assignmentWindow: { start: string | null; end: string | null } = { start: null, end: null };

    // Check assignments table
    const { data: assignments } = await supabase
      .from("assignments")
      .select("*")
      .eq("test_id", test_id)
      .eq("status", "active");

    if (assignments && assignments.length > 0) {
      const studentMatch = assignments.find(a => a.assignment_type === 'STUDENT' && a.student_id === student_id);
      const batchMatch = assignments.find(a => a.assignment_type === 'BATCH' && a.batch_id === student.batch_id);

      const activeAssignment = studentMatch || batchMatch;
      if (activeAssignment) {
        isEligible = true;
        assignmentWindow = {
          start: activeAssignment.availability_start,
          end: activeAssignment.availability_end
        };
      }
    }

    // Fallback: If no explicit assignment rules exist, allow if institution matches
    if (!isEligible && (!assignments || assignments.length === 0)) {
      if (!test.institution_id || test.institution_id === student.institution_id) {
        isEligible = true;
      }
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
      const { data: prereqAttempts } = await supabase
        .from("attempts")
        .select("effective_score, percentage, status")
        .eq("student_id", student_id)
        .eq("test_id", prereqId)
        .in("status", ["submitted", "auto_submitted", "evaluated", "SUBMITTED", "AUTO_SUBMITTED", "EVALUATED"]);

      const reqScore = test.prerequisite_min_score || 60;
      const hasPassed = prereqAttempts && prereqAttempts.some((a: any) => (a.effective_score || a.percentage || 0) >= reqScore);

      if (!hasPassed) {
        return new Response(JSON.stringify({ error: `Prerequisite not completed. You must score at least ${reqScore}% on the prerequisite test.` }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
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
        await supabase.from("attempts")
          .update({ status: "expired", submitted_at: now.toISOString() })
          .eq("id", existing.id);

        return new Response(JSON.stringify({ error: "Previous attempt has expired." }), {
          status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Fetch saved answers for this attempt
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
          working_duration_minutes: test.working_duration_minutes,
          question_order: test.question_order || test.payload?.question_order || 'random'
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
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

    // Exam retake cap: max 2 retakes = max 3 attempts total (unless authorized for remedial by tutor)
    const isRemedialSession = test.payload?.test_session?.is_remedial === true ||
                              (Array.isArray(test.payload?.test_session?.remedial_student_ids) && test.payload.test_session.remedial_student_ids.includes(student_id));
    if (test.test_type === 'exam' && attemptCount >= 3 && !isRemedialSession) {
      return new Response(JSON.stringify({ error: "Maximum retake limit reached (2 retakes allowed)." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (test.max_attempts && attemptCount >= test.max_attempts && !isRemedialSession) {
      return new Response(JSON.stringify({ error: "Maximum attempts reached for this test." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 8. Fetch Questions / Items
    let snapQuestions: any = [];
    if (test.payload && test.payload.is_dynamic_shell) {
      const studentCurrentLevelId = student.batches?.current_level_id;
      if (!isStandaloneTryout && studentCurrentLevelId && test.level_id && studentCurrentLevelId !== test.level_id) {
         return new Response(JSON.stringify({ error: "Level mismatch. You do not have access to this test's level." }), {
           status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
         });
      }

      // Validation: Strict Theme Prerequisites for Exams (Must pass ALL sibling tasks with >= 60%)
      if (!isStandaloneTryout && test.test_type === 'exam') {
        // 1. Session check: session must be unlocked and student must be whitelisted
        const liveSession = test.payload?.test_session;
        const isSessionUnlocked = liveSession?.status === 'UNLOCKED' && (!liveSession.auto_close_at || new Date(liveSession.auto_close_at) > now);
        const isWhitelisted = isSessionUnlocked && (!Array.isArray(liveSession.allowed_student_ids) || liveSession.allowed_student_ids.length === 0 || liveSession.allowed_student_ids.includes(student_id));

        if (!isSessionUnlocked) {
          return new Response(JSON.stringify({ error: "This test session has not been opened by the Tutor yet." }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (!isWhitelisted) {
          return new Response(JSON.stringify({ error: "You are not on the attendance whitelist for today's test session." }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // 2. Strict Prerequisite Quizzes check: Must pass ALL theme tasks >= 60%
        const themeCode = test.payload?.theme_code;
        if (themeCode) {
          const { data: siblingTasks } = await supabase
            .from('tests')
            .select('id')
            .eq('class_id', test.class_id)
            .eq('level_id', test.level_id)
            .eq('test_type', 'quiz')
            .contains('payload', { theme_code: themeCode });

          if (siblingTasks && siblingTasks.length > 0) {
            const taskIds = siblingTasks.map((t: any) => t.id);
            const { data: siblingAttempts } = await supabase
              .from('attempts')
              .select('test_id, percentage, effective_score, is_best_score, status')
              .eq('student_id', student_id)
              .in('test_id', taskIds)
              .in('status', ["submitted", "auto_submitted", "evaluated", "SUBMITTED", "AUTO_SUBMITTED", "EVALUATED"]);
              
            const reqScore = test.prerequisite_min_score || 60;
            const passedTaskIds = new Set();
            if (siblingAttempts) {
              siblingAttempts.forEach((att: any) => {
                if ((att.effective_score || att.percentage || 0) >= reqScore) {
                  passedTaskIds.add(att.test_id);
                }
              });
            }

            if (passedTaskIds.size < taskIds.length) {
              return new Response(JSON.stringify({ error: `Prerequisite not completed. You must score at least ${reqScore}% on ALL Theme Quizzes before taking the Theme Exam.` }), {
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
        if (levelRec?.level_number) levelNum = levelRec.level_number;
      }

      let query = supabase.from("vocabulary_vault").select("*").is("deleted_at", null).eq("target_level", levelNum).range(0, 4999);
      
      const themes = test.payload.themes;
      if (themes && Array.isArray(themes) && themes.length > 0) {
          query = query.in("theme_code", themes);
      } else if (test.test_type === 'exam' && themeCode) {
          const allThemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
          const idx = allThemes.indexOf(themeCode);
          if (idx !== -1) {
              const targetThemes = allThemes.slice(0, idx + 1);
              query = query.in("theme_code", targetThemes);
          } else {
              query = query.eq("theme_code", themeCode);
          }
      } else {
          if (themeCode) query = query.eq("theme_code", themeCode);
          if (topicCode) query = query.eq("topic_code", topicCode);
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

      let dynamicAnswerType = ((test.answer_type && test.answer_type !== 'MULTIPLE_CHOICE') ? test.answer_type : null) || test.payload?.answer_type || 'written';
      if (!test.payload?.answer_type && !(test.answer_type && test.answer_type !== 'MULTIPLE_CHOICE')) {
         if (test.test_subtype === 'VOCAB_TASK' || test.test_subtype === 'PHRASE_TASK') dynamicAnswerType = 'spoken';
         else if (test.test_subtype === 'VOCAB_TEST') dynamicAnswerType = 'written';
         else if (test.test_subtype === 'PHRASE_TEST') dynamicAnswerType = 'selection';
      }
      
      if (vaultWords && vaultWords.length > 0) {
        let distractorPool: any[] = [];
        const isSelectionMode = dynamicAnswerType === 'dropdown' || dynamicAnswerType === 'selection' || dynamicAnswerType === 'multiple_choice';
        if (isSelectionMode) {
            let distractorQuery = supabase.from('vocabulary_vault')
                .select('english, word_type')
                .eq('target_level', levelNum)
                .is('deleted_at', null)
                .range(0, 4999);

            const { data: allPhraseData } = await distractorQuery;
            if (allPhraseData) {
                const phraseTypes = ['expression', 'idiom', 'proverb', 'phrase'];
                const isPhraseMode = category === 'phrases' || test.test_subtype === 'PHRASE_TASK' || test.test_subtype === 'PHRASE_TEST';
                
                distractorPool = allPhraseData.filter((r: any) => {
                    const wt = (r.word_type || '').toLowerCase();
                    const isPhrase = phraseTypes.includes(wt);
                    return isPhraseMode ? isPhrase : !isPhrase;
                });
            }
        }

        snapQuestions = vaultWords.map((vw: any, idx: number) => {
             const accepted = vw.english ? vw.english.split('/').map((s: string) => s.trim()) : [];
             let options = null;
             
             if (isSelectionMode) {
                 const correctAnswer = accepted[0] || "N/A";
                 let others = distractorPool.filter((r: any) => {
                     const eng = (r.english||'').split('/')[0].trim();
                     return eng && eng !== correctAnswer && !accepted.includes(eng);
                 });
                 
                 const currentType = (vw.word_type || '').toLowerCase();
                 let homogenous = others.filter((r: any) => (r.word_type || '').toLowerCase() === currentType);
                 let heterogenous = others.filter((r: any) => (r.word_type || '').toLowerCase() !== currentType);
                 
                 homogenous = homogenous.sort(() => 0.5 - Math.random());
                 heterogenous = heterogenous.sort(() => 0.5 - Math.random());
                 
                 let finalDistractors = [];
                 if (homogenous.length >= 4) {
                     finalDistractors = homogenous.slice(0, 4);
                 } else {
                     finalDistractors = [...homogenous, ...heterogenous].slice(0, 4);
                 }
                 
                 let stringDistractors = finalDistractors.map((r: any) => (r.english||'').split('/')[0].trim());
                 options = [correctAnswer, ...stringDistractors].sort(() => 0.5 - Math.random());
             }
             
             return {
                 question_id: null,
                 item_code: vw.item_code || null,
                 question_text_snapshot: vw.indonesian || "N/A",
                 accepted_answers_snapshot: accepted,
                 options_snapshot: options ? options : null,
                 topic_snapshot: vw.topic || vw.topic_code || "General",
                 word_type_snapshot: vw.word_type,
                 display_order: idx + 1,
                 answer_type: dynamicAnswerType,
                 test_section: vw.test_section || null,
                 section_label: vw.section_label || null
             };
        });
      }
    } else {
      const { data } = await supabase
        .from("test_items")
        .select("*")
        .eq("test_id", test_id)
        .order("display_order");
      snapQuestions = data || [];
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
    let durationMinutes = test.working_duration_minutes || 60;
    let expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    if (test.test_type === 'quiz') {
      durationMinutes = test.working_duration_minutes || 5;
      expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
    } else if (test.test_type === 'exam') {
      if (effectiveEnd) {
        expiresAt = new Date(effectiveEnd);
      }
      durationMinutes = test.working_duration_minutes || 120;
    }

    const attemptPayload: any = {
      student_id,
      test_id,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: "in_progress",
      score: 0,
      percentage: 0,
      total_questions: snapQuestions.length
    };

    const { data: newAttempt, error: attemptErr } = await supabase
      .from("attempts")
      .insert(attemptPayload)
      .select()
      .single();

    if (attemptErr) throw attemptErr;

    // 10. Populate attempt_answers
    const answerInserts = snapQuestions.map((sq: any) => ({
      attempt_id: newAttempt.id,
      question_id: sq.question_id || null,
      question_snapshot: {
        item_code: sq.item_code || null,
        question_text: sq.question_text_snapshot,
        word_type: sq.word_type_snapshot,
        topic: sq.topic_snapshot,
        display_order: sq.display_order,
        answer_type: sq.answer_type || 'written',
        options_snapshot: sq.options_snapshot || [],
        test_section: sq.test_section || null,
        section_label: sq.section_label || null
      },
      topic_snapshot: sq.topic_snapshot,
      question_type_snapshot: sq.word_type_snapshot,
      accepted_answers_snapshot: sq.accepted_answers_snapshot,
      correct_answer_snapshot: Array.isArray(sq.accepted_answers_snapshot) ? sq.accepted_answers_snapshot.join(';') : String(sq.accepted_answers_snapshot || ''),
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
