import fs from 'fs';
import assert from 'assert';
import { createClient } from '@supabase/supabase-js';

console.log('=== TEST: VERIFY TEST BLUEPRINT PROGRAM SCOPING (PHASE 420) ===\n');

// 1. Static Code Analysis on js/admin/vocab-vault.js
console.log('[1] Verifying js/admin/vocab-vault.js static structure:');
const vaultJs = fs.readFileSync('js/admin/vocab-vault.js', 'utf8');

assert.ok(vaultJs.includes('freshAssignments'), 'Must fetch freshAssignments in _renderThemeBlueprintTab');
assert.ok(vaultJs.includes('const isThemeAssignedToProgram ='), 'Must define isThemeAssignedToProgram helper');
assert.ok(vaultJs.includes('assignSet.has(`${thCode}_${lvl}_${selectedProgId}`)'), 'Must check assignSet for program assignment');
assert.ok(vaultJs.includes('if (!isThemeAssignedToProgram(lvl, th.code, targetClass?.id)) return;'), 'KPI scan loop must exclude unassigned themes');
assert.ok(vaultJs.includes('if (!isThemeAssignedToProgram(lvl, thCode, targetClass?.id)) return;'), 'Table row builder must exclude unassigned themes');
assert.ok(vaultJs.includes('No Curriculum Themes Found'), 'Empty state must be friendly and informative');
console.log('  ✅ Static assertions passed in js/admin/vocab-vault.js\n');

// 2. Live Supabase Data Verification
console.log('[2] Testing live data filtering for Evnikom, Camp, and Sheraton:');
const url = "https://oclajpyumehpojepcczg.supabase.co";
const key = "sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB";
const sb = createClient(url, key);

async function testLiveData() {
  const [
    { data: words },
    { data: tests },
    { data: classes },
    { data: programs },
    { data: assignments }
  ] = await Promise.all([
    sb.from('vocabulary_vault').select('id, topic, indonesian, english, word_type, target_level, theme, theme_code, topic_code, category, institution_id, program_id').is('deleted_at', null).order('target_level', { ascending: true }).limit(5000),
    sb.from('tests').select('id, class_id, title, shell_code, test_type, payload, working_duration_minutes, minimum_required_score, status, display_order').is('deleted_at', null),
    sb.from('classes').select('id, name, program_id, level_id, institution_id, is_active').is('deleted_at', null),
    sb.from('programs').select('id, name, code, is_active, deleted_at').is('deleted_at', null),
    sb.from('theme_program_assignments').select('id, theme_code, target_level, program_id, is_active').eq('is_active', true)
  ]);

  const activeProgs = (programs || []).filter(p => !p.deleted_at && p.is_active !== false);

  const levelsSet = new Set([1, 2, 3]);
  (words || []).forEach(w => {
    const lvl = parseInt(w.target_level, 10);
    if (!isNaN(lvl)) levelsSet.add(lvl);
  });
  const levels = Array.from(levelsSet).sort((a, b) => a - b);
  const levelGroups = new Map();
  levels.forEach(lvl => levelGroups.set(lvl, new Map()));

  (words || []).forEach(w => {
    const lvl = parseInt(w.target_level, 10) || 3;
    if (!levelGroups.has(lvl)) levelGroups.set(lvl, new Map());
    const themesMap = levelGroups.get(lvl);
    const thCode = (w.theme_code || 'ZZZ').trim().toUpperCase();
    const thName = (w.theme || 'Unassigned').trim();
    if (!themesMap.has(thCode)) {
      themesMap.set(thCode, { code: thCode, name: thName, topicsMap: new Map() });
    }
    const thObj = themesMap.get(thCode);
    if (w.theme && (!thObj.name || thObj.name === 'Unassigned')) thObj.name = w.theme.trim();
    const tpName = (w.topic || '').trim();
    if (!tpName) return;
    const tpCode = (w.topic_code && w.topic_code.trim()) ? w.topic_code.trim() : `${thCode}1`;
    const tpKey = tpCode + '::' + tpName;
    if (!thObj.topicsMap.has(tpKey)) {
      thObj.topicsMap.set(tpKey, { topicCode: tpCode, name: tpName, themeCode: thCode, themeName: thObj.name, level: lvl });
    }
  });

  const assignSet = new Set(
    (assignments || []).map(a => `${String(a.theme_code).trim().toUpperCase()}_${parseInt(a.target_level, 10)}_${a.program_id}`)
  );

  const simulateForProgram = (progId) => {
    const selectedProg = activeProgs.find(p => p.id === progId);
    const progName = (selectedProg?.name || '').toLowerCase();

    const getLevelClass = (lvl) => {
      let match = classes.find(c => c.program_id === progId &&
        c.name && c.name.toLowerCase().includes(progName) &&
        (c.name.toLowerCase().includes(`${lvl}`) || (lvl === 1 && c.name.toLowerCase().includes('1st')) || (lvl === 2 && c.name.toLowerCase().includes('2nd')) || (lvl === 3 && c.name.toLowerCase().includes('3rd'))) &&
        c.name.toLowerCase().includes('vocab')
      );
      if (match) return match;
      const classIdsWithTests = new Set(tests.map(t => t.class_id));
      match = classes.find(c => c.program_id === progId &&
        classIdsWithTests.has(c.id) &&
        (c.name.toLowerCase().includes(`${lvl}`) || (lvl === 1 && c.name.toLowerCase().includes('1st')) || (lvl === 2 && c.name.toLowerCase().includes('2nd')) || (lvl === 3 && c.name.toLowerCase().includes('3rd'))) &&
        c.name.toLowerCase().includes('vocab')
      );
      if (match) return match;
      return classes.find(c => c.program_id === progId && c.name && c.name.toLowerCase().includes('vocab')) || null;
    };

    const isThemeAssignedToProgram = (lvl, thCode, targetClassId) => {
      if (!progId) return true;
      if (assignSet.has(`${thCode}_${lvl}_${progId}`)) return true;
      if (targetClassId) {
        const classTests = tests.filter(t => t.class_id === targetClassId);
        const hasTest = classTests.some(t => {
          const code = String(t.shell_code || '').toUpperCase();
          return code.startsWith(`${lvl}${thCode}`);
        });
        if (hasTest) return true;
      }
      const hasProgWords = (words || []).some(w =>
        w.program_id === progId &&
        parseInt(w.target_level, 10) === lvl &&
        String(w.theme_code || '').trim().toUpperCase() === thCode
      );
      if (hasProgWords) return true;
      return false;
    };

    let totalTasksExpected = 0;
    let totalTasksReady = 0;
    let totalExamsExpected = 0;
    let totalExamsReady = 0;
    let rows = [];

    levels.forEach(lvl => {
      const targetClass = getLevelClass(lvl);
      const thMap = levelGroups.get(lvl);
      if (!thMap) return;

      thMap.forEach(th => {
        if (!isThemeAssignedToProgram(lvl, th.code, targetClass?.id)) return;

        totalExamsExpected++;
        const classTests = targetClass ? tests.filter(t => t.class_id === targetClass.id) : [];
        const thExam = classTests.find(t => (t.test_type === 'exam' || (t.shell_code && t.shell_code.includes('EXAM'))) &&
          (t.shell_code && t.shell_code.toUpperCase().includes(`${lvl}${th.code}-WORDS-EXAM`))) ||
          classTests.find(t => t.title && t.title.toLowerCase().includes(th.name.toLowerCase()) && (t.test_type === 'exam' || (t.title.toUpperCase().includes('EXAM'))));
        if (thExam) totalExamsReady++;

        th.topicsMap.forEach(tp => {
          totalTasksExpected++;
          const cleanNum = tp.topicCode.replace(/^[A-Z]+/i, '');
          const tpTask = classTests.find(t => (t.test_type === 'quiz' || (t.shell_code && t.shell_code.includes('TASK'))) &&
            (t.shell_code && (t.shell_code.toUpperCase().includes(`${lvl}${th.code}${cleanNum}-WORDS-TASK`) || t.shell_code.toUpperCase().includes(`${lvl}${th.code}${cleanNum}-PHRASES-TASK`)))) ||
            classTests.find(t => t.title && t.title.toLowerCase().includes(tp.name.toLowerCase()));
          if (tpTask) totalTasksReady++;

          rows.push({
            lvl,
            code: `${lvl}${th.code}${cleanNum}`,
            theme: th.name,
            topic: tp.name,
            taskReady: Boolean(tpTask),
            examReady: Boolean(thExam)
          });
        });
      });
    });

    const totalExpected = totalTasksExpected + totalExamsExpected;
    const totalReady = totalTasksReady + totalExamsReady;
    const pct = totalExpected > 0 ? Math.round((totalReady / totalExpected) * 100) : 100;

    return { rows, totalTasksExpected, totalTasksReady, totalExamsExpected, totalExamsReady, pct };
  };

  // Test Evnikom
  const evnikomId = 'cfeda206-a7a9-4979-a90c-ce7fd436fcd0';
  const evn = simulateForProgram(evnikomId);
  console.log(`  Evnikom: ${evn.rows.length} rows | Tasks: ${evn.totalTasksReady}/${evn.totalTasksExpected} | Exams: ${evn.totalExamsReady}/${evn.totalExamsExpected} | Readiness: ${evn.pct}%`);
  assert.strictEqual(evn.rows.length, 2, 'Evnikom must only render 2 rows (Theme G Topics)');
  assert.strictEqual(evn.totalTasksExpected, 2, 'Evnikom total tasks expected must be 2');
  assert.strictEqual(evn.totalExamsExpected, 1, 'Evnikom total exams expected must be 1');
  assert.strictEqual(evn.pct, 100, 'Evnikom readiness must be 100%');
  const evnMissing = evn.rows.filter(r => !r.taskReady || !r.examReady);
  assert.strictEqual(evnMissing.length, 0, 'Evnikom must have zero missing tasks/exams');
  console.log('  ✅ Evnikom program-scoping verified: foreign Level 2 themes eliminated!');

  // Test Camp
  const campId = '11deb53c-434a-44b0-83ca-1cc9b239cab3';
  const camp = simulateForProgram(campId);
  console.log(`  Camp: ${camp.rows.length} rows | Tasks: ${camp.totalTasksReady}/${camp.totalTasksExpected} | Exams: ${camp.totalExamsReady}/${camp.totalExamsExpected} | Readiness: ${camp.pct}%`);
  assert.strictEqual(camp.rows.length, 31, 'Camp must render 31 rows (L2 & L3 Themes)');
  assert.strictEqual(camp.totalTasksExpected, 31, 'Camp total tasks expected must be 31');
  assert.strictEqual(camp.totalExamsExpected, 8, 'Camp total exams expected must be 8');
  assert.strictEqual(camp.pct, 100, 'Camp readiness must be 100%');
  console.log('  ✅ Camp curriculum scoping verified: 31/31 tasks, 8/8 exams, 100% readiness!');

  // Test Sheraton (no assigned themes)
  const sheratonId = '20d64d86-6e8b-4677-a3c9-e497fa5d9177';
  const sheraton = simulateForProgram(sheratonId);
  console.log(`  Sheraton: ${sheraton.rows.length} rows | Tasks: ${sheraton.totalTasksReady}/${sheraton.totalTasksExpected} | Exams: ${sheraton.totalExamsReady}/${sheraton.totalExamsExpected} | Readiness: ${sheraton.pct}%`);
  assert.strictEqual(sheraton.rows.length, 0, 'Sheraton must render 0 rows');
  assert.strictEqual(sheraton.totalTasksExpected, 0, 'Sheraton total tasks expected must be 0');
  assert.strictEqual(sheraton.pct, 100, 'Sheraton readiness must be 100% default');
  console.log('  ✅ Sheraton unassigned program verified: 0 rows, empty state triggered!');

  console.log('\n🎉 ALL PROGRAM SCOPING VERIFICATION CHECKS PASSED!\n');
}

testLiveData().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

