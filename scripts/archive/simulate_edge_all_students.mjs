import { getSupabase } from '../js/supabase.js';

async function main() {
  const sb = await getSupabase();
  const batchId = '3e7288b7-a90e-4323-9b02-24e73991f0d7';
  
  const { data: students } = await sb.from('students').select('id, name').eq('batch_id', batchId).order('name');
  
  const { data: tests } = await sb.from('tests')
    .select('id, title, shell_code, test_type, payload, minimum_required_score')
    .eq('class_id', '2ccf6468-1e03-41d1-b72b-1d84dcad85b2')
    .is('deleted_at', null)
    .order('display_order');

  const { data: allAttempts } = await sb.from('attempts')
    .select('student_id, test_id, percentage, effective_score, status, is_remedial, is_remedial_unlocked, is_forgiven')
    .in('student_id', students.map(s => s.id));

  console.log('=== SIMULATING EDGE FUNCTION start-test ON ALL STUDENTS FOR THEME C ===\n');

  const themeSeq = ['A', 'B', 'C', 'D'];
  const themeCTests = tests.filter(t => (t.payload?.theme_code || t.shell_code?.charAt(1)) === 'C');

  for (const s of students) {
    const sAtts = allAttempts.filter(a => a.student_id === s.id);
    console.log(`👤 ${s.name}:`);

    for (const t of themeCTests) {
      // Replicate edge function checks:
      const currentThemeEdge = 'C';
      const curThemeIdxEdge = 2; // C is index 2
      const priorTheme = 'B';

      // Check Section 5b: Prior Theme Exam
      const priorExams = tests.filter(a => a.test_type === 'exam' && (a.payload?.theme_code || a.shell_code?.charAt(1)) === priorTheme);
      const priorExamIds = priorExams.map(pe => pe.id);

      const passedPriorIds = new Set();
      priorExams.forEach(pe => {
        const peMin = pe.minimum_required_score || 60;
        sAtts.filter(a => a.test_id === pe.id).forEach(att => {
          const pct = att.effective_score != null ? Number(att.effective_score) : Number(att.percentage || 0);
          // Check with 70% threshold (CURRENT BUGGY EDGE CODE)
          if (pct >= 70 || att.is_remedial_unlocked || att.is_forgiven) {
            passedPriorIds.add(att.test_id);
          }
        });
      });

      const failedPriorExamWith70 = priorExamIds.some(id => !passedPriorIds.has(id));

      // Also check with pe.minimum_required_score (60% threshold)
      const passedPriorIdsWith60 = new Set();
      priorExams.forEach(pe => {
        const peMin = pe.minimum_required_score || 60;
        sAtts.filter(a => a.test_id === pe.id).forEach(att => {
          const pct = att.effective_score != null ? Number(att.effective_score) : Number(att.percentage || 0);
          if (pct >= peMin || att.is_remedial_unlocked || att.is_forgiven) {
            passedPriorIdsWith60.add(att.test_id);
          }
        });
      });
      const failedPriorExamWith60 = priorExamIds.some(id => !passedPriorIdsWith60.has(id));

      // Check linear topic gating
      const topNum = parseInt(String(t.payload?.topic_code || t.shell_code?.match(/C(\d)/)?.[1] || '1'), 10);
      let linearGatingBlocked = false;
      let linearGatingReason = '';

      if (t.test_type !== 'exam' && topNum > 1) {
        const priorTopNum = topNum - 1;
        const priorTask = tests.find(a => a.test_type !== 'exam' && (a.payload?.theme_code || a.shell_code?.charAt(1)) === 'C' && parseInt(String(a.payload?.topic_code || a.shell_code?.match(/C(\d)/)?.[1] || '0'), 10) === priorTopNum);
        if (priorTask) {
          const passes = sAtts.filter(a => a.test_id === priorTask.id && (a.is_forgiven || (a.effective_score != null ? Number(a.effective_score) : Number(a.percentage || 0)) >= 50)).length;
          if (passes < 7) {
            linearGatingBlocked = true;
            linearGatingReason = `Prior topic C${priorTopNum} has only ${passes}/7 passes`;
          }
        }
      }

      const issues = [];
      if (failedPriorExamWith70) issues.push('❌ BLOCKED by Section 5b (Theme B Exam < 70%)');
      if (failedPriorExamWith60) issues.push('❌ BLOCKED by Theme B Exam even at 60%');
      if (linearGatingBlocked) issues.push(`🔒 Linear gating: ${linearGatingReason}`);

      const result = issues.length > 0 ? issues.join(' | ') : '✅ ALLOWED';
      console.log(`   - ${t.shell_code} (${t.title.substring(0, 30)}): ${result}`);
    }
    console.log('');
  }
}
main().catch(console.error);
