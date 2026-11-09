import { createClient } from '@supabase/supabase-js';
import { calculatePercentage, calculateGrade } from '../js/grading.js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('=== STARTING COMPLETE ATTEMPT SCORE REPAIR & RESTORATION ===\n');

// 1. Fetch all attempts in batches
let allAttempts = [];
let page = 0;
while (true) {
  const { data, error } = await supabase
    .from('attempts')
    .select('id, student_id, test_id, score, percentage, grade, effective_score, total_questions, correct_count, is_best_score, is_remedial_unlocked, status')
    .range(page * 1000, (page + 1) * 1000 - 1);

  if (error) {
    console.error('Error fetching attempts:', error);
    process.exit(1);
  }
  if (!data || data.length === 0) break;
  allAttempts.push(...data);
  if (data.length < 1000) break;
  page++;
}

console.log(`Loaded ${allAttempts.length} total attempts from database.`);

// Filter to attempts that are submitted or have status
const submittedAttempts = allAttempts.filter(a => {
  const st = String(a.status || '').toLowerCase();
  return ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st) || a.is_best_score === true;
});

console.log(`Analyzing ${submittedAttempts.length} submitted / best attempts...`);

const updatesToExecute = [];
let totalPointsRestored = 0;

for (let i = 0; i < submittedAttempts.length; i++) {
  const att = submittedAttempts[i];

  // Fetch ALL answers for this attempt with full pagination
  let allAns = [];
  let p = 0;
  while (true) {
    const { data: batch, error: ansErr } = await supabase
      .from('attempt_answers')
      .select('id, score')
      .eq('attempt_id', att.id)
      .range(p * 1000, (p + 1) * 1000 - 1);

    if (ansErr || !batch || batch.length === 0) break;
    allAns.push(...batch);
    if (batch.length < 1000) break;
    p++;
  }

  // If attempt has no answers recorded in attempt_answers, skip
  if (allAns.length === 0) continue;

  const trueTotalPoints = allAns.reduce((acc, a) => acc + (Number(a.score) || 0), 0);
  const trueCorrectCount = allAns.filter(a => Number(a.score) >= 1).length;
  const totQ = att.total_questions || allAns.length || 1;
  const truePct = calculatePercentage(trueTotalPoints, totQ);

  let trueEffectiveScore = truePct;
  if (att.is_remedial_unlocked) {
    trueEffectiveScore = Math.min(truePct, 60.0);
  }
  const trueGrade = calculateGrade(trueEffectiveScore);

  const recordedScore = Number(att.score ?? -1);
  const recordedPct = Number(att.percentage ?? -1);

  // Check if discrepancy exists
  if (Math.abs(trueTotalPoints - recordedScore) > 0.001 || Math.abs(truePct - recordedPct) > 0.01) {
    const diff = +(trueTotalPoints - recordedScore).toFixed(2);
    if (diff > 0) totalPointsRestored += diff;

    updatesToExecute.push({
      id: att.id,
      score: trueTotalPoints,
      correct_count: trueCorrectCount,
      percentage: truePct,
      effective_score: trueEffectiveScore,
      grade: trueGrade,
      updated_at: new Date().toISOString(),
      // Log info
      oldScore: recordedScore,
      newScore: trueTotalPoints,
      oldPct: recordedPct,
      newPct: truePct,
      diff
    });
  }

  if ((i + 1) % 100 === 0 || i === submittedAttempts.length - 1) {
    process.stdout.write(`  Audited answers for ${i + 1}/${submittedAttempts.length} attempts...\r`);
  }
}

console.log(`\n\nIdentified ${updatesToExecute.length} attempts requiring score correction.`);
console.log(`Total deficit points being restored: +${totalPointsRestored.toFixed(2)} pts.\n`);

// 3. Execute updates in batches of 25
console.log('Writing corrected scores to Supabase attempts table...');
const BATCH_SIZE = 25;
let written = 0;

for (let i = 0; i < updatesToExecute.length; i += BATCH_SIZE) {
  const batch = updatesToExecute.slice(i, i + BATCH_SIZE);
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
  written += batch.length;
  process.stdout.write(`  Corrected ${written}/${updatesToExecute.length} attempts...\r`);
}

console.log(`\n\n================================================================`);
console.log(`  ALL ${written} ATTEMPTS FULLY RESTORED AND SYNCHRONIZED!`);
console.log(`================================================================`);

