import { getSupabase } from '../js/supabase.js';

async function main() {
  const sb = await getSupabase();
  const { data: students, error: sErr } = await sb
    .from('students')
    .select('id, name')
    .ilike('name', '%Ari Wahyu%');

  console.log('Students matching Ari Wahyu:', students, sErr);

  if (!students || students.length === 0) {
    console.log('No student found');
    return;
  }

  for (const student of students) {
    console.log(`\n=== Student: ${student.name} (${student.id}) ===`);
    const { data: atts, error: aErr } = await sb
      .from('attempts')
      .select('id, test_id, status, score, percentage, started_at, submitted_at, time_spent_seconds, tests(id, title, duration_minutes, total_questions)')
      .eq('student_id', student.id)
      .order('started_at', { ascending: false })
      .limit(10);

    console.log(`Found ${(atts || []).length} attempts:`);
    (atts || []).forEach(a => {
      console.log({
        id: a.id,
        test_id: a.test_id,
        title: a.tests?.title,
        status: a.status,
        score: a.score,
        pct: a.percentage,
        total_q: a.tests?.total_questions,
        duration_min: a.tests?.duration_minutes,
        started_at: a.started_at,
        submitted_at: a.submitted_at
      });
    });

    const inProg = (atts || []).filter(a => a.status === 'in_progress');
    for (const ip of inProg) {
      const { count, error: cErr } = await sb
        .from('attempt_answers')
        .select('*', { count: 'exact', head: true })
        .eq('attempt_id', ip.id);
      console.log(`  -> Answers recorded for in_progress attempt ${ip.id} (${ip.tests?.title}): ${count} answers`);
    }
  }

  // Check answers recorded for in_progress attempts
  const inProg = (atts || []).filter(a => a.status === 'in_progress');
  for (const ip of inProg) {
    const { count, error: cErr } = await sb
      .from('attempt_answers')
      .select('*', { count: 'exact', head: true })
      .eq('attempt_id', ip.id);
    console.log(`Answers recorded for attempt ${ip.id} (${ip.tests?.title}): ${count} answers`);
  }
}

main().catch(console.error);
