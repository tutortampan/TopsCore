// ==============================================================================
// Script: scripts/rescore_hyphen_answers.mjs
// Description: Historical rescoring for student answers that were incorrectly
//              scored 0 due to hyphen/punctuation tolerance or spelling spacing.
//              Safe & idempotent: only upgrades scores, never downgrades.
// ==============================================================================

import { getSupabase } from '../js/supabase.js';
import { evaluateAnswer, calculateGrade as getGrade } from '../js/grading.js';

async function main() {
  console.log('--- Starting Historical Rescoring ---');
  const sb = await getSupabase();

  // 1. Fetch zero-scored or partial-scored answers
  console.log('Querying attempt_answers where score < 1 and student_answer is not empty...');
  const { data: answers, error: ansErr } = await sb
    .from('attempt_answers')
    .select('id, attempt_id, student_answer, correct_answer_snapshot, accepted_answers_snapshot, question_snapshot, question_type_snapshot, score')
    .lt('score', 1)
    .not('student_answer', 'is', null)
    .neq('student_answer', '');

  if (ansErr) {
    console.error('Error fetching answers:', ansErr);
    process.exit(1);
  }

  console.log(`Found ${answers.length} candidate answers with score < 1.`);

  const affectedAttempts = new Set();
  let updatedAnswersCount = 0;

  for (const row of answers) {
    const qType = row.question_snapshot?.answer_type || row.question_type_snapshot || 'written';
    const evalRes = evaluateAnswer(
      row.student_answer,
      row.accepted_answers_snapshot || row.correct_answer_snapshot,
      qType
    );

    const trueScore = evalRes.score || 0;
    const currentScore = row.score || 0;

    if (trueScore > currentScore) {
      console.log(`[UPGRADE] Answer ID ${row.id}: "${row.student_answer}" vs "${row.correct_answer_snapshot}" -> Old: ${currentScore}, New: ${trueScore} (${evalRes.result})`);
      const { error: updErr } = await sb
        .from('attempt_answers')
        .update({
          score: trueScore,
          is_correct: trueScore >= 1,
          evaluation_result: evalRes.result || (trueScore >= 1 ? 'correct' : 'minor'),
          updated_at: new Date().toISOString()
        })
        .eq('id', row.id);

      if (updErr) {
        console.error(`Failed to update answer ${row.id}:`, updErr);
      } else {
        updatedAnswersCount++;
        affectedAttempts.add(row.attempt_id);
      }
    }
  }

  console.log(`\nUpdated ${updatedAnswersCount} answers across ${affectedAttempts.size} attempts.`);

  // 2. Recalculate affected attempts
  console.log('\nRecalculating affected attempts...');
  let updatedAttemptsCount = 0;

  for (const attemptId of affectedAttempts) {
    const { data: att, error: attErr } = await sb
      .from('attempts')
      .select('id, student_id, test_id, is_remedial_unlocked, score, percentage, effective_score, grade')
      .eq('id', attemptId)
      .single();

    if (attErr || !att) {
      console.error(`Error fetching attempt ${attemptId}:`, attErr);
      continue;
    }

    const { data: allAttAnswers } = await sb
      .from('attempt_answers')
      .select('id, score, is_correct')
      .eq('attempt_id', attemptId);

    const totalQuestions = allAttAnswers?.length || 0;
    if (totalQuestions === 0) continue;

    let newTotalPoints = 0;
    let newCorrectCount = 0;

    for (const a of (allAttAnswers || [])) {
      const sc = Number(a.score || 0);
      newTotalPoints += sc;
      if (sc >= 1 || a.is_correct) newCorrectCount++;
    }

    const newPct = Math.round((newTotalPoints / totalQuestions) * 10000) / 100;
    let newEffScore = newPct;
    if (att.is_remedial_unlocked) {
      newEffScore = Math.min(newPct, 60.0);
    }
    const newGrade = getGrade(newEffScore);

    console.log(`[ATTEMPT UPDATE] ID ${attemptId}: Points ${att.score} -> ${newTotalPoints}/${totalQuestions}, Pct ${att.percentage}% -> ${newPct}%, Grade ${att.grade} -> ${newGrade}`);

    const { error: attUpdErr } = await sb
      .from('attempts')
      .update({
        score: newTotalPoints,
        correct_count: newCorrectCount,
        total_questions: totalQuestions,
        percentage: newPct,
        effective_score: newEffScore,
        grade: newGrade,
        updated_at: new Date().toISOString()
      })
      .eq('id', attemptId);

    if (attUpdErr) {
      console.error(`Failed to update attempt ${attemptId}:`, attUpdErr);
    } else {
      updatedAttemptsCount++;
    }
  }

  console.log(`\n--- Completed Historical Rescoring ---`);
  console.log(`Total answers updated: ${updatedAnswersCount}`);
  console.log(`Total attempts recalculated: ${updatedAttemptsCount}`);
}

main().catch(err => {
  console.error('Fatal error in rescoring script:', err);
  process.exit(1);
});
