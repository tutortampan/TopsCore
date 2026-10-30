import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('--- CHECK 2: COMPREHENSIVE AUDIT OF ALL BEST ATTEMPTS ---');

// Fetch all best attempts
let allBest = [];
let p = 0;
while (true) {
  const { data } = await supabase
    .from('attempts')
    .select('id, student_id, test_id, score, percentage, grade, total_questions, correct_count, is_best_score, is_remedial_unlocked')
    .eq('is_best_score', true)
    .range(p * 1000, (p + 1) * 1000 - 1);
  if (!data || data.length === 0) break;
  allBest.push(...data);
  if (data.length < 1000) break;
  p++;
}

console.log(`Total best attempts in DB: ${allBest.length}`);

// For each attempt, query the EXACT sum from attempt_answers
const fixesNeeded = [];

for (let i = 0; i < allBest.length; i++) {
  const att = allBest[i];

  // Fetch all answers with pagination
  let allAns = [];
  let page = 0;
  while (true) {
    const { data: batch, error } = await supabase
      .from('attempt_answers')
      .select('id, score, is_correct, evaluation_result')
      .eq('attempt_id', att.id)
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (error || !batch || batch.length === 0) break;
    allAns.push(...batch);
    if (batch.length < 1000) break;
    page++;
  }

  if (allAns.length === 0) continue;

  const realTotalPoints = allAns.reduce((acc, a) => acc + (Number(a.score) || 0), 0);
  const realCorrectCount = allAns.filter(a => Number(a.score) >= 1).length;
  const totQ = att.total_questions || allAns.length;
  const realPct = Math.round((realTotalPoints / totQ) * 10000) / 100;

  let realEffectiveScore = realPct;
  if (att.is_remedial_unlocked) {
    realEffectiveScore = Math.min(realPct, 60.0);
  }

  const recordedScore = Number(att.score || 0);
  const diff = +(realTotalPoints - recordedScore).toFixed(2);

  if (Math.abs(diff) > 0.01) {
    fixesNeeded.push({
      attemptId: att.id,
      studentId: att.student_id,
      testId: att.test_id,
      recordedScore,
      realTotalPoints,
      recordedPct: att.percentage,
      realPct,
      realEffectiveScore,
      realCorrectCount,
      totalQuestions: totQ,
      diff
    });
  }

  if ((i + 1) % 100 === 0 || i === allBest.length - 1) {
    process.stdout.write(`  Audited ${i + 1}/${allBest.length} attempts...\r`);
  }
}

console.log(`\n\nTotal attempts needing fix: ${fixesNeeded.length} out of ${allBest.length}`);
const lostSum = fixesNeeded.reduce((acc, f) => acc + f.diff, 0);
console.log(`Total point deficit to be restored: +${lostSum.toFixed(2)} pts!`);

console.log('\nSample 5 fixes:');
fixesNeeded.slice(0, 5).forEach((f, idx) => {
  console.log(`#${idx + 1} Attempt ${f.attemptId.slice(0, 8)}: recorded=${f.recordedScore} (${f.recordedPct}%) -> REAL=${f.realTotalPoints} (${f.realPct}%) [Diff: +${f.diff}]`);
});

