import { getSupabase } from '../js/supabase.js';

async function main() {
  const sb = await getSupabase();
  const { data: atts } = await sb.from('attempts')
    .select('id, student_id, test_id, status, started_at, tests(title, shell_code), students(name)')
    .eq('status', 'in_progress');

  console.log('=== CURRENTLY IN_PROGRESS ATTEMPTS IN DB ===');
  atts.forEach(a => {
    console.log(`[${a.id}] ${a.students?.name} on ${a.tests?.shell_code} (${a.tests?.title}) started at ${a.started_at}`);
  });
}
main().catch(console.error);
