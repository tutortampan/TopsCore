import { getSupabase } from '../js/supabase.js';

async function testStartTestEligibility() {
  const sb = await getSupabase();
  const vocab2ClassId = '2ccf6468-1e03-41d1-b72b-1d84dcad85b2';

  const { data: tests } = await sb.from('tests')
    .select('id, title, shell_code, minimum_required_score, payload, class_id, level_id')
    .eq('class_id', vocab2ClassId)
    .is('deleted_at', null);

  const c1 = tests.find(t => t.shell_code === '2C1-WORDS-TASK');
  const c2 = tests.find(t => t.shell_code === '2C2-WORDS-TASK');
  const c3 = tests.find(t => t.shell_code === '2C3-WORDS-TASK');

  const testCases = [
    { name: 'Farobi', id: '60b73aba-b99c-4227-9615-b8e296538d5a', test: c1, targetDesc: 'C1 (his active task, 6/7)' },
    { name: 'Farobi', id: '60b73aba-b99c-4227-9615-b8e296538d5a', test: c2, targetDesc: 'C2 (trying to advance before 7/7)' },
    { name: 'Alifurrahman', id: '8422cae8-7fe5-45c4-b596-ec6f7bdb7f3c', test: c1, targetDesc: 'C1 (his active task, 2/7)' },
    { name: 'Alifurrahman', id: '8422cae8-7fe5-45c4-b596-ec6f7bdb7f3c', test: c2, targetDesc: 'C2 (trying to advance before 7/7)' },
    { name: 'Cinta Laura', id: '240b1078-79f8-4158-9298-ffde0addb2e6', test: c2, targetDesc: 'C2 (her active task, 2/7)' },
    { name: 'Cinta Laura', id: '240b1078-79f8-4158-9298-ffde0addb2e6', test: c3, targetDesc: 'C3 (trying to advance before C2 is 7/7)' }
  ];

  console.log('=== TESTING START_TEST ELIGIBILITY PER STUDENT ===\n');

  for (const tc of testCases) {
    const studentId = tc.id;
    const asmData = tc.test;

    // Run exact startTest prerequisite validation logic from js/api.js lines 1476-1520
    const currentThemeFallback = String(asmData.payload?.theme_code || asmData.shell_code?.replace(/^[0-9]+/, '').charAt(0) || '').toUpperCase();
    const topicCodeFallback = asmData.payload?.topic_code;
    const cleanTopicNumFallback = parseInt(String(topicCodeFallback || '').replace(/^[A-Za-z]+/, ''), 10);

    let allowed = true;
    let blockReason = '';

    if (cleanTopicNumFallback > 1) {
      const priorTopicNum = cleanTopicNumFallback - 1;
      const { data: priorTopicTasks } = await sb.from('tests')
        .select('id, title, payload, shell_code, test_type, test_subtype, category, minimum_required_score')
        .eq('class_id', asmData.class_id)
        .eq('level_id', asmData.level_id)
        .is('deleted_at', null);

      const filteredPriorTasks = (priorTopicTasks || []).filter(t => {
        if (t.test_type === 'exam' || t.shell_code?.endsWith('-EXAM')) return false;
        const tc2 = t.payload?.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : '');
        if (String(tc2).toUpperCase() !== currentThemeFallback) return false;
        const topNum = parseInt(String(t.payload?.topic_code || '').replace(/^[A-Za-z]+/, ''), 10);
        return topNum === priorTopicNum;
      });

      if (filteredPriorTasks.length > 0) {
        const targetReps = 7;
        const priorTaskIds = filteredPriorTasks.map(t => t.id);
        const { data: priorTaskAttempts } = await sb.from('attempts')
          .select('test_id, percentage, effective_score, status, is_forgiven')
          .eq('student_id', studentId)
          .in('test_id', priorTaskIds)
          .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED']);

        const taskMap = Object.fromEntries(filteredPriorTasks.map(t => [t.id, t]));
        const passCountByTask = {};
        (priorTaskAttempts || []).forEach(att => {
          if (att.is_forgiven) {
            passCountByTask[att.test_id] = Math.max(passCountByTask[att.test_id] || 0, targetReps);
          } else {
            const pct = att.effective_score != null ? Number(att.effective_score) : Number(att.percentage || 0);
            const minReq = Number(taskMap[att.test_id]?.minimum_required_score || taskMap[att.test_id]?.payload?.min_score || 50);
            if (pct >= minReq) {
              passCountByTask[att.test_id] = (passCountByTask[att.test_id] || 0) + 1;
            }
          }
        });

        const unmasteredTask = filteredPriorTasks.find(t => (passCountByTask[t.id] || 0) < targetReps);
        if (unmasteredTask) {
          allowed = false;
          const unCount = passCountByTask[unmasteredTask.id] || 0;
          blockReason = `Prerequisite not completed: ${unmasteredTask.shell_code} has only ${unCount}/${targetReps} passes.`;
        }
      }
    }

    console.log(`${tc.name} -> Target: ${tc.targetDesc}:`);
    console.log(`  Allowed to start? ${allowed ? '✅ YES' : '❌ NO: ' + blockReason}\n`);
  }
}

testStartTestEligibility().catch(console.error);

