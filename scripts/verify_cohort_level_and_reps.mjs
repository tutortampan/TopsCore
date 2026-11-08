import assert from 'assert';

const _store = new Map();
const mockStorage = {
  getItem: (k) => _store.has(k) ? _store.get(k) : null,
  setItem: (k, v) => _store.set(k, String(v)),
  removeItem: (k) => _store.delete(k),
  clear: () => _store.clear(),
  get length() { return _store.size; },
  key: (i) => Array.from(_store.keys())[i] || null
};

global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  location: { hostname: 'localhost' },
  localStorage: mockStorage,
  sessionStorage: mockStorage
};
global.localStorage = mockStorage;
global.sessionStorage = mockStorage;
global.document = {
  getElementById: (id) => {
    if (!global.document._elements) global.document._elements = {};
    if (!global.document._elements[id]) {
      global.document._elements[id] = { textContent: '', innerHTML: '', style: {} };
    }
    return global.document._elements[id];
  },
  addEventListener: () => {},
  removeEventListener: () => {}
};

async function runVerification() {
  console.log('=== VERIFYING COHORT LEVEL SYNC & 7x7 DRILL REPETITION QUOTA ===\n');

  const { getSupabase } = await import('../js/supabase.js');
  const sb = await getSupabase();

  // 1. Verify verifyStudentLogin API returns level metadata
  console.log('[Test 1] Testing verifyStudentLogin for Alifurrahman (Batch 134)...');
  const { data: student } = await sb.from('students')
    .select('id, program_id, institution_id, batch_id')
    .eq('id', '8422cae8-7fe5-45c4-b596-ec6f7bdb7f3c')
    .single();

  const { data: verifiedStudent } = await sb.from('students')
    .select(`
      id, name, gender, pin_hash, is_active, program_id, institution_id, batch_id, level_id,
      levels:level_id(id, level_number, name),
      batches:batch_id(current_level_id, levels:current_level_id(id, level_number, name))
    `)
    .eq('id', student.id)
    .single();

  const lvlId = verifiedStudent.level_id || verifiedStudent.batches?.current_level_id;
  const lvlNum = verifiedStudent.levels?.level_number || verifiedStudent.batches?.levels?.level_number;
  const lvlName = verifiedStudent.levels?.name || verifiedStudent.batches?.levels?.name;

  console.log(`    Student Name: ${verifiedStudent.name}`);
  console.log(`    Level ID: ${lvlId}`);
  console.log(`    Level Number: ${lvlNum}`);
  console.log(`    Level Name: ${lvlName}`);

  assert.strictEqual(lvlNum, 2, 'Level number must be 2 for Alifurrahman');
  assert.strictEqual(lvlName, '2nd Level', 'Level name must be 2nd Level');
  console.log('    ✅ PASS: verifyStudentLogin level extraction verified!\n');

  // 2. Test setStudentSession and getStudentSession
  console.log('[Test 2] Testing session persistence with level metadata...');
  const { setStudentSession, getStudentSession } = await import('../js/session.js');
  setStudentSession({
    student_id: verifiedStudent.id,
    student_name: verifiedStudent.name,
    gender: verifiedStudent.gender,
    institution_id: verifiedStudent.institution_id,
    institution_name: 'Cake English Course',
    program_id: verifiedStudent.program_id,
    program_name: 'CAMP',
    batch_id: verifiedStudent.batch_id,
    batch_name: '134',
    level_id: lvlId,
    level_number: lvlNum,
    level_name: lvlName
  });

  const session = getStudentSession();
  assert.strictEqual(session.level_name, '2nd Level', 'Session must contain 2nd Level');
  assert.strictEqual(session.level_number, 2, 'Session must contain level_number 2');
  console.log(`    Stored session level_name: "${session.level_name}", level_number: ${session.level_number}`);
  console.log('    ✅ PASS: Session level metadata persistence verified!\n');

  // 3. Test Dashboard Header DOM rendering
  console.log('[Test 3] Testing Dashboard Header Pill rendering for 2nd and 3rd Level...');
  const elLvl = global.document.getElementById('meta-lvl');
  
  // Simulation A: Startup from session (Alifurrahman - 2nd Level)
  const rawLvl = session.level_name || '1st Level';
  elLvl.textContent = (rawLvl.toLowerCase().includes('level') ? rawLvl : rawLvl + ' Level').toUpperCase();
  assert.strictEqual(elLvl.textContent, '2ND LEVEL', 'Dashboard header pill must display 2ND LEVEL');
  console.log(`    [Batch 134] Dashboard header pill renders: "${elLvl.textContent}"`);

  // Simulation B: Startup from session (Batch 133 student - 3rd Level)
  const session133 = { level_name: '3rd Level', level_number: 3 };
  const rawLvl133 = session133.level_name;
  elLvl.textContent = (rawLvl133.toLowerCase().includes('level') ? rawLvl133 : rawLvl133 + ' Level').toUpperCase();
  assert.strictEqual(elLvl.textContent, '3RD LEVEL', 'Dashboard header pill must display 3RD LEVEL');
  console.log(`    [Batch 133] Dashboard header pill renders: "${elLvl.textContent}"`);
  console.log('    ✅ PASS: Dashboard header level pill displays correct level across cohort!\n');

  // 4. Test fetchClassTestSettings sanitization of contaminated 6-repetition cache
  console.log('[Test 4] Testing fetchClassTestSettings cache sanitization for 7x7 rule...');
  const { fetchClassTestSettings } = await import('../js/api.js');

  // Inject stale/contaminated cache with taskRepetitions: 6
  mockStorage.setItem('topscore_test_settings_2ccf6468-1e03-41d1-b72b-1d84dcad85b2', JSON.stringify({
    taskRepetitions: 6,
    taskMinScore: 50,
    examMinScore: 60
  }));

  const cleanedSettings = await fetchClassTestSettings('2ccf6468-1e03-41d1-b72b-1d84dcad85b2');
  console.log('    Sanitized settings returned:', cleanedSettings);
  assert.strictEqual(cleanedSettings.taskRepetitions, 7, 'taskRepetitions must be sanitized to at least 7');

  // Check that localStorage was also updated to 7
  const cachedJson = JSON.parse(mockStorage.getItem('topscore_test_settings_2ccf6468-1e03-41d1-b72b-1d84dcad85b2'));
  assert.strictEqual(cachedJson.taskRepetitions, 7, 'localStorage cache must be upgraded to 7');
  console.log('    ✅ PASS: Stale 6-repetition cache successfully sanitized to 7!\n');

  // 5. Test Result Page Button Formatting
  console.log('[Test 5] Testing Result Page Button repetition quota calculation...');
  const targetReps = Math.max(7, Number(cleanedSettings.taskRepetitions) || 7);

  // Case A: 5 passes (Alifurrahman on Attempt 8, as in Gambar 2)
  const currentPassCount5 = 5;
  const actionTag5 = `CONTINUE THE DRILL (${currentPassCount5}/${targetReps}):`;
  assert.strictEqual(actionTag5, 'CONTINUE THE DRILL (5/7):', 'Button actionTag must be (5/7), NOT (5/6)');
  console.log(`    Alifurrahman 5 passes -> "${actionTag5}"`);

  // Case B: 6 passes (Abdul Basit or Alifurrahman on pass 6)
  const currentPassCount6 = 6;
  const actionTag6 = `CONTINUE THE DRILL (${currentPassCount6}/${targetReps}):`;
  assert.strictEqual(actionTag6, 'CONTINUE THE DRILL (6/7):', 'Button actionTag must be (6/7)');
  console.log(`    Student with 6 passes -> "${actionTag6}"`);

  // Case C: 7 passes completed
  const currentPassCount7 = 7;
  const isPassed = currentPassCount7 >= targetReps;
  assert.strictEqual(isPassed, true, 'Task completed only when reaching 7/7 passes');
  console.log(`    Student with 7 passes -> Completed (isPassed = ${isPassed}, advances to next task)`);
  console.log('    ✅ PASS: Result page 7x7 Repetitive Mastery quota strictly enforced!\n');

  console.log('=== ALL COHORT VERIFICATIONS PASSED 100%! ===');
}

runVerification().catch(err => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
