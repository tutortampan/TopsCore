import { getSupabase } from '../js/supabase.js';

async function main() {
  const sb = await getSupabase();
  const { data: sample, error } = await sb.from('attempts').select('*').limit(1);
  if (sample && sample[0]) {
    console.log('Columns on attempts table:', Object.keys(sample[0]));
  }

  // Now find in_progress attempts
  const { data: inProg, error: ipErr } = await sb
    .from('attempts')
    .select('id, student_id, test_id, status, score, percentage, started_at, submitted_at, students(id, name), tests(id, title)')
    .eq('status', 'in_progress');

  console.log('In progress error:', ipErr);
  console.log(`In progress count: ${(inProg || []).length}`);
  (inProg || []).forEach(a => {
    console.log({
      id: a.id,
      student_id: a.student_id,
      student_name: a.students?.name,
      test_id: a.test_id,
      test_title: a.tests?.title,
      started_at: a.started_at
    });
  });
}

main().catch(console.error);
