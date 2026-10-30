import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('--- CHECK 1: AUDITING THE 95 RECENTLY UPDATED ATTEMPTS ---');

const fiveMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
const { data: recentAtts, error } = await supabase
  .from('attempts')
  .select('id, student_id, test_id, score, percentage, grade, total_questions, correct_count, updated_at, tests(title, test_type, shell_code), students(name)')
  .gte('updated_at', fiveMinAgo);

if (error) {
  console.error(error);
  process.exit(1);
}

console.log(`Found ${recentAtts.length} attempts updated recently.`);

const discrepancies = [];

for (const att of recentAtts) {
  // Count real answers in attempt_answers
  const { count: realAnswerCount } = await supabase
    .from('attempt_answers')
    .select('id', { count: 'exact', head: true })
    .eq('attempt_id', att.id);

  // Fetch all answers with pagination
  let allAns = [];
  let p = 0;
  while (true) {
    const { data: batch } = await supabase
      .from('attempt_answers')
      .select('score')
      .eq('attempt_id', att.id)
      .range(p * 1000, (p + 1) * 1000 - 1);
    if (!batch || batch.length === 0) break;
    allAns.push(...batch);
    if (batch.length < 1000) break;
    p++;
  }

  const realScoreSum = allAns.reduce((sum, a) => sum + (Number(a.score) || 0), 0);
  const diff = +(realScoreSum - Number(att.score)).toFixed(2);

  if (Math.abs(diff) > 0.01) {
    discrepancies.push({
      attemptId: att.id,
      studentName: att.students?.name,
      testTitle: att.tests?.title,
      totalQ: att.total_questions,
      recordedInAttempts: att.score,
      realSumOfAnswers: realScoreSum,
      recordedPct: att.percentage,
      realPct: Math.round((realScoreSum / (att.total_questions || 1)) * 10000) / 100,
      diff
    });
  }
}

console.log(`\nDiscrepancies found: ${discrepancies.length} out of ${recentAtts.length} attempts!`);
console.log('\nTop 10 Worst Discrepancies:');
discrepancies.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
discrepancies.slice(0, 10).forEach((d, i) => {
  console.log(`#${i + 1} Student: "${d.studentName}" | Test: "${d.testTitle}"`);
  console.log(`   Recorded score: ${d.recordedInAttempts} (${d.recordedPct}%)`);
  console.log(`   REAL SUM of answers: ${d.realSumOfAnswers} (${d.realPct}%)`);
  console.log(`   LOST POINTS IN RECORD: -${d.diff} pts!\n`);
});

