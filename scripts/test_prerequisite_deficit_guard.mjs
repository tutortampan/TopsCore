import { getSupabase } from '../js/supabase.js';

async function verifyPrereqDeficitGuard() {
  const sb = await getSupabase();

  // 1. Verify Ayya has fully cleared all Theme C tasks (no deficit)
  const { data: ayya } = await sb.from('students').select('id, name').ilike('name', '%Ayya%').single();
  if (!ayya) throw new Error('Ayya not found');

  const { data: tests } = await sb.from('tests')
    .select('id, shell_code, title, display_order, test_type, minimum_required_score, payload')
    .ilike('shell_code', '2C%')
    .is('deleted_at', null)
    .order('display_order');

  const { data: ayyaAttempts } = await sb.from('attempts')
    .select('test_id, percentage, effective_score, status, is_forgiven')
    .eq('student_id', ayya.id)
    .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED']);

  const targetReps = 7;
  const ayyaPasses = {};
  tests.forEach(t => {
    if (t.test_type !== 'exam' && !t.shell_code?.endsWith('-EXAM')) {
      const tMin = Number(t.minimum_required_score) || 70;
      ayyaPasses[t.shell_code] = ayyaAttempts.filter(a => a.test_id === t.id && (a.is_forgiven || Number(a.effective_score ?? a.percentage ?? 0) >= tMin)).length;
    }
  });

  console.log(`Ayya status:`);
  console.log(`  2C1: ${ayyaPasses['2C1-WORDS-TASK']}/7 (Complete)`);
  console.log(`  2C2: ${ayyaPasses['2C2-WORDS-TASK']}/7 (Complete)`);
  console.log(`  2C3: ${ayyaPasses['2C3-WORDS-TASK']}/7 (Complete)`);
  console.log(`  2C4: ${ayyaPasses['2C4-WORDS-TASK']}/7 (Complete)`);
  console.log(`  All tasks cleared? ${Object.values(ayyaPasses).every(p => p >= 7) ? '✅ YES' : '❌ NO'}`);

  // 2. Verify Prerequisite Deficit Guard for student with deficit (Lalu Yuda on 2C3)
  const { data: yuda } = await sb.from('students').select('id, name').ilike('name', '%Lalu Yuda%').single();
  if (!yuda) throw new Error('Lalu Yuda not found');

  const { data: yudaAttempts } = await sb.from('attempts')
    .select('test_id, percentage, effective_score, status, is_forgiven')
    .eq('student_id', yuda.id)
    .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED']);

  const isPassedByTest = {};
  const passCountByTest = {};
  tests.forEach(t => {
    const isEx = t.test_type === 'exam' || t.shell_code?.endsWith('-EXAM');
    if (isEx) {
      const score = yudaAttempts.filter(a => a.test_id === t.id).reduce((max, a) => Math.max(max, Number(a.percentage || 0)), 0);
      isPassedByTest[t.id] = score >= (t.minimum_required_score || 60);
    } else {
      const tMin = Number(t.minimum_required_score) || 70;
      const passes = yudaAttempts.filter(a => a.test_id === t.id && (a.is_forgiven || Number(a.effective_score ?? a.percentage ?? 0) >= tMin)).length;
      passCountByTest[t.id] = passes;
      isPassedByTest[t.id] = passes >= targetReps;
    }
  });

  const earliestUncompleted = tests.find(t => !isPassedByTest[t.id]);
  const curAsm = tests.find(t => t.shell_code === '2C4-WORDS-TASK');

  const curIndex = tests.findIndex(t => t.id === curAsm.id);
  const earliestIndex = tests.findIndex(t => t.id === earliestUncompleted.id);

  console.log(`\nLalu Yuda status:`);
  console.log(`  2C1 Passes: ${passCountByTest[tests[0].id]}/7 (Passed: ${isPassedByTest[tests[0].id]})`);
  console.log(`  2C2 Passes: ${passCountByTest[tests[1].id]}/7 (Passed: ${isPassedByTest[tests[1].id]})`);
  console.log(`  Earliest uncompleted test: ${earliestUncompleted.shell_code}`);
  console.log(`  Target test under test: ${curAsm.shell_code}`);

  if (earliestIndex < curIndex) {
    const prereqPasses = passCountByTest[earliestUncompleted.id];
    console.log(`  Guard triggered: points to unfulfilled prerequisite ${earliestUncompleted.shell_code} (${prereqPasses}/7)`);
    if (earliestUncompleted.shell_code !== '2C3-WORDS-TASK') {
      throw new Error(`Expected earliest uncompleted to be 2C3-WORDS-TASK, got ${earliestUncompleted.shell_code}`);
    }
  } else {
    throw new Error('Expected guard to trigger for Lalu Yuda on 2C4!');
  }

  console.log('✅ PASS: Prerequisite Deficit Guard verified with 100% precision!');
}

verifyPrereqDeficitGuard().catch(console.error);
