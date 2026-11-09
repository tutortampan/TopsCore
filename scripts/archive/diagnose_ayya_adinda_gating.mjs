import { getSupabase } from '../js/supabase.js';

async function diagnose() {
  const sb = await getSupabase();
  const ayyaId = 'bae52c8d-3456-4334-8f7a-7ba3c268c642';
  const adindaId = '66d73c5f-3f58-41d0-9be9-aad3158afb62';

  const { data: tests } = await sb.from('tests')
    .select('id, title, shell_code, prerequisite_test_id, prerequisite_id, minimum_required_score, payload, test_type')
    .order('shell_code');
  const testMap = new Map((tests || []).map(t => [t.id, t]));

  for (const [sName, sId] of [['Ayya Sofyandi', ayyaId], ['Adinda Karunia', adindaId]]) {
    console.log('\n======================================================');
    console.log(`ATTEMPTS FOR: ${sName} (${sId})`);
    console.log('======================================================');

    const { data: atts } = await sb.from('attempts')
      .select('id, test_id, score, total_questions, percentage, effective_score, status, is_forgiven, is_remedial_unlocked, grade, created_at, submitted_at')
      .eq('student_id', sId)
      .order('created_at', { ascending: true });

    console.log(`Total attempts recorded: ${atts?.length || 0}`);

    const byTest = {};
    for (const a of (atts || [])) {
      if (!byTest[a.test_id]) byTest[a.test_id] = [];
      byTest[a.test_id].push(a);
    }

    for (const t of (tests || [])) {
      const tAtts = byTest[t.id];
      if (!tAtts || tAtts.length === 0) continue;

      const minScore = t.minimum_required_score || 50;
      const targetReps = t.payload?.task_repetitions ?? 7;
      const passes = tAtts.filter(a => {
        const eff = Number(a.effective_score ?? a.percentage ?? 0);
        return eff >= minScore || a.is_forgiven;
      }).length;

      const isTask = (t.test_type || '').toLowerCase() === 'task' || (t.shell_code || '').includes('TASK');

      console.log(`\n[${t.shell_code}] "${t.title}"`);
      console.log(`   Type: ${t.test_type} | MinScore: ${minScore}% | Payload Reps: ${targetReps} | Prereq: ${t.prerequisite_test_id ? testMap.get(t.prerequisite_test_id)?.shell_code : 'NONE'}`);
      console.log(`   Attempts Count: ${tAtts.length} | Qualified Passes: ${passes} | Pass Req Met (>= 7?): ${passes >= 7} | Met (>= 6?): ${passes >= 6}`);
      
      tAtts.forEach((a, i) => {
        const eff = a.effective_score ?? a.percentage;
        console.log(`     ${i+1}. [${a.status}] Score: ${a.score}/${a.total_questions} (${a.percentage}%, eff: ${eff}%) Grade: ${a.grade} Forgiven: ${a.is_forgiven} Time: ${a.created_at?.slice(0,19)}`);
      });
    }

    // Now check which tests are unlocked or locked for this student
    console.log(`\n--- PREREQUISITE CHAIN AUDIT FOR ${sName} ---`);
    for (const t of (tests || [])) {
      if (t.shell_code?.startsWith('2')) { // 2nd Vocabulary
        const tAtts = byTest[t.id] || [];
        const minScore = t.minimum_required_score || 50;
        const passes = tAtts.filter(a => Number(a.effective_score ?? a.percentage ?? 0) >= minScore || a.is_forgiven).length;
        
        let prereqMet = true;
        let prereqMsg = 'No prereq';
        if (t.prerequisite_test_id) {
          const prereqTest = testMap.get(t.prerequisite_test_id);
          const prereqAtts = byTest[t.prerequisite_test_id] || [];
          const prereqMin = prereqTest?.minimum_required_score || 50;
          const prereqPasses = prereqAtts.filter(a => Number(a.effective_score ?? a.percentage ?? 0) >= prereqMin || a.is_forgiven).length;
          const prereqIsTask = (prereqTest?.test_type || '').toLowerCase() === 'task' || (prereqTest?.shell_code || '').includes('TASK');
          
          if (prereqIsTask) {
            // Task prereq requires passes
            prereqMet = prereqPasses >= 7; // or 6?
            prereqMsg = `Prereq [${prereqTest?.shell_code}] passes: ${prereqPasses} (>=7: ${prereqPasses >= 7}, >=6: ${prereqPasses >= 6})`;
          } else {
            // Exam prereq requires 1 pass
            prereqMet = prereqPasses >= 1;
            prereqMsg = `Prereq [${prereqTest?.shell_code}] exam pass: ${prereqPasses >= 1}`;
          }
        }
        console.log(`   ${t.shell_code.padEnd(16)} | Passes: ${passes} | ${prereqMsg}`);
      }
    }
  }
}

diagnose().catch(console.error);

