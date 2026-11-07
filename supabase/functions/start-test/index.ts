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

    let testProgramId = test.program_id;
    if (!testProgramId && test.class_id) {
      const { data: clsRec } = await supabase.from("classes").select("program_id").eq("id", test.class_id).maybeSingle();
      if (clsRec?.program_id) testProgramId = clsRec.program_id;
    }

    // Fallback: If no explicit assignment rules exist, allow if institution and program match
    if (!isEligible && (!assignments || assignments.length === 0)) {
      const instMatch = !test.institution_id || !student.institution_id || test.institution_id === student.institution_id;
      const progMatch = !testProgramId || !student.program_id || testProgramId === student.program_id;
      if (instMatch && progMatch) {
        isEligible = true;
      }
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
          .select("effective_score, percentage, status, is_remedial_unlocked, is_forgiven")
          .eq("student_id", student_id)
          .eq("test_id", prereqId)
          .in("status", ["submitted", "auto_submitted", "evaluated", "SUBMITTED", "AUTO_SUBMITTED", "EVALUATED"]),
        supabase
          .from("tests")
          .select("id, payload, test_type, test_subtype, category, shell_code, title")
          .eq("id", prereqId)
          .single()
      ]);
      const prereqAttempts = prereqAttRes.data || [];
      const prereqTest = prereqTestRes.data;

      const reqScore = test.prerequisite_min_score || prereqTest?.minimum_required_score || 50;
      const isPrereqExam = (prereqTest?.test_type || '').toLowerCase() === 'exam' ||
                           (prereqTest?.category || '').toUpperCase() === 'EXAM' ||
                           (prereqTest?.shell_code || '').toUpperCase().endsWith('-EXAM');

      let passCount = 0;
      (prereqAttempts || []).forEach((a: any) => {
        if (a.is_forgiven) {
          passCount = Math.max(passCount, 7);
        } else {
          const pct = a.effective_score != null ? Number(a.effective_score) : Number(a.percentage || 0);
          if (pct >= reqScore || (a.is_remedial_unlocked && pct >= 60)) {
            passCount++;
          }
        }
      });

      const requiredPasses = isPrereqExam ? 1 : 7;
      if (passCount < requiredPasses) {
        return new Response(JSON.stringify({
          error: `Prerequisite not completed. You must achieve 7×7 Repetitive Mastery (${passCount}/${requiredPasses} passes with at least ${reqScore}%) on "${prereqTest?.title || 'the prerequisite task'}" before starting this test.`
        }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // 5b. Strict Cross-Theme Prerequisite: Taking ANY test in Theme B, C, or D requires passing prior theme's exams with >= 70%
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
        .neq('id', test.id);

      const matchingPriorExams = (priorExams || []).filter((t: any) => {
        const tc = t.payload?.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : '');
        return String(tc).toUpperCase() === priorTheme;
      });

      if (matchingPriorExams.length > 0) {
        const priorExamIds = matchingPriorExams.map((t: any) => t.id);
        const { data: priorAttempts } = await supabase
          .from('attempts')
          .select('test_id, percentage, effective_score, status, is_remedial_unlocked, is_forgiven')
          .eq('student_id', student_id)
          .in('test_id', priorExamIds)
          .in('status', ["submitted", "auto_submitted", "evaluated", "SUBMITTED", "AUTO_SUBMITTED", "EVALUATED"]);

        const passedPriorIds = new Set();
        (priorAttempts || []).forEach((att: any) => {
          const pe = matchingPriorExams.find((e: any) => e.id === att.test_id);
          const reqScore = Number(pe?.minimum_required_score) || Number(pe?.payload?.min_score) || 60;
          const pct = att.effective_score != null ? Number(att.effective_score) : Number(att.percentage || 0);
          if (pct >= reqScore || att.is_remedial_unlocked || att.is_forgiven) {
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
      // Level 0 (Alumni) has universal lifetime access across all levels.
      // Active students (Level >= 1) have Cumulative Retroactive Access: they can take any test where testLevelNum <= studentLevelNum.
      if (!isStandaloneTryout && studentLevelNum !== null && testLevelNum !== null) {
        if (studentLevelNum !== 0 && testLevelNum > studentLevelNum) {
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
            return new Response(JSON.stringify({ error: "This test session has not been opened by the Tutor yet." }), {
              status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          if (!isWhitelisted) {
            return new Response(JSON.stringify({ error: "You are not on the attendance whitelist for today's test session." }), {
              status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        }

        // 2. Strict Prerequisite Tasks check: Must pass ALL theme tasks 7 times >= 70% (7×7 Mastery)
        // Exempt authorized remedial attempts
        const isStudentRemedialAuthorized = isRemedialSession ||
          (Array.isArray(liveSession?.remedial_student_ids) && liveSession.remedial_student_ids.includes(student_id));
        const themeCode = test.payload?.theme_code;
        const isExamTest = (test.test_type || '').toLowerCase() === 'exam' ||
                           test.category === 'EXAM' ||
                           (test.shell_code || '').endsWith('-EXAM');
        const topicCode = test.payload?.topic_code;
        const topicNum = parseInt(String(topicCode || '').replace(/^[A-Za-z]+/, ''), 10);

        if (isExamTest && themeCode && !isStudentRemedialAuthorized) {
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
              .select('test_id, percentage, effective_score, status, is_forgiven')
              .eq('student_id', student_id)
              .in('test_id', priorTaskIds)
              .in('status', ["submitted", "auto_submitted", "evaluated", "SUBMITTED", "AUTO_SUBMITTED", "EVALUATED"]);

            const taskMap: Record<string, any> = Object.fromEntries(filteredPriorTasks.map((t: any) => [t.id, t]));
            const passCountByTask: Record<string, number> = {};
            if (priorAttempts) {
              priorAttempts.forEach((att: any) => {
                if (att.is_forgiven) {
                  passCountByTask[att.test_id] = Math.max(passCountByTask[att.test_id] || 0, 7);
                } else {
                  const pct = att.effective_score != null ? Number(att.effective_score) : Number(att.percentage || 0);
                  const minReq = Number(taskMap[att.test_id]?.minimum_required_score || taskMap[att.test_id]?.payload?.min_score || 50);
                  if (pct >= minReq) {
                    passCountByTask[att.test_id] = (passCountByTask[att.test_id] || 0) + 1;
                  }
                }
              });
            }

            const unmasteredTask = filteredPriorTasks.find((t: any) => (passCountByTask[t.id] || 0) < 7);
            if (unmasteredTask) {
              const unmasteredMin = unmasteredTask.minimum_required_score || unmasteredTask.payload?.min_score || 50;
              return new Response(JSON.stringify({
                error: `Prerequisite not completed. You must achieve 7×7 Repetitive Mastery (7 passes with at least ${unmasteredMin}%) on Topic ${themeCode}${priorTopicNum} before starting Topic ${topicNum}.`
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
        if (levelRec?.level_number) levelNum = levelRec.level_number;
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
      } else if (themes && Array.isArray(themes) && themes.length > 0) {
          query = query.in("theme_code", themes);
      } else if (isThemeTest && themeCode) {
          const allThemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
          const idx = allThemes.indexOf(String(themeCode).toUpperCase());
          if (idx !== -1) {
              const targetThemes = allThemes.slice(0, idx + 1);
              query = query.in("theme_code", targetThemes);
          } else {
              query = query.eq("theme_code", themeCode);
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

      let dynamicAnswerType = ((test.answer_type && test.answer_type !== 'MULTIPLE_CHOICE') ? test.answer_type : null) || test.payload?.answer_type || (test.test_subtype === 'PHRASE_TEST' ? 'selection' : 'spoken');
      if (!test.payload?.answer_type && !(test.answer_type && test.answer_type !== 'MULTIPLE_CHOICE')) {
         if (test.test_subtype === 'VOCAB_TASK' || test.test_subtype === 'PHRASE_TASK') dynamicAnswerType = 'spoken';
         else if (test.test_subtype === 'VOCAB_TEST') dynamicAnswerType = 'spoken';
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
        answer_type: sq.answer_type || dynamicAnswerType || 'spoken',
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
