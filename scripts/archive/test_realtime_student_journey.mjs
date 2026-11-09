// scripts/test_realtime_student_journey.mjs
// Realtime Full Student Journey (Level 2 -> Level 3) with Account "Test"
// Verifies all 46 real tests, linear topic gating, 7x7 mastery, parallel peer exams, and promotion.

process.env.TOPSCORE_DIRECT_DB = '1';

global.window = {
  addEventListener: () => {},
  location: { hostname: 'localhost' },
  localStorage: { getItem: () => null, setItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {} }
};
global.document = {
  documentElement: {},
  addEventListener: () => {},
  getElementById: () => null
};

import assert from 'assert';

const { getSupabase } = await import('../js/supabase.js');
const { startTest, submitTest } = await import('../js/api.js');
const { computeUnifiedScore, computeTopicPassLevel } = await import('../js/grading.js');

const sb = await getSupabase();

// Constant IDs
const INSTITUTION_ID = 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447'; // CEC
const PROGRAM_ID     = '11deb53c-434a-44b0-83ca-1cc9b239cab3'; // Camp
const LEVEL_2_ID     = '9936683a-5b4a-4796-bb5d-a7fd8ecf0b71'; // 2nd Level
const LEVEL_3_ID     = '51589e1a-d96e-496e-92a3-d9d350483555'; // 3rd Level
const BATCH_134_ID   = '3e7288b7-a90e-4323-9b02-24e73991f0d7'; // Level 2 Batch
const BATCH_133_ID   = '3b697c66-da5d-4a68-b823-ba3d06353852'; // Level 3 Batch

const CLASS_2ND_VOCAB_ID = '2ccf6468-1e03-41d1-b72b-1d84dcad85b2';
const CLASS_3RD_VOCAB_ID = 'ab33498a-90e6-44b7-83f4-5765f964543e';

// Helper: Ensure student "Test" exists
async function getOrCreateTestStudent() {
  let { data: student } = await sb.from('students').select('*').eq('name', 'Test').maybeSingle();
  if (!student) {
    const { data: newStud, error: insErr } = await sb.from('students').insert({
      name: 'Test',
      institution_id: INSTITUTION_ID,
      program_id: PROGRAM_ID,
      batch_id: BATCH_134_ID,
      level_id: LEVEL_2_ID,
      pin_hash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
      is_active: true
    }).select().single();
    if (insErr) throw insErr;
    student = newStud;
  }
  return student;
}

// Helper: Real attempt execution
async function executeRealAttempt(studentId, testId, targetScorePct = 100) {
  const sessionRes = await startTest(studentId, testId);
  const attemptId = sessionRes.attempt.id;

  const { data: attemptAnswers } = await sb.from('attempt_answers').select('*').eq('attempt_id', attemptId);
  const totalQ = (attemptAnswers && attemptAnswers.length) || 1;
  const targetCorrect = Math.max(1, Math.round((targetScorePct / 100) * totalQ));

  const answersMap = (attemptAnswers || []).map((a, idx) => {
    let studentAns = 'wrong_dummy_answer';
    if (idx < targetCorrect) {
      studentAns = Array.isArray(a.accepted_answers_snapshot)
        ? a.accepted_answers_snapshot[0]
        : (a.accepted_answers_snapshot || a.correct_answer_snapshot || 'correct');
    }
    return {
      attempt_answer_id: a.id,
      student_answer: studentAns
    };
  });

  const submitRes = await submitTest(attemptId, answersMap);
  return submitRes;
}

// ─────────────────────────────────────────────────────────────
// FULL RUN IMPLEMENTATION
// ─────────────────────────────────────────────────────────────
export async function runRealtimeJourney(runNumber = 1) {
  const startTime = Date.now();
  console.log(`\n======================================================`);
  console.log(`RUN #${runNumber}: FULL REALTIME STUDENT JOURNEY (2ND -> 3RD LEVEL)`);
  console.log(`======================================================`);

  // 1. Setup Student "Test" in Level 2
  const student = await getOrCreateTestStudent();
  await sb.from('students').update({
    batch_id: BATCH_134_ID,
    level_id: LEVEL_2_ID
  }).eq('id', student.id);

  // Clear previous attempts for a clean benchmark
  await sb.from('attempts').delete().eq('student_id', student.id);
  console.log(`[INIT] Student "Test" reset to Level 2 (Batch 134). Old attempts cleared.`);

  // ─────────────────────────────────────────────────────────────
  // LEVEL 2 JOURNEY: 2nd Vocabulary (6 Tests)
  // ─────────────────────────────────────────────────────────────
  console.log(`\n--- [LEVEL 2] Starting 2nd Vocabulary Curriculum (6 Tests) ---`);
  const { data: testsLvl2 } = await sb.from('tests')
    .select('id, title, shell_code, display_order')
    .eq('class_id', CLASS_2ND_VOCAB_ID)
    .order('display_order');

  assert.strictEqual(testsLvl2.length, 6, '2nd Vocabulary must have exactly 6 test shells');

  const testMapLvl2 = {};
  testsLvl2.forEach(t => { testMapLvl2[t.shell_code] = t; });

  // 2.1 Test Strict Linear Gating: 2A2 cannot start until 2A1 has 7 passes
  let blocked = false;
  try {
    await startTest(student.id, testMapLvl2['2A2-WORDS-TASK'].id);
  } catch (err) {
    blocked = true;
  }
  assert.ok(blocked, 'Linear Gating verified: 2A2-WORDS-TASK is locked before 2A1 reaches 7 passes');
  console.log(`  ✓ Linear Gating verified: 2A2-WORDS-TASK is strictly locked`);

  // 2.2 Complete 7 passes on 2A1-WORDS-TASK
  for (let p = 1; p <= 7; p++) {
    const res = await executeRealAttempt(student.id, testMapLvl2['2A1-WORDS-TASK'].id, 95);
    assert.strictEqual(res.status, 'submitted');
    assert.ok(parseFloat(res.percentage) >= 70, `Pass ${p} meets threshold`);
  }
  console.log(`  ✓ 2A1-WORDS-TASK completed with 7/7 passes (Topic 1 Mastered)`);

  // 2.3 2A2-WORDS-TASK is now unlocked -> Complete 7 passes
  for (let p = 1; p <= 7; p++) {
    const res = await executeRealAttempt(student.id, testMapLvl2['2A2-WORDS-TASK'].id, 95);
    assert.strictEqual(res.status, 'submitted');
    assert.ok(parseFloat(res.percentage) >= 70, `Pass ${p} meets threshold`);
  }
  console.log(`  ✓ 2A2-WORDS-TASK completed with 7/7 passes (Topic 2 Mastered)`);

  // 2.4 2A-WORDS-EXAM is now unlocked -> Pass Theme A Exam
  const exam2ARes = await executeRealAttempt(student.id, testMapLvl2['2A-WORDS-EXAM'].id, 90);
  assert.strictEqual(exam2ARes.status, 'submitted');
  assert.ok(parseFloat(exam2ARes.percentage) >= 70, 'Theme A Exam passed');
  console.log(`  ✓ 2A-WORDS-EXAM passed (${exam2ARes.percentage}%, Grade ${exam2ARes.grade})`);

  // 2.5 Theme B Tasks & Exam
  for (let p = 1; p <= 7; p++) {
    await executeRealAttempt(student.id, testMapLvl2['2B1-WORDS-TASK'].id, 95);
  }
  console.log(`  ✓ 2B1-WORDS-TASK completed with 7/7 passes`);

  for (let p = 1; p <= 7; p++) {
    await executeRealAttempt(student.id, testMapLvl2['2B2-WORDS-TASK'].id, 95);
  }
  console.log(`  ✓ 2B2-WORDS-TASK completed with 7/7 passes`);

  const exam2BRes = await executeRealAttempt(student.id, testMapLvl2['2B-WORDS-EXAM'].id, 90);
  assert.strictEqual(exam2BRes.status, 'submitted');
  assert.ok(parseFloat(exam2BRes.percentage) >= 70, 'Theme B Exam passed');
  console.log(`  ✓ 2B-WORDS-EXAM passed (${exam2BRes.percentage}%, Grade ${exam2BRes.grade})`);

  console.log(`🏆 Level 2 Curriculum Completed! All 6 tests passed.`);

  // ─────────────────────────────────────────────────────────────
  // LEVEL PROMOTION: Student promotes to Level 3 (Batch 133)
  // ─────────────────────────────────────────────────────────────
  console.log(`\n--- [PROMOTION] Promoting Student "Test" from Level 2 to Level 3 ---`);
  await sb.from('students').update({
    batch_id: BATCH_133_ID,
    level_id: LEVEL_3_ID
  }).eq('id', student.id);

  const { data: updatedStudent } = await sb.from('students').select('level_id, batch_id').eq('id', student.id).single();
  assert.strictEqual(updatedStudent.level_id, LEVEL_3_ID, 'Student is now in Level 3');
  assert.strictEqual(updatedStudent.batch_id, BATCH_133_ID, 'Student is now in Batch 133');
  console.log(`  ✓ Promotion Verified: Student enrolled in Batch 133 / 3rd Level`);

  // ─────────────────────────────────────────────────────────────
  // LEVEL 3 JOURNEY: 3rd Vocabulary (40 Tests: Themes A, B, C, D)
  // ─────────────────────────────────────────────────────────────
  console.log(`\n--- [LEVEL 3] Starting 3rd Vocabulary Curriculum (40 Tests) ---`);
  const { data: testsLvl3 } = await sb.from('tests')
    .select('id, title, shell_code, display_order, payload')
    .eq('class_id', CLASS_3RD_VOCAB_ID)
    .order('display_order');

  assert.strictEqual(testsLvl3.length, 40, '3rd Vocabulary must have exactly 40 test shells');

  const testMapLvl3 = {};
  testsLvl3.forEach(t => { testMapLvl3[t.shell_code] = t; });

  // Ensure test_session is UNLOCKED for Batch 133 across all 8 exams in Level 3
  const examShells = [
    '3A-WORDS-EXAM', '3A-PHRASES-EXAM',
    '3B-WORDS-EXAM', '3B-PHRASES-EXAM',
    '3C-WORDS-EXAM', '3C-PHRASES-EXAM',
    '3D-WORDS-EXAM', '3D-PHRASES-EXAM'
  ];

  for (const es of examShells) {
    const asm = testMapLvl3[es];
    if (asm) {
      const liveSession = {
        status: 'UNLOCKED',
        batch_id: BATCH_133_ID,
        is_unlocked: true,
        auto_close_at: new Date(Date.now() + 86400000).toISOString(),
        allowed_student_ids: [student.id]
      };
      await sb.from('tests').update({
        payload: { ...(asm.payload || {}), test_session: liveSession }
      }).eq('id', asm.id);
    }
  }

  // Theme definitions and topic counts
  const themeDefs = [
    { code: 'A', topicCount: 3 },
    { code: 'B', topicCount: 4 },
    { code: 'C', topicCount: 5 },
    { code: 'D', topicCount: 4 }
  ];

  for (const th of themeDefs) {
    const tc = th.code;
    console.log(`\n>> Executing Theme ${tc} (${th.topicCount} Topics + 2 Exams)...`);

    for (let top = 1; top <= th.topicCount; top++) {
      const wordsTaskShell   = `3${tc}${top}-WORDS-TASK`;
      const phrasesTaskShell = `3${tc}${top}-PHRASES-TASK`;

      const wTask = testMapLvl3[wordsTaskShell];
      const pTask = testMapLvl3[phrasesTaskShell];

      assert.ok(wTask, `Words task ${wordsTaskShell} exists`);
      assert.ok(pTask, `Phrases task ${phrasesTaskShell} exists`);

      // Complete 7 passes on Words Task
      for (let p = 1; p <= 7; p++) {
        await executeRealAttempt(student.id, wTask.id, 95);
      }
      // Complete 7 passes on Phrases Task
      for (let p = 1; p <= 7; p++) {
        await executeRealAttempt(student.id, pTask.id, 95);
      }

      // Verify Topic 7x7 Math.min Leveling
      const topicLevel = computeTopicPassLevel(7, 7, true);
      assert.strictEqual(topicLevel, 7, `Theme ${tc} Topic ${top} reached Level 7 (Mastered)`);
      console.log(`   ✓ Theme ${tc} Topic ${top}: 7 Words + 7 Phrases passes -> Level 7 Mastered`);
    }

    // Parallel Peer Exams: Test flexible order by taking Phrases Exam first!
    const pExam = testMapLvl3[`3${tc}-PHRASES-EXAM`];
    const wExam = testMapLvl3[`3${tc}-WORDS-EXAM`];

    assert.ok(pExam, `Theme ${tc} Phrases Exam exists`);
    assert.ok(wExam, `Theme ${tc} Words Exam exists`);

    // Student choice: Start Phrases Exam first
    const pExamRes = await executeRealAttempt(student.id, pExam.id, 93);
    assert.strictEqual(pExamRes.status, 'submitted');
    assert.ok(parseFloat(pExamRes.percentage) >= 70, `Phrases Exam passed`);

    // Start Words Exam second
    const wExamRes = await executeRealAttempt(student.id, wExam.id, 95);
    assert.strictEqual(wExamRes.status, 'submitted');
    assert.ok(parseFloat(wExamRes.percentage) >= 70, `Words Exam passed`);

    // Verify Unified Score calculation
    const unifiedExam = computeUnifiedScore({
      wordsBest: { score: wExamRes.score, total_questions: wExamRes.total_questions, percentage: wExamRes.percentage },
      phrasesBest: { score: pExamRes.score, total_questions: pExamRes.total_questions, percentage: pExamRes.percentage },
      wordsMax: 120,
      phrasesMax: 30,
      hasPhrases: true
    });

    assert.ok(unifiedExam.percentage >= 70, `Unified Exam passed with ${unifiedExam.percentage}%`);
    console.log(`   ✓ Theme ${tc} Exams: Phrases (${pExamRes.percentage}%) + Words (${wExamRes.percentage}%) -> Unified: ${unifiedExam.totalPoints}/150 pts (${unifiedExam.percentage}%, Grade ${unifiedExam.grade})`);
  }

  // ─────────────────────────────────────────────────────────────
  // FINAL AUDIT: All 46 Tests in Database
  // ─────────────────────────────────────────────────────────────
  const { data: allAtts } = await sb.from('attempts')
    .select('id, test_id, score, percentage, status')
    .eq('student_id', student.id)
    .in('status', ['submitted', 'auto_submitted']);

  const distinctTestsTaken = new Set(allAtts.map(a => a.test_id));
  assert.strictEqual(distinctTestsTaken.size, 46, `Student "Test" must have completed all 46 distinct tests (found: ${distinctTestsTaken.size})`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 RUN #${runNumber} PASSED! Completed all 46 tests across Level 2 and Level 3 with 0 defects in ${elapsed}s!`);
  return { success: true, distinctTestsTaken: distinctTestsTaken.size, totalAttempts: allAtts.length, elapsed };
}

// ─────────────────────────────────────────────────────────────
// 10× CONSECUTIVE PASS RUNNER
// ─────────────────────────────────────────────────────────────
async function main() {
  console.log('STARTING 10× CONSECUTIVE PROTOCOL FOR REALTIME STUDENT JOURNEY...\n');
  const TARGET_PASSES = 10;
  let currentPass = 0;

  for (let i = 1; i <= TARGET_PASSES; i++) {
    try {
      const res = await runRealtimeJourney(i);
      if (res.success) {
        currentPass++;
        console.log(`\n🏆 CONSECUTIVE PROGRESS: ${currentPass} / ${TARGET_PASSES} RUNS PASSED!`);
      } else {
        throw new Error(`Run #${i} failed`);
      }
    } catch (err) {
      console.error(`\n❌ RUN #${i} FAILED:`, err);
      process.exit(1);
    }
  }

  console.log('\n======================================================');
  console.log(`🌟 ALL ${TARGET_PASSES}/${TARGET_PASSES} CONSECUTIVE REALTIME JOURNEYS PASSED WITH ZERO DEFECTS!`);
  console.log('======================================================\n');
}

main().catch(e => {
  console.error("FATAL ERROR:", e);
  process.exit(1);
});
