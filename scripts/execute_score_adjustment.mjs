import { createClient } from '@supabase/supabase-js';
import { evaluateAnswer, calculatePercentage, calculateGrade } from '../js/grading.js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('=== STARTING HISTORICAL SCORE ADJUSTMENT EXECUTION ===\n');

// 1. Fetch all submitted best attempts (is_best_score = true)
console.log('Fetching all is_best_score = true attempts...');
let allBestAttempts = [];
let page = 0;
const pageSize = 1000;

while (true) {
  const { data, error } = await supabase
    .from('attempts')
    .select('id, student_id, test_id, score, percentage, grade, effective_score, total_questions, correct_count, is_best_score, is_remedial_unlocked, status')
    .eq('is_best_score', true)
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (error) {
    console.error('Error fetching attempts:', error);
    process.exit(1);
  }
  allBestAttempts.push(...(data || []));
  if (!data || data.length < pageSize) break;
  page++;
}

console.log(`Loaded ${allBestAttempts.length} best attempts.`);

const attemptIds = allBestAttempts.map(a => a.id);

// 2. Fetch all answers for these attempts in chunks
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
    console.error(`Error fetching answers chunk ${i}:`, error);
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

// 3. Determine necessary updates
const answerUpdates = [];
const attemptUpdates = [];

let attemptsImprovedCount = 0;
let answersImprovedCount = 0;

allBestAttempts.forEach(att => {
  const answers = answersByAttempt[att.id] || [];
  if (answers.length === 0) return;

  let oldTotalScore = 0;
  let newTotalScore = 0;
  let newCorrectCount = 0;
  let hasAttemptChanged = false;

  answers.forEach(ans => {
    const oldScore = Number(ans.score || 0);
    oldTotalScore += oldScore;

    const rawAns = ans.student_answer;
    const rawTarget = ans.correct_answer_snapshot || ans.question_snapshot?.correct_answer;
    const qSnap = typeof ans.question_snapshot === 'string' ? JSON.parse(ans.question_snapshot || '{}') : (ans.question_snapshot || {});
    const ansType = qSnap.answer_type || 'spoken';

    if (!rawAns || !rawTarget) {
      newTotalScore += oldScore;
      if (oldScore >= 1) newCorrectCount++;
      return;
    }

    const evalRes = evaluateAnswer(rawAns, rawTarget, ansType);
    const newScore = evalRes.score;
    newTotalScore += newScore;
    if (newScore >= 1) newCorrectCount++;

    if (newScore > oldScore) {
      hasAttemptChanged = true;
      answersImprovedCount++;
      answerUpdates.push({
        id: ans.id,
        score: newScore,
        is_correct: newScore >= 1,
        evaluation_result: evalRes.result,
        updated_at: new Date().toISOString()
      });
    }
  });

  if (hasAttemptChanged && newTotalScore > oldTotalScore) {
    attemptsImprovedCount++;
    const totQ = att.total_questions || answers.length || 1;
    const newPct = calculatePercentage(newTotalScore, totQ);
    let newEffectiveScore = newPct;
    if (att.is_remedial_unlocked) {
      newEffectiveScore = Math.min(newPct, 60.0);
    }
    const newGrade = calculateGrade(newEffectiveScore);

    attemptUpdates.push({
      id: att.id,
      score: newTotalScore,
      correct_count: newCorrectCount,
      percentage: newPct,
      effective_score: newEffectiveScore,
      grade: newGrade,
      updated_at: new Date().toISOString(),
      // Tracking
      studentId: att.student_id,
      oldScore: oldTotalScore,
      newScore: newTotalScore,
      oldPct: att.percentage,
      newPct,
      oldGrade: att.grade,
      newGrade
    });
  }
});

console.log(`\nIdentified for Update:`);
console.log(`- Answer rows to update:  ${answerUpdates.length}`);
console.log(`- Attempt rows to update: ${attemptUpdates.length}`);

// 4. Execute updates to attempt_answers in batches
console.log('\nUpdating attempt_answers in Supabase...');
const BATCH_SIZE = 25;
let answersWritten = 0;

for (let i = 0; i < answerUpdates.length; i += BATCH_SIZE) {
  const batch = answerUpdates.slice(i, i + BATCH_SIZE);
  // Perform updates in parallel within the batch
  await Promise.all(batch.map(upd =>
    supabase.from('attempt_answers').update({
      score: upd.score,
      is_correct: upd.is_correct,
      evaluation_result: upd.evaluation_result,
      updated_at: upd.updated_at
    }).eq('id', upd.id)
  ));
  answersWritten += batch.length;
  process.stdout.write(`  Updated answers: ${answersWritten}/${answerUpdates.length}\r`);
}
console.log(`\nSuccessfully updated ${answersWritten} attempt_answers rows.`);

// 5. Execute updates to attempts
console.log('\nUpdating attempts in Supabase...');
let attemptsWritten = 0;

for (let i = 0; i < attemptUpdates.length; i += BATCH_SIZE) {
  const batch = attemptUpdates.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(upd =>
    supabase.from('attempts').update({
      score: upd.score,
      correct_count: upd.correct_count,
      percentage: upd.percentage,
      effective_score: upd.effective_score,
      grade: upd.grade,
      updated_at: upd.updated_at
    }).eq('id', upd.id)
  ));
  attemptsWritten += batch.length;
  process.stdout.write(`  Updated attempts: ${attemptsWritten}/${attemptUpdates.length}\r`);
}
console.log(`\nSuccessfully updated ${attemptsWritten} attempts rows.`);

console.log('\n======================================================');
console.log('     DATABASE SCORE ADJUSTMENT COMPLETED SUCCESSFULLY ');
console.log('======================================================');
console.log(`Total Attempts Updated: ${attemptsWritten}`);
console.log(`Total Answers Updated:  ${answersWritten}`);

