import { getSupabase } from '../js/supabase.js';

async function testGating() {
  const sb = await getSupabase();
  const ayyaId = 'bae52c8d-3456-4334-8f7a-7ba3c268c642';
  const adindaId = '66d73c5f-3f58-41d0-9be9-aad3158afb62';

  // Find 2C1 and 2C2 tests
  const { data: tests } = await sb.from('tests')
    .select('id, title, shell_code, class_id, level_id, payload, minimum_required_score')
    .in('shell_code', ['2C1-WORDS-TASK', '2C2-WORDS-TASK']);

  const c1 = tests.find(t => t.shell_code === '2C1-WORDS-TASK');
  const c2 = tests.find(t => t.shell_code === '2C2-WORDS-TASK');

  console.log('Test C1:', c1?.title, 'minScore:', c1?.minimum_required_score);
  console.log('Test C2:', c2?.title, 'minScore:', c2?.minimum_required_score);

  for (const st of [{ id: ayyaId, name: 'Ayya (7 passes)' }, { id: adindaId, name: 'Adinda (6 passes)' }]) {
    // Check passes on C1
    const { data: atts } = await sb.from('attempts')
      .select('percentage, effective_score, status, is_forgiven')
      .eq('student_id', st.id)
      .eq('test_id', c1.id)
      .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED']);

    let passes = 0;
    const minReq = Number(c1.minimum_required_score || 50);
    atts.forEach(a => {
      if (a.is_forgiven) passes++;
      else {
        const pct = a.effective_score != null ? Number(a.effective_score) : Number(a.percentage || 0);
        if (pct >= minReq) passes++;
      }
    });

    console.log(`\n${st.name}: C1 passes = ${passes}/7`);
    const canAdvanceToC2 = passes >= 7;
    console.log(`Eligible for C2? ${canAdvanceToC2 ? 'YES - PASS' : 'NO - MUST COMPLETE DRILL (' + passes + '/7)'}`);
  }
}

testGating().catch(console.error);

