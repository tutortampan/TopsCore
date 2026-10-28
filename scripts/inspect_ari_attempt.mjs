import { getSupabase } from '../js/supabase.js';

async function main() {
  const sb = await getSupabase();
  const { data: atts, error } = await sb
    .from('attempts')
    .select('*, tests(id, title, payload)')
    .eq('student_id', '14bd4810-1395-4056-ae19-822e71af1ad0')
    .eq('status', 'in_progress');

  console.log('Ari Wahyu In-Progress Attempts:');
  for (const a of (atts || [])) {
    console.log({
      id: a.id,
      test_id: a.test_id,
      title: a.tests?.title,
      status: a.status,
      started_at: a.started_at,
      score: a.score,
      percentage: a.percentage,
      payload: a.tests?.payload
    });

    const { data: answers, count } = await sb
      .from('attempt_answers')
      .select('*', { count: 'exact' })
      .eq('attempt_id', a.id);

    console.log(`Answers recorded: ${count}`);
    if (answers && answers.length > 0) {
      console.log('Sample answer:', answers[0]);
      const correctCount = answers.filter(ans => ans.is_correct).length;
      console.log(`Correct answers: ${correctCount} / ${answers.length}`);
    }
  }
}

main().catch(console.error);
