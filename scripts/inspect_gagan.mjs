import { getSupabase } from '../js/supabase.js';

async function main() {
  const sb = await getSupabase();
  const { data: students, error: sErr } = await sb
    .from('students')
    .select('id, name, level_id, batch_id')
    .ilike('name', '%gagan%');

  if (sErr || !students || students.length === 0) {
    console.error('Student not found:', sErr);
    return;
  }
  const gagan = students[0];
  console.log('Student found:', gagan);

  const { data: attempts, error: aErr } = await sb
    .from('attempts')
    .select('id, test_id, score, percentage, grade, status, is_remedial_unlocked, created_at, submitted_at, started_at, tests(id, title, payload)')
    .eq('student_id', gagan.id)
    .order('created_at', { ascending: true });

  if (aErr) {
    console.error('Error fetching attempts:', aErr);
    return;
  }

  console.log(`\nAll Theme B Attempts for Gagan:`);
  attempts
    .filter(a => a.tests?.title?.includes('Tourism') || a.tests?.title?.includes('2nd Vocabulary B') || a.tests?.payload?.theme_code === 'B')
    .forEach((a, idx) => {
      console.log(`[Theme B Attempt ${idx+1}]`);
      console.log(`  Test: ${a.tests?.title} (ID: ${a.test_id})`);
      console.log(`  Order / Code: ${a.tests?.payload?.display_order} / ${a.tests?.payload?.shell_code}`);
      console.log(`  Score: ${a.score} / Percentage: ${a.percentage}% / Grade: ${a.grade}`);
      console.log(`  Status: ${a.status} (Unlocked: ${a.is_remedial_unlocked})`);
      console.log(`  Created: ${a.created_at}`);
      console.log(`  Started: ${a.started_at}`);
      console.log(`  Submitted: ${a.submitted_at}\n`);
    });

  // Also inspect Test 17 and Test 18 configurations
  const { data: tests } = await sb
    .from('tests')
    .select('id, title, payload')
    .in('id', attempts.map(a => a.test_id));

  console.log('--- Tests Details ---');
  (tests || []).forEach(t => {
    if (t.title?.includes('Tourism') || t.title?.includes('2nd Vocabulary B')) {
      console.log(`Test: ${t.title}`);
      console.log(`  Payload prerequisites:`, t.payload?.prerequisites);
      console.log(`  Payload pass_threshold:`, t.payload?.pass_threshold || t.payload?.passing_score);
      console.log(`  Payload full:`, JSON.stringify(t.payload, null, 2));
    }
  });
}

main().catch(console.error);
