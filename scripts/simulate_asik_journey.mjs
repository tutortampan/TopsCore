import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

const ASIK_ID = '0694c6f5-076c-43d1-99ee-0a8800975bcb';
const BATCH_123_ID = 'ae6b427e-767a-447b-ba55-e83b58986ae1';
const CAMP_PROGRAM_ID = '11deb53c-434a-44b0-83ca-1cc9b239cab3';

const LEVELS = {
  LEVEL_1: '100120f3-ab12-4589-99da-cf65d11436b1',
  LEVEL_2: '9936683a-5b4a-4796-bb5d-a7fd8ecf0b71',
  LEVEL_3: '51589e1a-d96e-496e-92a3-d9d350483555',
  ALUMNI:  'b70a0ea2-785d-4291-9adf-a4cbd7a2c9a2'
};

const CLASSES = {
  CAMP_1VOCAB: '9b27101a-efa4-4bd8-b399-45592fdad7e0',
  CAMP_2VOCAB: '2ccf6468-1e03-41d1-b72b-1d84dcad85b2',
  CAMP_3VOCAB: 'ab33498a-90e6-44b7-83f4-5765f964543e'
};

async function prepareExamSession(api, testId, batchId) {
  try {
    await api.openTestSession({
      testId,
      batchId,
      allocatedMinutes: 180,
      allowedStudentIds: []
    });
  } catch (err) {
    // If not strict session, continue
  }
}

async function simulateTakeTest(api, studentId, testId, targetScorePct) {
  // 1. Start test attempt
  const startResult = await api.startTest(studentId, testId);
  const attempt = startResult.attempt;

  if (!attempt || !attempt.id) {
    throw new Error(`Failed to create attempt for test ${testId}: ${JSON.stringify(startResult)}`);
  }

  // 2. Fetch answers with accepted_answers_snapshot
  const { data: dbAnswers, error: ansErr } = await sb.from('attempt_answers')
    .select('id, accepted_answers_snapshot')
    .eq('attempt_id', attempt.id);

  if (ansErr || !dbAnswers || dbAnswers.length === 0) {
    throw new Error(`Failed to retrieve attempt_answers for attempt ${attempt.id}`);
  }

  // 3. Form answers to achieve targetScorePct
  const totalQ = dbAnswers.length;
  const numCorrect = Math.max(1, Math.min(totalQ, Math.round((targetScorePct / 100) * totalQ)));
  const answersMap = dbAnswers.map((ans, idx) => {
    const accepted = ans.accepted_answers_snapshot || [];
    const correctVal = accepted[0] || 'correct';
    return {
      attempt_answer_id: ans.id,
      student_answer: idx < numCorrect ? correctVal : 'wrong answer'
    };
  });

  // 4. Submit test attempt
  const submitResult = await api.submitTest(attempt.id, answersMap);
  return {
    attemptId: attempt.id,
    totalQuestions: totalQ,
    correctCount: numCorrect,
    score: submitResult.score ?? numCorrect,
    percentage: submitResult.percentage,
    grade: submitResult.grade
  };
}

async function simulateTaskRepetitions(api, studentId, testId, testCode, targetReps = 7) {
  const scores = [65, 75, 80, 85, 90, 95, 100];
  let finalRes = null;
  for (let rep = 1; rep <= targetReps; rep++) {
    const targetScore = scores[(rep - 1) % scores.length];
    finalRes = await simulateTakeTest(api, studentId, testId, targetScore);
  }
  console.log(`   [TASK] ${testCode.padEnd(28)} | ${targetReps}×7 Passes Done | Best Score: ${finalRes.score}/${finalRes.totalQuestions} (${finalRes.percentage}%) | Grade: ${finalRes.grade}`);
  return finalRes;
}

async function main() {
  console.log('======================================================================');
  console.log('🎓 TOPSCORE ACADEMIC SIMULATION: STUDENT ASIK -> BATCH 123 -> ALUMNI');
  console.log('======================================================================\n');

  const api = await import('../js/api.js');
  const findings = [];

  // =====================================================================
  // PHASE 0: ENROLL ASIK IN BATCH 123 AT 1ST LEVEL
  // =====================================================================
  console.log('--- PHASE 0: ENROLLMENT & CLEAN STATE SETUP ---');

  // Activate Batch 123 and set to 1st Level
  await sb.from('batches').update({
    is_active: true,
    current_level_id: LEVELS.LEVEL_1,
    program_id: CAMP_PROGRAM_ID
  }).eq('id', BATCH_123_ID);

  // Enroll Asik into Batch 123 at 1st Level
  await sb.from('students').update({
    batch_id: BATCH_123_ID,
    level_id: LEVELS.LEVEL_1,
    program_status: 'ACTIVE',
    is_active: true
  }).eq('id', ASIK_ID);

  // Activate Camp 1st Vocabulary
  await sb.from('classes').update({ is_active: true }).eq('id', CLASSES.CAMP_1VOCAB);

  // Delete previous test attempts for clean slate
  const { data: oldAttempts } = await sb.from('attempts').select('id').eq('student_id', ASIK_ID);
  if (oldAttempts && oldAttempts.length > 0) {
    const oldIds = oldAttempts.map(a => a.id);
    await sb.from('attempt_answers').delete().in('attempt_id', oldIds);
    await sb.from('attempts').delete().in('id', oldIds);
    console.log(`Cleaned up ${oldAttempts.length} prior test attempts for pristine baseline.`);
  }

  // Verify setup
  const { data: student0 } = await sb.from('students').select('id, name, level_id, batch_id, program_status').eq('id', ASIK_ID).single();
  const { data: batch0 } = await sb.from('batches').select('id, name, is_active, current_level_id').eq('id', BATCH_123_ID).single();
  console.log(`✅ Student: ${student0.name} enrolled in Batch ${batch0.name} (Active: ${batch0.is_active}) at 1st Level.\n`);

  // =====================================================================
  // PHASE 1: 1ST LEVEL ACADEMIC JOURNEY
  // =====================================================================
  console.log('--- PHASE 1: 1ST LEVEL TESTS (CMP-1VOCAB) ---');

  // Task A1 (words & phrases)
  await simulateTaskRepetitions(api, ASIK_ID, 'b07e9d00-c3f2-4692-a600-ebc0ba33307b', 'CMP-1VCB-A1-TASK (words)', 7);
  await simulateTaskRepetitions(api, ASIK_ID, 'a40e1439-98dd-4105-897c-e634b930958b', 'CMP-1VCB-A1-TASK (phrases)', 7);

  // Task A2 (words & phrases)
  await simulateTaskRepetitions(api, ASIK_ID, '979ee3c7-a044-4d9c-b7c1-484d4667ceb5', 'CMP-1VCB-A2-TASK (words)', 7);
  await simulateTaskRepetitions(api, ASIK_ID, '62c9fa86-63fb-48a3-a1ba-a7b840f0ae3b', 'CMP-1VCB-A2-TASK (phrases)', 7);

  // Milestone Exams
  await prepareExamSession(api, 'd9359033-eca0-4aa3-b913-9177f3281d9e', BATCH_123_ID);
  const ex1Words = await simulateTakeTest(api, ASIK_ID, 'd9359033-eca0-4aa3-b913-9177f3281d9e', 90);
  console.log(`   [EXAM] CMP-1VCB-A-EXAM (words)      | Score: ${ex1Words.score}/${ex1Words.totalQuestions} (${ex1Words.percentage}%) | Grade: ${ex1Words.grade}`);

  await prepareExamSession(api, 'bd83d2a7-d2a6-4541-aed1-02c14d39a3c8', BATCH_123_ID);
  const ex1Phrases = await simulateTakeTest(api, ASIK_ID, 'bd83d2a7-d2a6-4541-aed1-02c14d39a3c8', 91);
  console.log(`   [EXAM] CMP-1VCB-A-EXAM (phrases)    | Score: ${ex1Phrases.score}/${ex1Phrases.totalQuestions} (${ex1Phrases.percentage}%) | Grade: ${ex1Phrases.grade}`);

  // Audit Level 1 promotion eligibility
  console.log('\n--- AUDITING LEVEL 1 ELIGIBILITY ---');
  const l1ExamsPassed = [ex1Words, ex1Phrases].every(e => e.percentage >= 60);
  console.log(`Level 1 All Exams Passed (>=60%): ${l1ExamsPassed}`);

  if (l1ExamsPassed) {
    console.log('🚀 PROMOTING ASIK & BATCH 123: 1st Level -> 2nd Level');
    await sb.from('students').update({ level_id: LEVELS.LEVEL_2 }).eq('id', ASIK_ID);
    await sb.from('batches').update({ current_level_id: LEVELS.LEVEL_2 }).eq('id', BATCH_123_ID);
    await sb.from('classes').update({ is_active: true }).eq('id', CLASSES.CAMP_2VOCAB);
    await sb.from('audit_logs').insert({
      actor_role: 'admin',
      action: 'LEVEL_PROMOTION',
      entity_type: 'students',
      entity_id: ASIK_ID,
      old_value: { level_id: LEVELS.LEVEL_1, level_number: 1 },
      new_value: { level_id: LEVELS.LEVEL_2, level_number: 2, level_name: '2nd Level', program_status: 'ACTIVE' },
      created_at: new Date().toISOString()
    });
    console.log('✅ Level 1 -> Level 2 promotion successfully recorded!\n');
  } else {
    throw new Error('Level 1 exams not passed!');
  }

  // =====================================================================
  // PHASE 2: 2ND LEVEL ACADEMIC JOURNEY
  // =====================================================================
  console.log('--- PHASE 2: 2ND LEVEL TESTS (CMP-2VOCAB) ---');

  // Theme A Exam (Public Speaking)
  await prepareExamSession(api, '9d079ecc-bc73-4d38-a5ea-2772fda350dc', BATCH_123_ID);
  const ex2A = await simulateTakeTest(api, ASIK_ID, '9d079ecc-bc73-4d38-a5ea-2772fda350dc', 92);
  console.log(`   [EXAM] CMP-2VCB-A-EXAM              | Score: ${ex2A.score}/${ex2A.totalQuestions} (${ex2A.percentage}%) | Grade: ${ex2A.grade}`);

  // Theme B Exam (Podcast)
  await prepareExamSession(api, '90308450-e456-4070-9e55-96ce2c26fa31', BATCH_123_ID);
  const ex2B = await simulateTakeTest(api, ASIK_ID, '90308450-e456-4070-9e55-96ce2c26fa31', 88);
  console.log(`   [EXAM] CMP-2VCB-B-EXAM              | Score: ${ex2B.score}/${ex2B.totalQuestions} (${ex2B.percentage}%) | Grade: ${ex2B.grade}`);

  // Theme C Tasks & Exam (Shopping Essentials)
  await simulateTaskRepetitions(api, ASIK_ID, '1667e0e0-19aa-4a34-86a7-7c1d8d4d97be', 'CMP-2VCB-C1-TASK', 7);
  await simulateTaskRepetitions(api, ASIK_ID, '93ed8f86-1427-4d04-8a97-31531fb26851', 'CMP-2VCB-C2-TASK', 7);
  await simulateTaskRepetitions(api, ASIK_ID, '8e43939e-3718-42cb-a664-eb92930cc712', 'CMP-2VCB-C3-TASK', 7);
  await simulateTaskRepetitions(api, ASIK_ID, 'b8d4c611-0e8b-4653-a30c-889a4f3a7610', 'CMP-2VCB-C4-TASK', 7);

  await prepareExamSession(api, '6705f171-7b17-48d1-9391-e301f663a411', BATCH_123_ID);
  const ex2C = await simulateTakeTest(api, ASIK_ID, '6705f171-7b17-48d1-9391-e301f663a411', 95);
  console.log(`   [EXAM] CMP-2VCB-C-EXAM              | Score: ${ex2C.score}/${ex2C.totalQuestions} (${ex2C.percentage}%) | Grade: ${ex2C.grade}`);

  // Theme D Tasks & Exam (Cooking Class)
  await simulateTaskRepetitions(api, ASIK_ID, '561b9cfe-df42-423f-9f15-1322b8c1896c', 'CMP-2VCB-D1-TASK', 7);
  await simulateTaskRepetitions(api, ASIK_ID, '31b7ac85-4c44-4a45-81d4-3a077207dc03', 'CMP-2VCB-D2-TASK', 7);
  await simulateTaskRepetitions(api, ASIK_ID, '366d5cc9-b669-4f4e-b2d6-56e00c5acafe', 'CMP-2VCB-D3-TASK', 7);
  await simulateTaskRepetitions(api, ASIK_ID, 'f8b1adfa-1d7b-4834-8d7d-e599de1ab98f', 'CMP-2VCB-D4-TASK', 7);

  await prepareExamSession(api, '726d4f15-7d75-4509-a033-f3b3f5739418', BATCH_123_ID);
  const ex2D = await simulateTakeTest(api, ASIK_ID, '726d4f15-7d75-4509-a033-f3b3f5739418', 85);
  console.log(`   [EXAM] CMP-2VCB-D-EXAM              | Score: ${ex2D.score}/${ex2D.totalQuestions} (${ex2D.percentage}%) | Grade: ${ex2D.grade}`);

  // Audit Level 2 promotion eligibility
  console.log('\n--- AUDITING LEVEL 2 ELIGIBILITY ---');
  const l2ExamsPassed = [ex2A, ex2B, ex2C, ex2D].every(e => e.percentage >= 60);
  console.log(`Level 2 All 4 Exams Passed (>=60%): ${l2ExamsPassed}`);

  if (l2ExamsPassed) {
    console.log('🚀 PROMOTING ASIK & BATCH 123: 2nd Level -> 3rd Level');
    await sb.from('students').update({ level_id: LEVELS.LEVEL_3 }).eq('id', ASIK_ID);
    await sb.from('batches').update({ current_level_id: LEVELS.LEVEL_3 }).eq('id', BATCH_123_ID);
    await sb.from('classes').update({ is_active: true }).eq('id', CLASSES.CAMP_3VOCAB);
    await sb.from('audit_logs').insert({
      actor_role: 'admin',
      action: 'LEVEL_PROMOTION',
      entity_type: 'students',
      entity_id: ASIK_ID,
      old_value: { level_id: LEVELS.LEVEL_2, level_number: 2 },
      new_value: { level_id: LEVELS.LEVEL_3, level_number: 3, level_name: '3rd Level', program_status: 'ACTIVE' },
      created_at: new Date().toISOString()
    });
    console.log('✅ Level 2 -> Level 3 promotion successfully recorded!\n');
  } else {
    throw new Error('Level 2 exams not passed!');
  }

  // =====================================================================
  // PHASE 3: 3RD LEVEL ACADEMIC JOURNEY & GRADUATION TO ALUMNI
  // =====================================================================
  console.log('--- PHASE 3: 3RD LEVEL TESTS (CMP-3VOCAB) ---');

  // Level 3 Tasks (A1 - A4)
  const t3A1 = await simulateTakeTest(api, ASIK_ID, '1f3a3ebf-5ff9-4be5-a7ca-867e922c65ec', 88);
  console.log(`   [TASK] CMP-3VCB-A1-TASK             | Score: ${t3A1.score}/${t3A1.totalQuestions} (${t3A1.percentage}%) | Grade: ${t3A1.grade}`);

  const t3A2 = await simulateTakeTest(api, ASIK_ID, 'a0dbb6a7-adfe-477c-9cba-3fb48a45d779', 96);
  console.log(`   [TASK] CMP-3VCB-A2-TASK             | Score: ${t3A2.score}/${t3A2.totalQuestions} (${t3A2.percentage}%) | Grade: ${t3A2.grade}`);

  const t3A3 = await simulateTakeTest(api, ASIK_ID, '648f292b-348e-4111-9139-cba945a2abf7', 80);
  console.log(`   [TASK] CMP-3VCB-A3-TASK             | Score: ${t3A3.score}/${t3A3.totalQuestions} (${t3A3.percentage}%) | Grade: ${t3A3.grade}`);

  const t3A4 = await simulateTakeTest(api, ASIK_ID, '6df55977-6b07-4755-9e9c-ec154b98c5ae', 100);
  console.log(`   [TASK] CMP-3VCB-A4-TASK             | Score: ${t3A4.score}/${t3A4.totalQuestions} (${t3A4.percentage}%) | Grade: ${t3A4.grade}`);

  // Milestone Exam A
  await prepareExamSession(api, '6a308fde-58c6-41a1-b58c-2c21a21ad787', BATCH_123_ID);
  const ex3A = await simulateTakeTest(api, ASIK_ID, '6a308fde-58c6-41a1-b58c-2c21a21ad787', 92);
  console.log(`   [EXAM] CMP-3VCB-A-EXAM              | Score: ${ex3A.score}/${ex3A.totalQuestions} (${ex3A.percentage}%) | Grade: ${ex3A.grade}`);

  // Audit Level 3 graduation eligibility
  console.log('\n--- AUDITING LEVEL 3 GRADUATION ELIGIBILITY ---');
  const l3ExamsPassed = ex3A.percentage >= 60;
  console.log(`Level 3 Milestone Exam Passed (>=60%): ${l3ExamsPassed}`);

  if (l3ExamsPassed) {
    console.log('🎉 GRADUATING ASIK & BATCH 123 TO ALUMNI (Level 0 / Level X)!');
    await sb.from('students').update({
      level_id: LEVELS.ALUMNI,
      program_status: 'ALUMNI'
    }).eq('id', ASIK_ID);

    await sb.from('batches').update({
      current_level_id: LEVELS.ALUMNI
    }).eq('id', BATCH_123_ID);

    await sb.from('audit_logs').insert({
      actor_role: 'admin',
      action: 'STUDENT_GRADUATED_ALUMNI',
      entity_type: 'students',
      entity_id: ASIK_ID,
      old_value: { level_id: LEVELS.LEVEL_3, level_number: 3 },
      new_value: { level_id: LEVELS.ALUMNI, level_number: 0, level_name: 'Alumni', program_status: 'ALUMNI' },
      created_at: new Date().toISOString()
    });
    console.log('🏆 Graduation to ALUMNI successfully recorded in database!\n');
  } else {
    throw new Error('Level 3 exam not passed!');
  }

  // =====================================================================
  // FINAL VERIFICATION OF ALUMNI STATE
  // =====================================================================
  console.log('======================================================================');
  console.log('🏁 FINAL AUDIT VERIFICATION');
  console.log('======================================================================');

  const { data: finalStudent } = await sb.from('students')
    .select('id, name, level_id, batch_id, program_status, levels(name, level_number), batches(name, current_level_id)')
    .eq('id', ASIK_ID)
    .single();

  console.log('Final Student Record:');
  console.log({
    name: finalStudent.name,
    program_status: finalStudent.program_status,
    level_name: finalStudent.levels?.name,
    level_number: finalStudent.levels?.level_number,
    batch_name: finalStudent.batches?.name,
    batch_level_id: finalStudent.batches?.current_level_id
  });

  const { data: allFinalAttempts } = await sb.from('attempts').select('id, test_id, percentage, grade').eq('student_id', ASIK_ID);
  console.log(`Total tests completed across journey: ${allFinalAttempts.length}`);
  console.log(`Grade distribution:`, allFinalAttempts.reduce((acc, a) => { acc[a.grade] = (acc[a.grade]||0)+1; return acc; }, {}));

  console.log('\n--- SIMULATION SUMMARY: 100% COMPLETE & VERIFIED ---');
}

main().catch(console.error);
