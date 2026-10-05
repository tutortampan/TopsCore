// @ts-nocheck
// TOP ENGLISH CLASS — Edge Function: start-Assessment (Assessment V1)
// Server-authoritative assessment start. Creates or resumes an attempt.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const student_id = payload.student_id;
    const assessment_id = payload.assessment_id || payload.Assessment_id;

    if (!student_id || !assessment_id) {
      return new Response(JSON.stringify({ error: "Missing student_id or assessment_id." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch Student Details (join batches to get current_level_id for dynamic shell level gating)
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

    // 2. Fetch Assessment Details (Try assessments table first, fallback to Assessments)
    let assessment: any = null;
    const { data: asmData, error: asmErr } = await supabase
      .from("assessments")
      .select("*")
      .eq("id", assessment_id)
      .is("deleted_at", null)
      .single();

    if (!asmErr && asmData) {
      assessment = asmData;
    } else {
      const { data: exData, error: exErr } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", assessment_id)
        .is("deleted_at", null)
        .single();
      if (!exErr && exData) {
        assessment = {
          ...exData,
          title: exData.title || exData.Assessment_title,
          assessment_type: exData.assessment_type || 'EVALUATION',
          working_duration_minutes: exData.working_duration_minutes || exData.time_limit_minutes || 60,
          status: (exData.Assessment_status || 'draft').toUpperCase()
        };
      }
    }

    if (!assessment) {
      return new Response(JSON.stringify({ error: "Assessment not found." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const currentStatus = String(assessment.status || '').toUpperCase();
    if (currentStatus !== 'PUBLISHED' && currentStatus !== 'ACTIVE') {
      return new Response(JSON.stringify({ error: "Assessment is not available (not published)." }), {
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
      .eq("assessment_id", assessment_id)
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

    // Fallback: Check assessment_programs or Assessment_programs or Assessment_access
    if (!isEligible) {
      const { data: progMatch } = await supabase
        .from("assessment_programs")
        .select("*")
        .eq("assessment_id", assessment_id)
        .eq("program_id", student.program_id);

      if (progMatch && progMatch.length > 0) {
        isEligible = true;
      } else {
        const { data: exProgMatch } = await supabase
          .from("assessment_programs")
          .select("*")
          .eq("assessment_id", assessment_id)
          .eq("program_id", student.program_id);
        if (exProgMatch && exProgMatch.length > 0) isEligible = true;
      }
    }

    // Fallback 2: If no explicit assignment rules exist yet, allow if institution matches
    if (!isEligible && (!assignments || assignments.length === 0)) {
      if (!assessment.institution_id || assessment.institution_id === student.institution_id) {
        isEligible = true;
      }
    }

    if (!isEligible) {
      return new Response(JSON.stringify({ error: "Student not eligible for this assessment." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 4. Check Availability Window
    const now = new Date();
    const effectiveStart = assignmentWindow.start || assessment.availability_start;
    const effectiveEnd = assignmentWindow.end || assessment.availability_end;

    if (effectiveStart && now < new Date(effectiveStart)) {
      return new Response(JSON.stringify({ error: "This assessment is not yet available." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (effectiveEnd && now > new Date(effectiveEnd)) {
      return new Response(JSON.stringify({ error: "This assessment is no longer available." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 5. Check Prerequisite Assessment
    const isStandaloneTryout = assessment.payload?.is_standalone_tryout === true;
    const prereqId = assessment.prerequisite_assessment_id;
    if (prereqId && !isStandaloneTryout) {
      const { data: prereqAttempts } = await supabase
        .from("attempts")
        .select("effective_score, percentage, status")
        .eq("student_id", student_id)
        .eq("assessment_id", prereqId)
        .in("status", ["submitted", "auto_submitted", "evaluated", "SUBMITTED", "AUTO_SUBMITTED", "EVALUATED"]);

      const reqScore = assessment.prerequisite_min_score || 60;
      const hasPassed = prereqAttempts && prereqAttempts.some((a: any) => (a.effective_score || a.percentage || 0) >= reqScore);

      if (!hasPassed) {
        return new Response(JSON.stringify({ error: `Prerequisite not completed. You must score at least ${reqScore}% on the prerequisite assessment.` }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // 6. Check for existing in-progress attempt (Resume)
    const { data: existing } = await supabase
      .from("attempts")
      .select("*")
      .eq("student_id", student_id)
      .eq("assessment_id", assessment_id)
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

      // Fetch saved answers for this attempt (strip answer keys for client)
      const { data: rawAnswers } = await supabase
        .from("attempt_answers")
        .select("id, question_id, question_snapshot, topic_snapshot, question_type_snapshot, student_answer, score")
        .eq("attempt_id", existing.id)
        .order("created_at");

      return new Response(JSON.stringify({
        attempt: existing,
        answers: rawAnswers || [],
        resumed: true,
        assessment: {
          id: assessment.id,
          title: assessment.title,
          assessment_type: assessment.assessment_type,
          working_duration_minutes: assessment.working_duration_minutes
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 7. Check Attempt Limits & Remedial Cap
    const { data: pastAttemptsData } = await supabase
      .from("attempts")
      .select("*")
      .eq("student_id", student_id)
      .eq("assessment_id", assessment_id)
      .in("status", ["submitted", "auto_submitted", "evaluated", "expired", "SUBMITTED", "AUTO_SUBMITTED", "EVALUATED", "EXPIRED"])
      .order("created_at", { ascending: false });

    const attemptCount = pastAttemptsData?.length || 0;

    // TEST retake cap: max 2 retakes = max 3 attempts total (server-authoritative)
    if (assessment.assessment_category === 'TEST' && attemptCount >= 3) {
      return new Response(JSON.stringify({ error: "Maximum retake limit reached (2 retakes allowed)." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (assessment.max_attempts && attemptCount >= assessment.max_attempts) {
      return new Response(JSON.stringify({ error: "Maximum attempts reached for this assessment." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (assessment.assessment_type === 'EXAM' && attemptCount >= 1) {
      const mostRecentAttempt = pastAttemptsData?.[0];
      if (!mostRecentAttempt?.is_remedial_unlocked) {
        return new Response(JSON.stringify({ error: "Official Exam attempt completed. Remedial retake requires teacher authorization." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }
    // 8. Fetch Assessment Questions (from frozen snapshot assessment_questions)
    let snapQuestions: any = [];
    if (assessment.payload && assessment.payload.is_dynamic_shell) {
      
      // Validation 1: Level Gating (use batches.current_level_id — student.level_id does not exist)
      const studentCurrentLevelId = student.batches?.current_level_id;
      if (!isStandaloneTryout && studentCurrentLevelId && assessment.level_id && studentCurrentLevelId !== assessment.level_id) {
         return new Response(JSON.stringify({ error: "Level mismatch. You do not have access to this assessment's level." }), {
           status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
         });
      }

      // Validation 2: Theme Prerequisites
      if (!isStandaloneTryout && (assessment.assessment_category === 'TEST' || assessment.assessment_type === 'VOCAB_TEST' || assessment.assessment_type === 'PHRASE_TEST')) {
        const themeCode = assessment.payload?.theme_code;
        if (themeCode) {
          // Fetch all sibling tasks in this theme
          const { data: siblingTasks } = await supabase
            .from('assessments')
            .select('id')
            .eq('class_id', assessment.class_id)
            .eq('level_id', assessment.level_id)
            .in('assessment_category', ['TASK'])
            .contains('payload', { theme_code: themeCode });

          if (siblingTasks && siblingTasks.length > 0) {
            const taskIds = siblingTasks.map(t => t.id);
            const { data: siblingAttempts } = await supabase
              .from('attempts')
              .select('assessment_id, percentage, effective_score, is_best_score, status')
              .eq('student_id', student_id)
              .in('assessment_id', taskIds)
              .in('status', ["submitted", "auto_submitted", "evaluated", "SUBMITTED", "AUTO_SUBMITTED", "EVALUATED"]);
              
            const reqScore = assessment.prerequisite_min_score || 60;
            const passedTaskIds = new Set();
            if (siblingAttempts) {
              siblingAttempts.forEach(att => {
                if ((att.effective_score || att.percentage || 0) >= reqScore) {
                  passedTaskIds.add(att.assessment_id);
                }
              });
            }

            if (passedTaskIds.size < taskIds.length) {
              return new Response(JSON.stringify({ error: `Prerequisite not completed. You must score at least ${reqScore}% on ALL Theme Tasks before taking the Theme Test.` }), {
                status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
          }
        }
      }

      const themeCode = assessment.payload.theme_code;
      const topicCode = assessment.payload.topic_code;
      
      // Resolve level UUID -> integer level_number (vocabulary_vault.target_level is INTEGER).
      // Vault queries MUST be scoped to this level or cumulative themes would bleed across levels.
      let levelNum = 1;
      if (assessment.level_id) {
        const { data: levelRec } = await supabase
          .from('levels')
          .select('level_number')
          .eq('id', assessment.level_id)
          .single();
        if (levelRec?.level_number) levelNum = levelRec.level_number;
      }

      let query = supabase.from("vocabulary_vault").select("*").is("deleted_at", null).eq("target_level", levelNum).range(0, 4999);
      
      const themes = assessment.payload.themes;
      // Cumulative Themes Logic for TESTS
      if (themes && Array.isArray(themes) && themes.length > 0) {
          query = query.in("theme_code", themes);
      } else if (assessment.assessment_category === 'TEST' && themeCode) {
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
      
      const { data: vaultData, error: vErr } = await query;
      if (vErr) {
        console.error("Failed to load vault words:", vErr);
      }
      
      let vaultWords = vaultData || [];
      const category = assessment.payload.category || 'vocab';
      vaultWords = vaultWords.filter((w: any) => {
         const wt = (w.word_type || '').toLowerCase();
         const isPhrase = ['expression', 'idiom', 'proverb', 'phrase'].includes(wt);
         return category === 'phrases' ? isPhrase : !isPhrase;
      });

      let dynamicAnswerType = assessment.payload.answer_type || ((assessment.answer_type && assessment.answer_type !== 'MULTIPLE_CHOICE') ? assessment.answer_type : null) || 'written';
      if (!assessment.payload.answer_type && !(assessment.answer_type && assessment.answer_type !== 'MULTIPLE_CHOICE')) {
         if (assessment.assessment_type === 'VOCAB_TASK') dynamicAnswerType = 'speech_to_text';
         else if (assessment.assessment_type === 'VOCAB_TEST') dynamicAnswerType = 'written';
         else if (assessment.assessment_type === 'PHRASE_TASK' || assessment.assessment_type === 'PHRASE_TEST') dynamicAnswerType = 'dropdown';
      }
      
      if (vaultWords && vaultWords.length > 0) {
        vaultWords.sort((a: any, b: any) => (a.indonesian || "").localeCompare(b.indonesian || ""));
        
        let distractorPool: any[] = [];
        if (dynamicAnswerType === 'dropdown') {
            let distractorQuery = supabase.from('vocabulary_vault')
                .select('english, word_type')
                .eq('target_level', levelNum)
                .is('deleted_at', null)
                .range(0, 4999);

            const { data: allPhraseData } = await distractorQuery;
            if (allPhraseData) {
                const phraseTypes = ['expression', 'idiom', 'proverb', 'phrase'];
                const isPhraseMode = category === 'phrases' || assessment.assessment_type === 'PHRASE_TASK' || assessment.assessment_type === 'PHRASE_TEST';
                
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
             
             if (dynamicAnswerType === 'dropdown') {
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
                 question_text_snapshot: vw.indonesian || "N/A",
                 accepted_answers_snapshot: accepted,
                 options_snapshot: options ? options : null, // Not JSON stringified to match expected array structure
                 topic_snapshot: vw.topic || vw.topic_code || "General",
                 word_type_snapshot: vw.word_type,
                 display_order: idx + 1,
                 answer_type: dynamicAnswerType
             };
        });
      }
    } else {
      const { data } = await supabase
      .from("assessment_questions")
      .select("*")
      .eq("assessment_id", assessment_id)
      .order("display_order");
      snapQuestions = data || [];
    }

    // Fallback to legacy questions if snapshot not populated yet
    if (!snapQuestions || snapQuestions.length === 0) {
      const { data: legacyQ } = await supabase
        .from("questions")
        .select("*")
        .eq("assessment_id", assessment_id)
        .is("deleted_at", null);
      if (legacyQ && legacyQ.length > 0) {
        snapQuestions = legacyQ.map((q: any, idx: number) => ({
          question_id: q.id,
          question_text_snapshot: q.question_text,
          accepted_answers_snapshot: q.accepted_answers || [q.correct_answer],
          topic_snapshot: 'General',
          word_type_snapshot: q.word_type || null,
          display_order: idx + 1
        }));
      }
    }

    if (!snapQuestions || snapQuestions.length === 0) {
      return new Response(JSON.stringify({ error: "Assessment has no questions available." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Randomize order if configured
    if (assessment.question_order === 'RANDOM') {
      snapQuestions.sort(() => Math.random() - 0.5);
    }

    // 9. Create New Attempt
    let durationMinutes = assessment.working_duration_minutes || assessment.time_limit_minutes || 60;
    let expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    // Hard Deadline for EXAM and QUIZ types
    if (assessment.assessment_type === 'EXAM' || assessment.assessment_type === 'QUIZ') {
      if (effectiveEnd) {
        expiresAt = new Date(effectiveEnd);
      }
      durationMinutes = 0; // Not duration-based
    } else if (assessment.assessment_type === 'TASK') {
      // TASKS have no duration limit; set expiry 10 years in future
      expiresAt = new Date(now.getTime() + 10 * 365 * 24 * 3600 * 1000);
      durationMinutes = 0;
    }

    const attemptPayload: any = {
      student_id,
      started_at: now.toISOString(),
      status: "in_progress",
      score: 0,
      percentage: 0,
      total_questions: snapQuestions.length
    };

    // Include both column variants for seamless database schema compatibility
    attemptPayload.assessment_id = assessment_id;
    attemptPayload.expires_at = expiresAt.toISOString();


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
        question_text: sq.question_text_snapshot,
        word_type: sq.word_type_snapshot,
        topic: sq.topic_snapshot,
        display_order: sq.display_order,
        answer_type: sq.answer_type || 'written',
        options_snapshot: sq.options_snapshot || []
      },
      topic_snapshot: sq.topic_snapshot,
      question_type_snapshot: sq.word_type_snapshot,
      accepted_answers_snapshot: sq.accepted_answers_snapshot,
      correct_answer_snapshot: Array.isArray(sq.accepted_answers_snapshot) ? sq.accepted_answers_snapshot.join(';') : String(sq.accepted_answers_snapshot || ''),
      student_answer: null,
      score: 0
    }));

    // Batch insertion in chunks of 100 (avoids Edge Function timeouts on 640-item cumulative tests)
    const insertedAnswers: any[] = [];
    for (let i = 0; i < answerInserts.length; i += 100) {
      const chunk = answerInserts.slice(i, i + 100);
      const { data: chunkRows, error: insAnsErr } = await supabase
        .from("attempt_answers")
        .insert(chunk)
        .select("id, question_id, question_snapshot, topic_snapshot, question_type_snapshot, student_answer, score");
      if (insAnsErr) {
        // Roll back the half-created attempt so a refresh does not resume a broken snapshot
        await supabase.from("attempt_answers").delete().eq("attempt_id", newAttempt.id);
        await supabase.from("attempts").delete().eq("id", newAttempt.id);
        throw insAnsErr;
      }
      if (chunkRows) insertedAnswers.push(...chunkRows);
    }

    // Return to client WITHOUT exposing accepted_answers_snapshot
    return new Response(JSON.stringify({
      attempt: newAttempt,
      answers: insertedAnswers || [],
      resumed: false,
      assessment: {
        id: assessment.id,
        title: assessment.title,
        assessment_type: assessment.assessment_type,
        working_duration_minutes: durationMinutes
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("start-Assessment error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

