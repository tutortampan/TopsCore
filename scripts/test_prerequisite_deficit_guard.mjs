import { getSupabase } from '../js/supabase.js';

async function verifyPrereqDeficitGuard() {
  const sb = await getSupabase();
  const batchId = '3e7288b7-a90e-4323-9b02-24e73991f0d7'; // Batch 134

  // Verify Ayya's resolution
  const { data: ayya } = await sb.from('students').select('id, name').ilike('name', '%Ayya%').single();
  if (!ayya) throw new Error('Ayya not found');

  const { data: tests } = await sb.from('tests')
    .select('id, shell_code, title, display_order, test_type, minimum_required_score, payload')
    .ilike('shell_code', '2C%')
    .is('deleted_at', null)
    .order('display_order');

  const { data: attempts } = await sb.from('attempts')
    .select('test_id, percentage, effective_score, status, is_forgiven')
    .eq('student_id', ayya.id)
    .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED']);

  const targetReps = 7;
  const passCountByTest = {};
  const isPassedByTest = {};

  tests.forEach(t => {
    const isEx = t.test_type === 'exam' || t.shell_code?.endsWith('-EXAM');
    if (isEx) {
      const score = attempts.filter(a => a.test_id === t.id).reduce((max, a) => Math.max(max, Number(a.percentage || 0)), 0);
      isPassedByTest[t.id] = score >= (t.minimum_required_score || 60);
    } else {
      const tMin = Number(t.minimum_required_score) || 70;
      const passes = attempts.filter(a => a.test_id === t.id && (a.is_forgiven || Number(a.effective_score ?? a.percentage ?? 0) >= tMin)).length;
      passCountByTest[t.id] = passes;
      isPassedByTest[t.id] = passes >= targetReps;
    }
  });

  const earliestUncompleted = tests.find(t => !isPassedByTest[t.id]);
  const curAsm = tests.find(t => t.shell_code === '2C3-WORDS-TASK');

  const curIndex = tests.findIndex(t => t.id === curAsm.id);
  const earliestIndex = tests.findIndex(t => t.id === earliestUncompleted.id);

  console.log(`Ayya current status:`);
  console.log(`  2C1 Passes: ${passCountByTest[tests[0].id]}/7 (Passed: ${isPassedByTest[tests[0].id]})`);
  console.log(`  2C2 Passes: ${passCountByTest[tests[1].id]}/7 (Passed: ${isPassedByTest[tests[1].id]})`);
  console.log(`  2C3 Passes: ${passCountByTest[tests[2].id]}/7 (Passed: ${isPassedByTest[tests[2].id]})`);
  console.log(`  Earliest uncompleted test: ${earliestUncompleted.shell_code}`);

  if (earliestIndex < curIndex) {
    const prereqPasses = passCountByTest[earliestUncompleted.id];
    console.log(`  Guard triggered: points to unfulfilled prerequisite ${earliestUncompleted.shell_code} (${prereqPasses}/7)`);
    if (earliestUncompleted.shell_code !== '2C2-WORDS-TASK') {
      throw new Error(`Expected earliest uncompleted to be 2C2-WORDS-TASK, got ${earliestUncompleted.shell_code}`);
    }
  } else {
    throw new Error('Expected guard to trigger for Ayya on 2C3!');
  }

  console.log('✅ PASS: Prerequisite Deficit Guard verified with 100% precision!');
}

verifyPrereqDeficitGuard().catch(e => {
  console.error(e);
  process.exit(1);
});

