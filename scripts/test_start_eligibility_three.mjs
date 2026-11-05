import { getSupabase } from '../js/supabase.js';

async function testStartTestEligibility() {
  const sb = await getSupabase();
  const vocab2ClassId = '2ccf6468-1e03-41d1-b72b-1d84dcad85b2';

  const { data: tests } = await sb.from('tests')
    .select('id, title, shell_code, minimum_required_score, payload, class_id, level_id, test_type')
    .eq('class_id', vocab2ClassId)
    .is('deleted_at', null);

  const c1 = tests.find(t => t.shell_code === '2C1-WORDS-TASK');
  const c2 = tests.find(t => t.shell_code === '2C2-WORDS-TASK');
  const c3 = tests.find(t => t.shell_code === '2C3-WORDS-TASK');

  const testCases = [
    { name: 'Farobi (69% on 2B Exam)', id: '60b73aba-b99c-4227-9615-b8e296538d5a', test: c1, targetDesc: 'C1 (active task, 6/7 passes)' },
    { name: 'Farobi (69% on 2B Exam)', id: '60b73aba-b99c-4227-9615-b8e296538d5a', test: c2, targetDesc: 'C2 (trying to advance before C1 is 7/7)' },
    { name: 'Lifurahma (60% on 2B Exam)', id: '8422cae8-7fe5-45c4-b596-ec6f7bdb7f3c', test: c1, targetDesc: 'C1 (active task, 2/7 passes)' },
    { name: 'Cinta Laura (63% on 2B Exam)', id: '240b1078-79f8-4158-9298-ffde0addb2e6', test: c2, targetDesc: 'C2 (active task, 2/7 passes)' },
    { name: 'Cinta Laura (63% on 2B Exam)', id: '240b1078-79f8-4158-9298-ffde0addb2e6', test: c3, targetDesc: 'C3 (trying to advance before C2 is 7/7)' },
    { name: 'Adinda (60% on 2B Exam)', id: '66d73c5f-3f58-41d0-9be9-aad3158afb62', test: c1, targetDesc: 'C1 (active task, 6/7 passes)' },
    { name: 'Ariwil (60% on 2B Exam)', id: '547d7074-01e5-49d3-a0ef-08dbe1268143', test: c1, targetDesc: 'C1 (active task, 2/7 passes)' }
  ];

  console.log('=== TESTING COMPLETE START_TEST ELIGIBILITY PER STUDENT ===\n');

  for (const tc of testCases) {
    const studentId = tc.id;
    const asmData = tc.test;

    let allowed = true;
    let blockReason = '';

    // 1. Cross-Theme Exam Gating Check (Section 5b with dynamic pe.minimum_required_score)
    const currentThemeFallback = String(asmData.payload?.theme_code || asmData.shell_code?.replace(/^[0-9]+/, '').charAt(0) || '').toUpperCase();
    const themeSeqFallback = ['A', 'B', 'C', 'D'];
    const curThemeIdxFallback = themeSeqFallback.indexOf(currentThemeFallback);

    if (curThemeIdxFallback > 0) {
      const priorTheme = themeSeqFallback[curThemeIdxFallback - 1];
      const matchingPriorExams = tests.filter(t => {
        const tc2 = t.payload?.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : '');
        return String(tc2).toUpperCase() === priorTheme && t.test_type === 'exam';
      });

      if (matchingPriorExams.length > 0) {
        const priorExamIds = matchingPriorExams.map(t => t.id);
        const { data: priorAttempts } = await sb.from('attempts')
          .select('test_id, percentage, effective_score, status, is_remedial_unlocked, is_forgiven')
          .eq('student_id', studentId)
          .in('test_id', priorExamIds)
          .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED']);

        const passedPriorIds = new Set();
        (priorAttempts || []).forEach(att => {
          const pe = matchingPriorExams.find(e => e.id === att.test_id);
          const reqScore = Number(pe?.minimum_required_score) || Number(pe?.payload?.min_score) || 60;
          const pct = att.effective_score != null ? Number(att.effective_score) : Number(att.percentage || 0);
          if (pct >= reqScore || att.is_remedial_unlocked || att.is_forgiven) {
            passedPriorIds.add(att.test_id);
          }
        });

        const failedAny = priorExamIds.some(id => !passedPriorIds.has(id));
        if (failedAny) {
          allowed = false;
          blockReason = `Cross-theme check failed: Theme ${priorTheme} Exam not passed.`;
        }
      }
    }

    // 2. Linear Topic Gating (Section 3)
    if (allowed) {
      const topicCodeFallback = asmData.payload?.topic_code;
      const cleanTopicNumFallback = parseInt(String(topicCodeFallback || '').replace(/^[A-Za-z]+/, ''), 10);

      if (cleanTopicNumFallback > 1) {
        const priorTopicNum = cleanTopicNumFallback - 1;
        const filteredPriorTasks = tests.filter(t => {
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
    }

    console.log(`${tc.name} -> Target: ${tc.targetDesc}:`);
    console.log(`  Allowed to start? ${allowed ? '✅ YES' : '❌ NO: ' + blockReason}\n`);
  }
}

testStartTestEligibility().catch(console.error);
