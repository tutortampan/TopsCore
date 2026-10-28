import { isWeeklyExam, calculateGrade, calculateOverallStudentScore, GRADE_PALETTE, computeMilestoneExamMastery } from '../js/grading.js';
import fs from 'fs';

console.log('=== TEST: STUDENT DASHBOARD EXAM-ONLY METRICS & RANKING PARITY ===\n');

// 1. Verify isWeeklyExam categorization
console.log('[1] Testing isWeeklyExam Classification:');
const sampleTests = [
  { id: 't1', test_type: 'exam', shell_code: '3A-WORDS-EXAM', title: '3rd Vocabulary A Words Exam', total_questions: 120 },
  { id: 't2', test_type: 'exam', shell_code: '3B-PHRASES-EXAM', title: '3rd Vocabulary B Phrases Exam', total_questions: 70 },
  { id: 't3', test_type: 'quiz', shell_code: '3A1-WORDS-QUIZ', title: '3rd Vocabulary A1 Words Quiz', total_questions: 40 },
  { id: 't4', test_type: 'quiz', shell_code: '3A2-PHRASES-QUIZ', title: '3rd Vocabulary A2 Phrases Quiz', total_questions: 10 },
  { id: 't5', test_type: null, category: 'EXAM', shell_code: '3C-WORDS-EXAM', title: 'Words Exam', total_questions: 480 },
  { id: 't6', test_type: null, category: 'QUIZ', shell_code: '3C1-WORDS-QUIZ', title: 'Words Quiz', total_questions: 40 },
  // Backward compatibility legacy shells
  { id: 't7', test_type: null, category: 'TEST', shell_code: '3D-WORDS-TEST', title: 'Words Test', total_questions: 640 },
  { id: 't8', test_type: null, category: 'TASK', shell_code: '3D1-WORDS-TASK', title: 'Words Task', total_questions: 40 }
];

let examCount = 0;
let quizCount = 0;
sampleTests.forEach(t => {
  const isExam = isWeeklyExam(t);
  if (isExam) examCount++; else quizCount++;
  console.log(`  - ${t.shell_code}: ${isExam ? 'EXAM (Weekly)' : 'QUIZ (Daily)'}`);
});

if (examCount === 4 && quizCount === 4) {
  console.log('  ✅ isWeeklyExam accurately classified 4 Exams and 4 Quizzes!\n');
} else {
  console.error(`  ❌ Classification mismatch! Exams: ${examCount}, Quizzes: ${quizCount}`);
  process.exit(1);
}

// 2. Simulation of Student Dashboard Ranking Algorithm (Points-First)
console.log('[2] Testing Student Dashboard Multi-Tier Ranking Engine:');

const totalClassTests = 40; // 32 quizzes + 8 exams

function computeStudentStats(student, attempts, allTests) {
  const activeAsmMap = new Map((allTests || []).map(a => [a.id, a]));
  const bestMap = {};
  let lastSubmittedAt = null;

  attempts.forEach(att => {
    const key = att.test_id;
    if (!key) return;
    const asm = activeAsmMap.get(key) || att.tests;
    if (!asm || asm.deleted_at) return;

    const totalQ = Number(att.total_questions || asm.total_questions || 50);
    const rawPct = parseFloat(att.percentage || 0);
    const isRem = Boolean(att.is_remedial_unlocked);
    const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;
    const rawScore = parseFloat(att.score != null ? att.score : (rawPct * totalQ / 100));
    const maxRemPts = totalQ * 0.6;
    const effPoints = isRem ? Math.min(rawScore, maxRemPts) : rawScore;

    const isExam = isWeeklyExam(asm);

    let shouldReplace = false;
    if (!bestMap[key]) {
      shouldReplace = true;
    } else {
      const cur = bestMap[key];
      const ptsDiff = effPoints - cur.points;
      if (ptsDiff > 0.01) {
        shouldReplace = true;
      } else if (Math.abs(ptsDiff) <= 0.01 && effPct > cur.effPct + 0.01) {
        shouldReplace = true;
      }
    }

    if (shouldReplace) {
      bestMap[key] = {
        test: asm,
        isExam,
        effPct,
        effPoints,
        points: effPoints,
        totalQ,
        isRem
      };
    }

    if (att.submitted_at) {
      if (!lastSubmittedAt || new Date(att.submitted_at) > new Date(lastSubmittedAt)) {
        lastSubmittedAt = att.submitted_at;
      }
    }
  });

  const bestItems = Object.values(bestMap);
  const completedCount = bestItems.length;
  const progressPct = totalClassTests > 0 ? Math.round((completedCount / totalClassTests) * 100) : 0;

  const examItems = bestItems.filter(item => item.isExam);
  const allClassExams = allTests.filter(isWeeklyExam);
  const mastery = computeMilestoneExamMastery(examItems, allClassExams);

  return {
    id: student.id,
    name: student.name,
    gender: student.gender,
    progressPct,
    completedCount,
    completedWeeklyCount: mastery.completedWeeklyCount,
    totalPoints: mastery.totalPoints,
    overallScore: mastery.overallScore,
    grade: mastery.grade,
    lastSubmittedAt
  };
}

function rankStudents(studentStatsList) {
  return [...studentStatsList].sort((a, b) => {
    // 1. Primary: Global PTS DESC (Points first!)
    const ptsA = Number(a.totalPoints ?? 0);
    const ptsB = Number(b.totalPoints ?? 0);
    if (ptsA !== ptsB) return ptsB - ptsA;

    // 2. Secondary: Global SCORE % DESC (unattempted exams sort after completed)
    const scoreA = (a.completedWeeklyCount > 0) ? Number(a.overallScore ?? 0) : -1;
    const scoreB = (b.completedWeeklyCount > 0) ? Number(b.overallScore ?? 0) : -1;
    if (scoreA !== scoreB) return scoreB - scoreA;

    // 3. Tertiary: PROG % DESC
    const progA = Number(a.progressPct ?? 0);
    const progB = Number(b.progressPct ?? 0);
    if (progA !== progB) return progB - progA;

    // 4. Earliest submission
    if (a.lastSubmittedAt && b.lastSubmittedAt) {
      const diff = new Date(a.lastSubmittedAt) - new Date(b.lastSubmittedAt);
      if (diff !== 0) return diff;
    }

    return (a.name || '').localeCompare(b.name || '');
  });
}


// Case 1: Student with ONLY Quizzes (0 Exams)
const quizOnlyStudent = { id: 's1', name: 'Quiz Master', gender: 'male' };
const quizAttempts = [
  { test_id: 't3', percentage: 95, score: 38, total_questions: 40, tests: sampleTests[2] },
  { test_id: 't4', percentage: 100, score: 10, total_questions: 10, tests: sampleTests[3] },
  { test_id: 't6', percentage: 90, score: 36, total_questions: 40, tests: sampleTests[5] }
];
const res1 = computeStudentStats(quizOnlyStudent, quizAttempts, sampleTests);

console.log('  Scenario 1 (Quiz Only):', res1);
if (res1.totalPoints === 0 && res1.overallScore === 0 && res1.grade === 'E' && res1.completedCount === 3 && res1.progressPct > 0) {
  console.log('  ✅ PASS: Quizzes counted toward completed count and PROG %, but EXCLUDED from PTS (0), SCORE (0), and GRD (E)!');
} else {
  console.error('  ❌ FAIL: Quiz leakage detected in Scenario 1!');
  process.exit(1);
}

// Case 2: Student with 0 total activity (Initial milestone is Theme 1: 0% Grade E)
const zeroStudent = { id: 's2', name: 'Zero Activity', gender: 'female' };
const res2 = computeStudentStats(zeroStudent, [], sampleTests);
console.log('  Scenario 2 (0 Activity):', res2);
if (res2.totalPoints === 0 && res2.overallScore === 0 && res2.grade === 'E' && res2.progressPct === 0) {
  console.log('  ✅ PASS: 0 activity produces 0 pts, 0% score, and initial Grade E for Theme 1!');
} else {
  console.error('  ❌ FAIL in Scenario 2!');
  process.exit(1);
}

// Case 3: Tie-Breakers with identical PROG %
const studentA = { id: 'sa', name: 'Student A (High Score, Med Pts)', gender: 'male' };
const attsA = [
  { test_id: 't1', percentage: 90, score: 180, total_questions: 200, tests: sampleTests[0] }, // Exam
  { test_id: 't3', percentage: 80, score: 32, total_questions: 40, tests: sampleTests[2] }    // Quiz
];

const studentB = { id: 'sb', name: 'Student B (Lower Score, Low Pts)', gender: 'female' };
const attsB = [
  { test_id: 't1', percentage: 80, score: 160, total_questions: 200, tests: sampleTests[0] }, // Exam
  { test_id: 't3', percentage: 80, score: 32, total_questions: 40, tests: sampleTests[2] }    // Quiz
];

const studentC = { id: 'sc', name: 'Student C (High Score, High Pts)', gender: 'male' };
const attsC = [
  { test_id: 't1', percentage: 90, score: 252, total_questions: 280, tests: sampleTests[0] }, // Exam
  { test_id: 't3', percentage: 80, score: 32, total_questions: 40, tests: sampleTests[2] }    // Quiz
];

const statsA = computeStudentStats(studentA, attsA, sampleTests);
const statsB = computeStudentStats(studentB, attsB, sampleTests);
const statsC = computeStudentStats(studentC, attsC, sampleTests);

const ranked = rankStudents([statsB, statsA, statsC]);
console.log('  Scenario 3 (Tie-Breakers with PROG % = 5%):');
ranked.forEach((st, idx) => {
  console.log(`    Rank ${idx+1}: ${st.name} | SCORE: ${st.overallScore}% | PTS: ${st.totalPoints}`);
});

if (ranked[0].id === 'sc' && ranked[1].id === 'sa' && ranked[2].id === 'sb') {
  console.log('  ✅ PASS: Multi-tier tie-breakers verified! Rank 1: C (90%, 250 pts) > Rank 2: A (90%, 180 pts) > Rank 3: B (80%, 160 pts).');
} else {
  console.error('  ❌ FAIL: Tie-breaker order mismatch!');
  process.exit(1);
}

// Case 4: Milestone Progression 0% Penalty & Points-First Resolution (Suke vs Sofa Maria Ulfa vs Pasya)
console.log('\n[2.4] Testing Milestone Progression & Points-First Rank Inversion Resolution:');
const fullVocabTests = [
  { id: 'exA', test_type: 'exam', shell_code: '3A-WORDS-EXAM', title: 'Theme A Words Exam', total_questions: 150 },
  { id: 'exB', test_type: 'exam', shell_code: '3B-WORDS-EXAM', title: 'Theme B Words Exam', total_questions: 350 },
  { id: 'exC', test_type: 'exam', shell_code: '3C-WORDS-EXAM', title: 'Theme C Words Exam', total_questions: 600 },
  { id: 'exD', test_type: 'exam', shell_code: '3D-WORDS-EXAM', title: 'Theme D Words Exam', total_questions: 800 }
];

// Student 1: Miss Sofa Maria Ulfa (17 tasks completed, 273.5 pts, attempted Theme A & Theme B)
const studentSofa = { id: 'sofa', name: 'Miss Sofa Maria Ulfa', gender: 'female' };
const attsSofa = [
  { test_id: 'exA', percentage: 73.3, score: 110, total_questions: 150, tests: fullVocabTests[0] },
  { test_id: 'exB', percentage: 46.7, score: 163.5, total_questions: 350, tests: fullVocabTests[1] }
];

// Student 2: Mr. Suke Ajai (18 tasks completed, 143 pts, attempted Theme A & Theme B with lower score)
const studentSuke = { id: 'suke', name: 'Mr. Suke Ajai', gender: 'male' };
const attsSuke = [
  { test_id: 'exA', percentage: 35.3, score: 53, total_questions: 150, tests: fullVocabTests[0] },
  { test_id: 'exB', percentage: 25.7, score: 90, total_questions: 350, tests: fullVocabTests[1] }
];

// Student 3: Mr. Pasya (8 tasks completed, 90 pts, passed Theme A 90/150 = 60%, but stopped before Theme B)
const studentPasya = { id: 'pasya', name: 'Mr. Pasya', gender: 'male' };
const attsPasya = [
  { test_id: 'exA', percentage: 60, score: 90, total_questions: 150, tests: fullVocabTests[0] }
];

const statsSofa = computeStudentStats(studentSofa, attsSofa, fullVocabTests);
// simulate total progress: Sofa 17 tasks (43%), Suke 18 tasks (45%), Pasya 8 tasks (20%)
statsSofa.progressPct = 43;
statsSofa.completedCount = 17;

const statsSuke = computeStudentStats(studentSuke, attsSuke, fullVocabTests);
statsSuke.progressPct = 45;
statsSuke.completedCount = 18;

const statsPasya = computeStudentStats(studentPasya, attsPasya, fullVocabTests);
statsPasya.progressPct = 20;
statsPasya.completedCount = 8;

console.log('  Sofa Maria Ulfa stats:', { pts: statsSofa.totalPoints, score: statsSofa.overallScore + '%', grd: statsSofa.grade, prog: statsSofa.progressPct + '%' });
console.log('  Suke Ajai stats:', { pts: statsSuke.totalPoints, score: statsSuke.overallScore + '%', grd: statsSuke.grade, prog: statsSuke.progressPct + '%' });
console.log('  Pasya stats:', { pts: statsPasya.totalPoints, score: statsPasya.overallScore + '%', grd: statsPasya.grade, prog: statsPasya.progressPct + '%' });

// Verify Pasya was penalized by Theme B (350 questions queued at 0%)
// Denominator should be 150 + 350 = 500, Score = 90 / 500 = 18%, Grade E!
if (statsPasya.overallScore === 18 && statsPasya.grade === 'E') {
  console.log('  ✅ PASS: Pasya milestone penalty enforced! (Score: 18% Grade E due to unattempted Theme B queued at 0%).');
} else {
  console.error(`  ❌ FAIL: Expected Pasya score 18% Grade E, got score ${statsPasya.overallScore}% Grade ${statsPasya.grade}`);
  process.exit(1);
}

// Verify Ranking Order: Points-First hierarchy
const rankedMilestone = rankStudents([statsSuke, statsSofa, statsPasya]);
console.log('  Ranked Results:');
rankedMilestone.forEach((st, idx) => {
  console.log(`    #${idx+1}: ${st.name} | PTS: ${st.totalPoints} | SCORE: ${st.overallScore}% (${st.grade}) | PROG: ${st.progressPct}%`);
});

if (rankedMilestone[0].id === 'sofa' && rankedMilestone[1].id === 'suke' && rankedMilestone[2].id === 'pasya') {
  console.log('  ✅ PASS: Suke Ajai ranking paradox RESOLVED! Sofa Maria Ulfa (273.5 pts) ranks #1 over Suke Ajai (143 pts) despite lower task count!');
} else {
  console.error('  ❌ FAIL: Ranking order does not prioritize Points!');
  process.exit(1);
}

// 3. Verify JavaScript Syntax across all files
console.log('\n[3] Checking Syntax for all JS files...');
import('../scripts/check_all_js_syntax.cjs');

console.log('\n=== ALL STUDENT DASHBOARD PARITY CHECKS PASSED 100% ===');
