import { getSupabase } from '../js/supabase.js';

async function main() {
  const sb = await getSupabase();
  const { data: students } = await sb.from('students').select('*').ilike('name', '%suke ajai%');
  const suke = students[0];
  console.log('Suke Ajai:', { id: suke.id, name: suke.name, level_id: suke.level_id, batch_id: suke.batch_id });

  const studentClasses = [{ id: 'ab33498a-90e6-44b7-83f4-5765f964543e', name: '3rd Vocabulary', level_id: '51589e1a-d96e-496e-92a3-d9d350483555' }];
  console.log('Classes found for level:', studentClasses.map(c => ({ id: c.id, name: c.name, level_id: c.level_id })));

  // 2. Fetch attempts
  const { data: attempts } = await sb.from('attempts').select('*').eq('student_id', suke.id);
  console.log(`Total attempts for Suke: ${attempts.length}`);

  // 3. Fetch tests
  const query = sb.from('tests').select('id, title, display_name, test_subtype, category, payload, class_id, level_id, display_order, status, minimum_required_score, prerequisite_test_id, working_duration_minutes, schedule_mode, test_type, is_dynamic_shell, shell_code, max_attempts, retake_allowed, created_at, deleted_at, classes(name), levels(name, level_number)').is('deleted_at', null);
  const { data: allTests, error: testErr } = await query;
  if (testErr) console.error('testErr:', testErr);
  console.log(`Total active tests: ${allTests ? allTests.length : 0}`);

  // 4. Test renderClasses logic for Suke:
  const studentLevelNum = 3; // 3rd level
  const subj = studentClasses[0]; // 3rd Vocabulary
  const classAssms = (allTests || []).filter(a => {
    if (a.deleted_at) return false;
    const matchClass = (a.class_id || a.Class_id) === subj.id;
    const matchStatus = (a.status || 'PUBLISHED').toUpperCase() === 'PUBLISHED';
    if (!matchClass || !matchStatus) return false;
    const aLvlNum = a.levels?.level_number;
    if (aLvlNum != null && studentLevelNum != null) {
      return aLvlNum <= studentLevelNum;
    }
    return true;
  });
  console.log(`classAssms for 3rd Vocabulary: ${classAssms.length}`);

  const completedAssmIds = new Set(
    (attempts || [])
      .filter(att => {
        const s = (att.status || '').toLowerCase();
        return s === 'submitted' || s === 'completed' || s === 'auto_submitted';
      })
      .map(att => att.test_id || att.Test_id)
      .filter(Boolean)
  );
  const completedCount = classAssms.filter(a => completedAssmIds.has(a.id)).length;
  console.log(`completedCount for Suke in 3rd Vocabulary: ${completedCount}`);
  console.log(`Calculated pct: Math.round((${completedCount} / ${classAssms.length}) * 100) = ${Math.round((completedCount / classAssms.length) * 100)}%`);

  // 5. Test renderNextAssignmentHero logic for Suke:
  const bestMap = {};
  (attempts || []).forEach(a => {
    const aid = a.test_id;
    const pct = parseFloat(a.percentage || 0);
    if (bestMap[aid] == null || pct > bestMap[aid]) {
      bestMap[aid] = pct;
    }
  });

  const myClassIds = new Set(studentClasses.map(c => c.id));
  const activeClassId = subj.id;
  let published = (allTests || []).filter(a => {
    if (a.deleted_at) return false;
    const status = (a.status || '').toUpperCase();
    if (status !== 'PUBLISHED' && status !== 'ACTIVE') return false;
    if (activeClassId) return a.class_id === activeClassId;
    return myClassIds.has(a.class_id);
  });

  published.sort((a, b) => {
    const ordA = a.display_order ?? 999;
    const ordB = b.display_order ?? 999;
    if (ordA !== ordB) return ordA - ordB;
    return (a.title || '').localeCompare(b.title || '');
  });

  console.log(`Published tests for hero in 3rd Vocabulary: ${published.length}`);
  const isPassed = (asm) => {
    const score = bestMap[asm.id];
    if (score == null) return false;
    const req = asm.minimum_required_score || 60;
    return score >= req;
  };

  const nextAsm = published.find(a => !isPassed(a));
  console.log('Next unpassed assignment:', nextAsm ? { id: nextAsm.id, title: nextAsm.title, display_order: nextAsm.display_order } : 'NONE (ALL COMPLETED!)');

  if (!nextAsm) {
    console.log('Why was nextAsm not found? Let us inspect all published tests and their pass status:');
    published.forEach((p, idx) => {
      console.log(`[${idx + 1}] ${p.title} (status: ${p.status}, ord: ${p.display_order}) -> score: ${bestMap[p.id]} -> passed: ${isPassed(p)}`);
    });
  }
}

main().catch(console.error);
