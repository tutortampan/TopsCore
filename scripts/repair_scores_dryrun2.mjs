import { createClient } from '@supabase/supabase-js';
import { calculatePercentage, calculateGrade } from '../js/grading.js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const testStudents = ['Unggul', 'Syazida', 'Nurhaliza', 'Laura'];

for (const name of testStudents) {
  const { data: students } = await supabase.from('students').select('id, name').ilike('name', `%${name}%`);
  if (!students || students.length === 0) continue;
  const student = students[0];

  const { data: atts } = await supabase
    .from('attempts')
    .select('id, score, percentage, grade, total_questions, tests(title)')
    .eq('student_id', student.id)
    .eq('is_best_score', true);

  for (const att of (atts || [])) {
    // Only check exams or tests with > 40 questions
    if ((att.total_questions || 0) < 50) continue;

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

    const trueTotalPoints = allAns.reduce((acc, a) => acc + (Number(a.score) || 0), 0);
    const totQ = att.total_questions || allAns.length;
    const truePct = calculatePercentage(trueTotalPoints, totQ);

    if (Math.abs(trueTotalPoints - Number(att.score)) > 1) {
      console.log(`Student: "${student.name}" | Test: "${att.tests?.title}"`);
      console.log(`  Current corrupted in attempts: score=${att.score} (${att.percentage}%)`);
      console.log(`  TRUE from all ${allAns.length} answers: score=${trueTotalPoints} (${truePct}%)\n`);
    }
  }
}

