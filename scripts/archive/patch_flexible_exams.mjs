import fs from 'fs';

// 1. Patch supabase/functions/start-test/index.ts
let edgePath = 'supabase/functions/start-test/index.ts';
let edgeCode = fs.readFileSync(edgePath, 'utf-8');

const edgeTarget = `      // Validation: Strict Theme Prerequisites for Exams (Must pass ALL sibling quizzes with >= 60%)
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
        }`;

const edgeReplacement = `      // Validation: Strict Theme Prerequisites for Exams
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
        }`;

edgeCode = edgeCode.replace(edgeTarget.replace(/\r\n/g, '\n'), edgeReplacement);
fs.writeFileSync(edgePath, edgeCode, 'utf-8');
console.log('Patched supabase/functions/start-test/index.ts for flexible exams!');

// 2. Patch js/api.js
let apiPath = 'js/api.js';
let apiCode = fs.readFileSync(apiPath, 'utf-8');

const apiTarget1 = `  let activeSession = null;
  if (isFormalExam) {
    const accessCheck = await checkStudentTestAccess(studentId, testId);`;

const apiReplacement1 = `  let activeSession = null;
  const isFlexible = (asmData.schedule_mode || asmData.payload?.schedule_mode) === 'flexible';
  if (isFormalExam && !isFlexible && (asmData.schedule_mode === 'strict' || asmData.payload?.test_session)) {
    const accessCheck = await checkStudentTestAccess(studentId, testId);`;

const apiTarget2 = `  if (!isFormalExam) {
    return { allowed: true, is_test: false };
  }

  const session = asm.payload?.test_session;`;

const apiReplacement2 = `  if (!isFormalExam) {
    return { allowed: true, is_test: false };
  }

  const isFlexible = (asm.schedule_mode || asm.payload?.schedule_mode) === 'flexible';
  if (isFlexible) {
    return { allowed: true, is_test: true, is_flexible: true };
  }

  const session = asm.payload?.test_session;`;

apiCode = apiCode.replace(apiTarget1.replace(/\r\n/g, '\n'), apiReplacement1);
apiCode = apiCode.replace(apiTarget2.replace(/\r\n/g, '\n'), apiReplacement2);
fs.writeFileSync(apiPath, apiCode, 'utf-8');
console.log('Patched js/api.js for flexible exams!');

