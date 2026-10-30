import { createClient } from '@supabase/supabase-js';
import { calculatePercentage, calculateGrade } from '../js/grading.js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('--- REPAIR DRY-RUN: TESTING ACCURATE PER-ATTEMPT RESTORATION ---');

// Specific check on Aunul Fikri Yasir (attempt c61d445f-47c9-446a-933b-fbfdd68c29eb)
const testAttemptIds = [
  'c61d445f-47c9-446a-933b-fbfdd68c29eb', // Aunul 3B-WORDS-EXAM
  '646ddd62-644f-4bda-b0c4-7b4d1b6f09ae', // Aunul 3B-PHRASES-EXAM
];

for (const attId of testAttemptIds) {
  const { data: att } = await supabase
    .from('attempts')
    .select('id, student_id, test_id, score, percentage, grade, total_questions, tests(title, shell_code), students(name)')
    .eq('id', attId)
    .single();

  // Fetch ALL answers with explicit pagination
  let allAns = [];
  let p = 0;
  while (true) {
    const { data: batch } = await supabase
      .from('attempt_answers')
      .select('id, score, is_correct, evaluation_result')
      .eq('attempt_id', attId)
      .range(p * 1000, (p + 1) * 1000 - 1);
    if (!batch || batch.length === 0) break;
    allAns.push(...batch);
    if (batch.length < 1000) break;
    p++;
  }

  const trueTotalPoints = allAns.reduce((acc, a) => acc + (Number(a.score) || 0), 0);
  const trueCorrectCount = allAns.filter(a => Number(a.score) >= 1).length;
  const totQ = att.total_questions || allAns.length;
  const truePct = calculatePercentage(trueTotalPoints, totQ);
  const trueGrade = calculateGrade(truePct);

  console.log(`\nStudent: "${att.students?.name}" | Test: "${att.tests?.title}"`);
  console.log(`  Current Corrupted in attempts: score=${att.score}, pct=${att.percentage}%, grade=${att.grade}`);
  console.log(`  TRUE RECALCULATED from all ${allAns.length} answers: score=${trueTotalPoints}, pct=${truePct}%, grade=${trueGrade}`);
}

