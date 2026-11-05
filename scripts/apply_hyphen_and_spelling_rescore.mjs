// ==============================================================================
// Script: scripts/apply_hyphen_and_spelling_rescore.mjs
// Description: Targeted rescore for hyphen/punctuation and letter spelling.
//              Strictly preserves all other historical answer statuses.
// ==============================================================================

import { getSupabase } from '../js/supabase.js';
import {
  cleanPunctuationAndSymbols,
  stripAllPunctuationAndSpaces,
  parseCorrectAnswers,
  calculateGrade as getGrade
} from '../js/grading.js';

function isHyphenOrSpellingMatch(studentAnswer, targetStr) {
  if (!studentAnswer || !targetStr) return false;
  const normS = cleanPunctuationAndSymbols(studentAnswer);
  const compactS = stripAllPunctuationAndSpaces(studentAnswer);
  if (!normS && !compactS) return false;

  const variants = parseCorrectAnswers(targetStr);
  for (const v of variants) {
    const normV = cleanPunctuationAndSymbols(v);
    const compactV = stripAllPunctuationAndSpaces(v);
    // 1. Exact match with punctuation / hyphens stripped (e.g. "high quality" === "high quality")
    if (normS && normS === normV) return true;
    // 2. Exact match with spaces & symbols stripped (e.g. "buy" === "buy" from "b u y")
    if (compactS && compactS === compactV) return true;
  }
  return false;
}

async function main() {
  console.log('--- Targeted Hyphen & Spelling Rescore ---');
  const sb = await getSupabase();

  // 1. Find all answers updated in the recent run to clean up false positives
  console.log('Auditing answers updated in recent window...');
  const { data: recentUpdated, error: recErr } = await sb
    .from('attempt_answers')
    .select('id, attempt_id, student_answer, correct_answer_snapshot, accepted_answers_snapshot, score')
    .gte('updated_at', '2026-11-05T00:27:00.000Z');

  if (recErr) throw recErr;

  let revertedCount = 0;
  for (const r of (recentUpdated || [])) {
    const isMatch = isHyphenOrSpellingMatch(r.student_answer, r.accepted_answers_snapshot || r.correct_answer_snapshot);
    if (!isMatch && r.score > 0) {
      // Revert false positive
      await sb.from('attempt_answers').update({
        score: 0,
        is_correct: false,
        evaluation_result: 'incorrect',
        updated_at: new Date().toISOString()
      }).eq('id', r.id);
      revertedCount++;
    }
  }
  console.log(`Reverted ${revertedCount} false positives to score 0.`);

  // 2. Fetch all answers across database where score = 0 to find true hyphen & spelling matches
  console.log('\nScanning attempt_answers for true hyphen & spelling matches...');
  const { data: candidates, error: candErr } = await sb
    .from('attempt_answers')
    .select('id, attempt_id, student_answer, correct_answer_snapshot, accepted_answers_snapshot, score')
    .eq('score', 0)
    .not('student_answer', 'is', null)
    .neq('student_answer', '');

  if (candErr) throw candErr;

  const affectedAttempts = new Set();
  let rescoredCount = 0;

  for (const row of (candidates || [])) {
    const isMatch = isHyphenOrSpellingMatch(row.student_answer, row.accepted_answers_snapshot || row.correct_answer_snapshot);
    if (isMatch) {
      console.log(`[MATCH] Upgrading Answer ${row.id}: "${row.student_answer}" vs "${row.correct_answer_snapshot}" -> score 1.0 (correct)`);
      const { error: updErr } = await sb.from('attempt_answers').update({
        score: 1,
        is_correct: true,
        evaluation_result: 'correct',
        updated_at: new Date().toISOString()
      }).eq('id', row.id);

      if (!updErr) {
        rescoredCount++;
        affectedAttempts.add(row.attempt_id);
      }
    }
  }

  console.log(`\nSuccessfully rescored ${rescoredCount} answers across ${affectedAttempts.size} attempts.`);

  // 3. Recalculate affected attempts
  console.log('\nRecalculating affected attempts...');
  let updatedAttemptsCount = 0;

  for (const attemptId of affectedAttempts) {
    const { data: att, error: attErr } = await sb
      .from('attempts')
      .select('id, student_id, test_id, is_remedial_unlocked, score, percentage, effective_score, grade')
      .eq('id', attemptId)
      .single();

    if (attErr || !att) continue;

    const { data: allAnswers } = await sb
      .from('attempt_answers')
      .select('score, is_correct')
      .eq('attempt_id', attemptId);

    const totalQ = allAnswers?.length || 0;
    if (totalQ === 0) continue;

    let totalPts = 0;
    let correctCnt = 0;
    for (const a of (allAnswers || [])) {
      const s = Number(a.score || 0);
      totalPts += s;
      if (s >= 1 || a.is_correct) correctCnt++;
    }

    const pct = Math.round((totalPts / totalQ) * 10000) / 100;
    const effScore = att.is_remedial_unlocked ? Math.min(pct, 60.0) : pct;
    const grade = getGrade(effScore);

    console.log(`[ATTEMPT UPDATE] Attempt ${attemptId}: Points ${att.score} -> ${totalPts}/${totalQ}, Pct ${att.percentage}% -> ${pct}%, Grade ${att.grade} -> ${grade}`);

    const { error: updAttErr } = await sb.from('attempts').update({
      score: totalPts,
      correct_count: correctCnt,
      total_questions: totalQ,
      percentage: pct,
      effective_score: effScore,
      grade: grade,
      updated_at: new Date().toISOString()
    }).eq('id', attemptId);

    if (!updAttErr) updatedAttemptsCount++;
  }

  console.log(`\n=== Hyphen & Spelling Rescore Completed ===`);
  console.log(`Answers rescored: ${rescoredCount}`);
  console.log(`Attempts updated: ${updatedAttemptsCount}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

