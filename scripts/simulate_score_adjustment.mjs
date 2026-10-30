import { createClient } from '@supabase/supabase-js';
import { evaluateAnswer, calculatePercentage, calculateGrade } from '../js/grading.js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Fetching best attempts (is_best_score = true)...');

// Fetch all best attempts
let allBestAttempts = [];
let page = 0;
const pageSize = 1000;

while (true) {
  const { data, error } = await supabase
    .from('attempts')
    .select('id, student_id, test_id, score, percentage, grade, effective_score, total_questions, correct_count, is_best_score, status')
    .eq('is_best_score', true)
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (error) {
    console.error('Error fetching attempts:', error);
    break;
  }
  allBestAttempts.push(...(data || []));
  if (!data || data.length < pageSize) break;
  page++;
}

console.log(`Loaded ${allBestAttempts.length} best attempts.`);

const attemptIds = allBestAttempts.map(a => a.id);

// Fetch all attempt_answers for these attempts in chunks
let allAnswers = [];
const chunkSize = 40;
console.log(`Fetching answers across ${Math.ceil(attemptIds.length / chunkSize)} chunks...`);

for (let i = 0; i < attemptIds.length; i += chunkSize) {
  const chunk = attemptIds.slice(i, i + chunkSize);
  const { data, error } = await supabase
    .from('attempt_answers')
    .select('id, attempt_id, student_answer, correct_answer_snapshot, question_snapshot, is_correct, evaluation_result, score')
    .in('attempt_id', chunk);

  if (error) {
    console.error('Error fetching answers chunk:', error);
    continue;
  }
  allAnswers.push(...(data || []));
}

console.log(`Loaded ${allAnswers.length} total answers.`);

// Group answers by attempt_id
const answersByAttempt = {};
allAnswers.forEach(ans => {
  if (!answersByAttempt[ans.attempt_id]) answersByAttempt[ans.attempt_id] = [];
  answersByAttempt[ans.attempt_id].push(ans);
});

// Simulate re-evaluation
let totalAttemptsEvaluated = 0;
let attemptsWithScoreIncrease = 0;
let totalAnswersEvaluated = 0;
let answersGainedPoints = 0;
let wordFormMatches = 0;
let functionWordMatches = 0;

const improvedAttempts = [];

allBestAttempts.forEach(att => {
  const answers = answersByAttempt[att.id] || [];
  if (answers.length === 0) return;

  totalAttemptsEvaluated++;
  let oldTotalScore = 0;
  let newTotalScore = 0;
  let changesInAttempt = [];

  answers.forEach(ans => {
    totalAnswersEvaluated++;
    const oldScore = Number(ans.score || 0);
    oldTotalScore += oldScore;

    const rawAns = ans.student_answer;
    const rawTarget = ans.correct_answer_snapshot || ans.question_snapshot?.correct_answer;
    const qSnap = typeof ans.question_snapshot === 'string' ? JSON.parse(ans.question_snapshot || '{}') : (ans.question_snapshot || {});
    const ansType = qSnap.answer_type || 'spoken';

    if (!rawAns || !rawTarget) {
      newTotalScore += oldScore;
      return;
    }

    const evalRes = evaluateAnswer(rawAns, rawTarget, ansType);
    const newScore = evalRes.score;
    newTotalScore += newScore;

    if (newScore > oldScore) {
      answersGainedPoints++;
      if (evalRes.result === 'minor_word_form_error') wordFormMatches++;
      else if (evalRes.result === 'correct') functionWordMatches++;

      changesInAttempt.push({
        studentAns: rawAns,
        target: rawTarget,
        oldScore,
        newScore,
        newResult: evalRes.result
      });
    }
  });

  const totQ = att.total_questions || answers.length || 1;
  const oldPct = Number(att.percentage || 0);
  const newPct = calculatePercentage(newTotalScore, totQ);
  const oldGrade = att.grade;
  const newGrade = calculateGrade(newPct);

  if (newTotalScore > oldTotalScore) {
    attemptsWithScoreIncrease++;
    improvedAttempts.push({
      attemptId: att.id,
      studentId: att.student_id,
      testId: att.test_id,
      totQ,
      oldTotalScore,
      newTotalScore,
      oldPct,
      newPct,
      oldGrade,
      newGrade,
      diffPts: +(newTotalScore - oldTotalScore).toFixed(2),
      diffPct: +(newPct - oldPct).toFixed(2),
      changes: changesInAttempt
    });
  }
});

console.log('\n========================================');
console.log('       SIMULATION RESULTS SUMMARY       ');
console.log('========================================');
console.log(`Total Best Attempts Analyzed:    ${totalAttemptsEvaluated}`);
console.log(`Attempts That Gain Score:        ${attemptsWithScoreIncrease} (${((attemptsWithScoreIncrease / totalAttemptsEvaluated) * 100).toFixed(1)}%)`);
console.log(`Total Answers Analyzed:          ${totalAnswersEvaluated}`);
console.log(`Answers Gaining Score:           ${answersGainedPoints}`);
console.log(`  - Word Form (0.5 pt):          ${wordFormMatches}`);
console.log(`  - Function Words / Plurals (1.0 pt): ${functionWordMatches}`);

const avgPctGain = improvedAttempts.length > 0
  ? (improvedAttempts.reduce((sum, a) => sum + a.diffPct, 0) / improvedAttempts.length).toFixed(1)
  : 0;

const maxPctGain = improvedAttempts.length > 0
  ? Math.max(...improvedAttempts.map(a => a.diffPct))
  : 0;

console.log(`Average Score Increase:          +${avgPctGain}%`);
console.log(`Maximum Score Increase:          +${maxPctGain}%`);

let gradeUpgrades = 0;
improvedAttempts.forEach(a => {
  if (a.oldGrade !== a.newGrade) gradeUpgrades++;
});
console.log(`Grade Upgrades (e.g. C -> B):    ${gradeUpgrades} students`);

console.log('\n--- SAMPLE OF 5 IMPROVED STUDENT ATTEMPTS ---');
improvedAttempts.slice(0, 5).forEach((a, idx) => {
  console.log(`\n#${idx + 1} Attempt: ${a.attemptId.slice(0, 8)}... | Student: ${a.studentId.slice(0, 8)}...`);
  console.log(`   Score:  ${a.oldTotalScore} pts -> ${a.newTotalScore} pts (+${a.diffPts} pts)`);
  console.log(`   Pct:    ${a.oldPct}% -> ${a.newPct}% (+${a.diffPct}%)`);
  console.log(`   Grade:  ${a.oldGrade} -> ${a.newGrade}`);
  console.log('   Sample answer adjustments:');
  a.changes.slice(0, 3).forEach(c => {
    console.log(`     * Student: "${c.studentAns}" | Target: "${c.target}" -> +${c.newScore - c.oldScore} pt (${c.newResult})`);
  });
});

