import { getSupabase } from '../js/supabase.js';

async function testFetchStudentTaskPassCounts() {
  const sb = await getSupabase();
  const ayyaId = 'bae52c8d-3456-4334-8f7a-7ba3c268c642';
  const adindaId = '66d73c5f-3f58-41d0-9be9-aad3158afb62';
  const classId = '2ccf6468-1e03-41d1-b72b-1d84dcad85b2';

  for (const stId of [ayyaId, adindaId]) {
    const { data: student } = await sb.from('students').select('name').eq('id', stId).single();
    
    // Simulate updated fetchStudentTaskPassCounts logic
    const { data, error } = await sb.from('attempts')
      .select('test_id, percentage, effective_score, score, status, is_forgiven, tests!inner(id, class_id, test_type, category, test_subtype, minimum_required_score, payload, shell_code)')
      .eq('student_id', stId)
      .eq('tests.class_id', classId)
      .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED']);

    if (error) {
      console.error(error);
      return;
    }

    const passCounts = {};
    const shellCounts = {};
    for (const a of data) {
      if (!a.test_id) continue;
      const shell = a.tests?.shell_code || a.test_id;
      if (a.is_forgiven) {
        passCounts[a.test_id] = Math.max(passCounts[a.test_id] || 0, 7);
        shellCounts[shell] = Math.max(shellCounts[shell] || 0, 7);
      } else {
        const minReq = Number(a.tests?.minimum_required_score || a.tests?.payload?.min_score || 50);
        const pct = a.effective_score != null ? Number(a.effective_score) : parseFloat(a.percentage ?? a.score ?? 0);
        if (pct >= minReq) {
          passCounts[a.test_id] = (passCounts[a.test_id] || 0) + 1;
          shellCounts[shell] = (shellCounts[shell] || 0) + 1;
        }
      }
    }

    console.log(`\n=== Student: ${student.name} ===`);
    console.log('Pass Counts by Shell:', shellCounts);
  }
}

testFetchStudentTaskPassCounts().catch(console.error);

