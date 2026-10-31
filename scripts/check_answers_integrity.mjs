import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAnswersIntegrity() {
  const classId = 'ab33498a-90e6-44b7-83f4-5765f964543e';
  const { data: tests } = await sb.from('tests').select('id, title, display_order').eq('class_id', classId).order('display_order');
  const testIds = tests.map(t => t.id);

  const batchId = '3b697c66-da5d-4a68-b823-ba3d06353852';
  const { data: students } = await sb.from('students').select('id, name').eq('batch_id', batchId).order('name');
  const activeStudents = students.filter(s => s.name.startsWith('Miss ') || s.name.startsWith('Mr. '));
  console.log(`Checking ${activeStudents.length} active students...`);

  // Fetch all best score attempts
  const { data: bestAtts, error } = await sb.from('attempts')
    .select('id, student_id, test_id, score, percentage, grade, correct_count, total_questions, started_at, submitted_at, created_at')
    .in('test_id', testIds)
    .in('student_id', activeStudents.map(s => s.id))
    .eq('is_best_score', true);

  console.log(`Fetched ${bestAtts.length} best_score attempts.`);

  // Check how many have answer records
  let withAnswers = 0;
  let withoutAnswers = 0;
  const noAnswersSample = [];

  for (let i = 0; i < bestAtts.length; i += 50) {
    const chunk = bestAtts.slice(i, i + 50);
    const chunkIds = chunk.map(a => a.id);
    const { data: answers } = await sb.from('attempt_answers').select('attempt_id').in('attempt_id', chunkIds);
    const answerCounts = {};
    (answers || []).forEach(ans => {
      answerCounts[ans.attempt_id] = (answerCounts[ans.attempt_id] || 0) + 1;
    });

    for (const a of chunk) {
      const count = answerCounts[a.id] || 0;
      if (count > 0) {
        withAnswers++;
      } else {
        withoutAnswers++;
        noAnswersSample.push(a);
      }
    }
  }

  console.log(`Summary of best_score attempts:`);
  console.log(`- With answers in attempt_answers: ${withAnswers}`);
  console.log(`- Without answers in attempt_answers: ${withoutAnswers}`);

  if (withoutAnswers > 0) {
    console.log('Sample without answers:', noAnswersSample.slice(0, 10));
  }
}

checkAnswersIntegrity();

