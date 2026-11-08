// scripts/test_multi_program_theme_blueprint_v166.mjs
// Verification of Multi-Program Theme Assignment, Topic Blueprint Matrix, and Zero-Leakage Query Resolution

global.window = {
  addEventListener: () => {},
  location: { hostname: 'localhost' },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
};
global.document = {
  documentElement: {},
  addEventListener: () => {},
  getElementById: () => null
};

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(message);
  } else {
    console.log(`  ✓ ${message}`);
    passedTests++;
  }
}

async function runTests() {
  console.log('\n================================================================');
  console.log('MULTI-PROGRAM THEME ASSIGNMENT & TOPIC BLUEPRINT MATRIX TEST');
  console.log('================================================================\n');

  const { getSupabase } = await import('../js/supabase.js');
  const { 
    fetchThemeProgramAssignments, 
    toggleThemeProgramAssignment, 
    fetchVaultWords,
    generateTestQuestions,
    fetchStudentClasses
  } = await import('../js/api.js');

  const sb = await getSupabase();

  // 1. Verify Database Entities
  console.log('[STAGE 1] Verifying Programs & Class Normalization...');
  const { data: progs, error: pErr } = await sb.from('programs').select('id, name, code, institution_id');
  assert(!pErr && progs && progs.length >= 4, `Loaded ${progs?.length} programs from Supabase`);

  const campProg = progs.find(p => p.code === 'CAMP' || p.name === 'Camp');
  const sherProg = progs.find(p => p.code === 'SHERATON' || p.name === 'Sheraton');
  const evProg = progs.find(p => p.code === 'EVNIKOM' || p.name === 'Evnikom');
  const tamProg = progs.find(p => p.code === 'TAMATA' || p.name === 'Tamata Persada' || p.name === 'Tamata');

  assert(campProg, `Found Camp Program (${campProg?.id})`);
  assert(sherProg, `Found Sheraton Program (${sherProg?.id}, name: ${sherProg?.name})`);
  assert(evProg, `Found Evnikom Program (${evProg?.id})`);
  assert(tamProg, `Found Tamata Program (${tamProg?.id})`);

  // Verify Normalized Classes
  const { data: classes, error: cErr } = await sb.from('classes').select('id, name, code, program_id, is_active').is('deleted_at', null);
  assert(!cErr && classes, `Loaded ${classes?.length} active classes`);

  const hasCampVocab1 = classes.some(c => c.name === 'Camp 1st Vocabulary');
  const hasEvVocab1 = classes.some(c => c.name === 'Evnikom 1st Vocabulary');
  const hasSherVocab1 = classes.some(c => c.name === 'Sheraton 1st Vocabulary');
  const hasTamVocab1 = classes.some(c => c.name === 'Tamata 1st Vocabulary');

  assert(hasCampVocab1, 'Found normalized "Camp 1st Vocabulary"');
  assert(hasEvVocab1, 'Found normalized "Evnikom 1st Vocabulary"');
  assert(hasSherVocab1, 'Found normalized "Sheraton 1st Vocabulary"');
  assert(hasTamVocab1, 'Found normalized "Tamata 1st Vocabulary"');

  // 2. Verify Theme Program Assignments Table
  console.log('\n[2] Testing Theme Program Assignment Lifecycle...');
  const initialAssigns = await fetchThemeProgramAssignments();
  assert(Array.isArray(initialAssigns), `fetchThemeProgramAssignments returned ${initialAssigns.length} rows`);

  // Test Assigning Theme A (Level 1) to Sheraton & Tamata Persada
  console.log('    Assigning Theme A (Level 1) to Sheraton...');
  await toggleThemeProgramAssignment({
    themeCode: 'A',
    targetLevel: 1,
    programId: sherProg.id,
    assign: true
  });

  console.log('    Assigning Theme A (Level 1) to Tamata Persada...');
  await toggleThemeProgramAssignment({
    themeCode: 'A',
    targetLevel: 1,
    programId: tamProg.id,
    assign: true
  });

  const updatedAssigns = await fetchThemeProgramAssignments();
  const sherHasA1 = updatedAssigns.some(a => a.theme_code === 'A' && a.target_level === 1 && a.program_id === sherProg.id);
  const tamHasA1 = updatedAssigns.some(a => a.theme_code === 'A' && a.target_level === 1 && a.program_id === tamProg.id);

  assert(sherHasA1, 'Sheraton successfully assigned Theme A (Level 1)');
  assert(tamHasA1, 'Tamata successfully assigned Theme A (Level 1)');

  // 3. Verify Query Resolution via Engine
  console.log('\n[3] Testing Multi-Program Theme Sharing in fetchVaultWords & Question Generation...');

  // Even though Vault words for Theme A (Level 1) were imported under Evnikom,
  // Sheraton can now access them dynamically without word duplication!
  const sherWords = await fetchVaultWords({ targetLevel: 1, programId: sherProg.id });
  assert(sherWords && sherWords.length >= 21, `Sheraton fetched ${sherWords.length} words from assigned Theme A (Level 1)`);

  const tamWords = await fetchVaultWords({ targetLevel: 1, programId: tamProg.id });
  assert(tamWords && tamWords.length >= 21, `Tamata fetched ${tamWords.length} words from shared Theme A (Level 1)`);

  // Verify Question Generation for Sheraton Test
  const mockSheratonTest = {
    id: 'mock-sheraton-test',
    title: 'Sheraton Words Task 1A1',
    program_id: sherProg.id,
    level_id: '100120f3-ab12-4589-99da-cf65d11436b1', // Level 1
    answer_type: 'spoken',
    payload: {
      is_dynamic_shell: true,
      theme_code: 'A',
      topic_code: 'A1',
      total_questions: 10
    }
  };

  const sherQuestions = await generateTestQuestions(sb, mockSheratonTest);
  assert(sherQuestions && sherQuestions.length > 0, `Generated ${sherQuestions.length} questions for Sheraton using shared Theme A`);
  assert(
    sherQuestions[0].topic_snapshot === 'Greetings & Basics' || sherQuestions[0].theme_snapshot === 'Foundational Communication',
    `Question has valid topic: "${sherQuestions[0].topic_snapshot}"`
  );

  // 4. Test Clean De-assignment
  console.log('\n[4] Testing Clean De-assignment...');
  await toggleThemeProgramAssignment({
    themeCode: 'A',
    targetLevel: 1,
    programId: sherProg.id,
    assign: false
  });

  const assignsAfterDeassign = await fetchThemeProgramAssignments();
  const sherStillHasA1 = assignsAfterDeassign.some(a => a.theme_code === 'A' && a.target_level === 1 && a.program_id === sherProg.id);
  const tamStillHasA1 = assignsAfterDeassign.some(a => a.theme_code === 'A' && a.target_level === 1 && a.program_id === tamProg.id);

  assert(!sherStillHasA1, 'Sheraton successfully de-assigned from Theme A (Level 1)');
  assert(tamStillHasA1, 'Tamata remains cleanly assigned to Theme A (Level 1)');

  // Clean up Tamata test assignment
  await toggleThemeProgramAssignment({
    themeCode: 'A',
    targetLevel: 1,
    programId: tamProg.id,
    assign: false
  });

  // 5. Verify Frontend File Structure & Invariants
  console.log('\n[5] Verifying Frontend Two-Tier Matrix Invariants...');
  const fs = await import('fs');
  const vocabVaultCode = fs.readFileSync('js/admin/vocab-vault.js', 'utf8');

  assert(vocabVaultCode.includes('btn-edit-mode-toggle'), 'vocab-vault.js contains EDIT MODE toggle button');
  assert(vocabVaultCode.includes('cell-program-assignment'), 'vocab-vault.js contains cell-program-assignment interactive cells');
  assert(vocabVaultCode.includes('badge-theme-assigned'), 'vocab-vault.js renders badge-theme-assigned ("yes")');
  assert(vocabVaultCode.includes('toggleThemeProgramAssignment'), 'vocab-vault.js imports and uses toggleThemeProgramAssignment');
  assert(vocabVaultCode.includes('WORD'), 'vocab-vault.js includes two-tier WORD header');
  assert(vocabVaultCode.includes('PHRASE'), 'vocab-vault.js includes two-tier PHRASE header');
  assert(vocabVaultCode.includes('Expression') && vocabVaultCode.includes('Idiom') && vocabVaultCode.includes('Proverb'), 'vocab-vault.js includes Expression, Idiom, Proverb subheaders');

  const adminCss = fs.readFileSync('css/admin.css', 'utf8');
  assert(adminCss.includes('.btn-edit-mode-toggle.mode-off'), 'admin.css contains .btn-edit-mode-toggle.mode-off (Red)');
  assert(adminCss.includes('.btn-edit-mode-toggle.mode-on'), 'admin.css contains .btn-edit-mode-toggle.mode-on (Green)');
  assert(adminCss.includes('.badge-theme-assigned'), 'admin.css contains .badge-theme-assigned styling');

  console.log('\n================================================================');
  console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests} (100%)`);
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});

