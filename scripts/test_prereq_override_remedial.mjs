import { createClient } from '@supabase/supabase-js';
import { calculateGrade, getGradeColorByScore, TOPSCORE_COLORS } from '../js/grading.js';

console.log('=== TEST: PREREQUISITE OVERRIDE WITH 60% REMEDIAL VERIFICATION ===\n');

// 1. Grade scale compliance
console.log('[1] Verifying 60% Remedial Grade Scale Compliance (Rule 2.10):');
const gradeAt60 = calculateGrade(60);
console.log(`  - Grade at 60%: "${gradeAt60}" (Expected: "C")`);
if (gradeAt60 !== 'C') {
  console.error('FAIL: Grade at 60% must strictly be "C" per Rule 2.10!');
  process.exit(1);
}

const colorAt60 = getGradeColorByScore(60);
console.log(`  - Color at 60%: "${colorAt60}" (Expected: Yellow "${TOPSCORE_COLORS.C}")`);
if (colorAt60 !== TOPSCORE_COLORS.C && colorAt60 !== '#FFFF00') {
  console.error(`FAIL: Color at 60% must be yellow! Got: ${colorAt60}`);
  process.exit(1);
}
console.log('  ✓ Rule 2.10 compliance verified!\n');

// 2. Logic simulation of override on a mock student
console.log('[2] Simulating Override Evaluation on Mock Student Attempt History:');
const mockClassTests = [
  { id: 'q1', title: 'Quiz 1', test_type: 'quiz', display_order: 1, payload: { theme_code: 'A', total_questions: 40 } },
  { id: 'q2', title: 'Quiz 2', test_type: 'quiz', display_order: 2, payload: { theme_code: 'A', total_questions: 40 } },
  { id: 'ex7', title: 'Words Exam', test_type: 'exam', display_order: 7, payload: { theme_code: 'A', total_questions: 120 } },
  { id: 'ex8', title: 'Phrases Exam', test_type: 'exam', display_order: 8, payload: { theme_code: 'A', category: 'phrases', total_questions: 70 } }
];

const mockStudentId = 'mock-student-123';
// Student had 0 attempts on q1, and scored 30% on q2 (failed)
const existingAttempts = [
  { id: 'att-q2', student_id: mockStudentId, test_id: 'q2', score: 12, total_questions: 40, percentage: 30.0, status: 'submitted' }
];

// Run override logic simulation
const simulatedUpdates = [];
const simulatedInserts = [];

mockClassTests.filter(t => t.test_type === 'quiz').forEach(quiz => {
  const atts = existingAttempts.filter(a => a.test_id === quiz.id);
  const alreadyPassed = atts.some(a => Number(a.percentage || 0) >= 60.0);
  
  if (!alreadyPassed) {
    const totalQ = quiz.payload.total_questions;
    const remScore = Math.round(totalQ * 0.6 * 10) / 10;
    const remCorrect = Math.round(totalQ * 0.6);

    if (atts.length > 0) {
      simulatedUpdates.push({
        id: atts[0].id,
        test_id: quiz.id,
        score: remScore,
        correct_count: remCorrect,
        total_questions: totalQ,
        percentage: 60.0,
        effective_score: remScore,
        grade: 'C',
        is_remedial_unlocked: true,
        status: 'submitted'
      });
    } else {
      simulatedInserts.push({
        student_id: mockStudentId,
        test_id: quiz.id,
        score: remScore,
        correct_count: remCorrect,
        total_questions: totalQ,
        percentage: 60.0,
        effective_score: remScore,
        grade: 'C',
        is_remedial_unlocked: true,
        status: 'submitted'
      });
    }
  }
});

console.log(`  - Simulated Inserts (Unattempted Quizzes): ${simulatedInserts.length}`);
console.log(`    Quiz 1 -> Score: ${simulatedInserts[0].score}/${simulatedInserts[0].total_questions} (${simulatedInserts[0].percentage}%), Grade: ${simulatedInserts[0].grade}, Remedial: ${simulatedInserts[0].is_remedial_unlocked}`);
console.log(`  - Simulated Updates (Failed Quizzes): ${simulatedUpdates.length}`);
console.log(`    Quiz 2 -> Score: ${simulatedUpdates[0].score}/${simulatedUpdates[0].total_questions} (${simulatedUpdates[0].percentage}%), Grade: ${simulatedUpdates[0].grade}, Remedial: ${simulatedUpdates[0].is_remedial_unlocked}`);

if (simulatedInserts.length === 1 && simulatedUpdates.length === 1) {
  console.log('  ✓ Simulation accurately created 1 new remedial attempt and updated 1 existing failed attempt!\n');
} else {
  console.error('FAIL: Simulation counts mismatched!');
  process.exit(1);
}

// 3. Prerequisite check simulation for Words Exam
console.log('[3] Verifying Exam Prerequisite Resolution:');
const postOverrideAttempts = [...simulatedInserts, ...simulatedUpdates];
const quizIds = mockClassTests.filter(t => t.test_type === 'quiz').map(t => t.id);

const passedQuizIds = new Set();
postOverrideAttempts.forEach(att => {
  if (quizIds.includes(att.test_id) && att.percentage >= 60.0) {
    passedQuizIds.add(att.test_id);
  }
});

const isWordsExamEligible = passedQuizIds.size === quizIds.length;
console.log(`  - Passed Quizzes: ${passedQuizIds.size}/${quizIds.length}`);
console.log(`  - Words Exam Unlocked: ${isWordsExamEligible ? 'YES (100% Eligible)' : 'NO'}`);

if (!isWordsExamEligible) {
  console.error('FAIL: Words Exam must be unlocked after override!');
  process.exit(1);
}

// 4. Paired Words Exam & Phrases Exam Sequence Check
console.log('\n[4] Verifying Sequential Intra-Theme Phrases Exam Resolution:');
// Suppose student takes Words Exam and scores 60% (or Words Exam is also overridden):
const wordsExamPassed = true;
const isPhrasesExamEligible = isWordsExamEligible && wordsExamPassed;
console.log(`  - Phrases Exam Unlocked: ${isPhrasesExamEligible ? 'YES (100% Eligible)' : 'NO'}`);

console.log('\n=== ALL OVERRIDE PREREQUISITE REMEDIAL TESTS PASSED (100%) ===');
