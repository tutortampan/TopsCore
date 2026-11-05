import { getSupabase } from '../js/supabase.js';

async function main() {
  const sb = await getSupabase();
  const ayyaId = 'bae52c8d-3456-4334-8f7a-7ba3c268c642';
  const adindaId = '66d73c5f-3f58-41d0-9be9-aad3158afb62';

  const { data: students } = await sb.from('students').select('id, name').in('id', [ayyaId, adindaId]);
  console.log('Students:', students);

  for (const st of (students || [])) {
    const { data: atts } = await sb.from('attempts')
      .select('id, test_id, percentage, effective_score, status, created_at, tests(title, shell_code, minimum_required_score)')
      .eq('student_id', st.id)
      .order('created_at', { ascending: false });
    
    console.log(`\n=== Attempts for ${st.name} (Total: ${atts?.length || 0}) ===`);
    const c1Atts = (atts || []).filter(a => a.tests?.shell_code === '2C1-WORDS-TASK');
    console.log(`2C1-WORDS-TASK attempts (${c1Atts.length}):`);
    c1Atts.forEach(a => {
      console.log(`  - status: ${a.status}, pct: ${a.percentage}, eff: ${a.effective_score}, date: ${a.created_at}`);
    });
    const c2Atts = (atts || []).filter(a => a.tests?.shell_code === '2C2-WORDS-TASK');
    console.log(`2C2-WORDS-TASK attempts (${c2Atts.length}):`);
    c2Atts.forEach(a => {
      console.log(`  - status: ${a.status}, pct: ${a.percentage}, eff: ${a.effective_score}, date: ${a.created_at}`);
    });
  }
}

main().catch(console.error);

