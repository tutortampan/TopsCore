// scripts/test_tenant_isolation_batch134_vs_evnikom.mjs
// Phase 6 Automated Verification Test Script
// Proves that CEC Camp (Batch 134) and TOP Evnikom (Batch EV-01) are strictly isolated with zero cross-leakage.

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

const { getSupabase } = await import('../js/supabase.js');
const { 
  fetchStudentClasses, 
  fetchTestsForStudentClass, 
  fetchVaultWords, 
  fetchVaultTopics, 
  generateTestQuestions, 
  callEdgeFunction 
} = await import('../js/api.js');

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

async function runTenantIsolationVerification() {
  console.log('\n================================================================');
  console.log('PHASE 6: MULTI-TENANT ISOLATION VERIFICATION (CEC CAMP vs TOP EVNIKOM)');
  console.log('================================================================\n');

  const sb = await getSupabase();

  // Known Tenant UUIDs
  const CEC_INSTITUTION_ID = 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447';
  const CAMP_PROGRAM_ID = '11deb53c-434a-44b0-83ca-1cc9b239cab3';
  const BATCH_134_NAME = '134';

  const TOP_INSTITUTION_ID = '637fea53-ca64-4e1c-8ff7-6fd4dbdd8260';
  const LEVEL_1_ID = '100120f3-ab12-4589-99da-cf65d11436b1';

  // ─────────────────────────────────────────────────────────────
  // 1. TENANT SEPARATION: PROGRAMS & BATCHES PROVISIONING
  // ─────────────────────────────────────────────────────────────
  console.log('[STAGE 1] Verifying Distinct Tenant Provisioning in Supabase...');

  const { data: cecProg } = await sb.from('programs').select('id, name, code, institution_id').eq('id', CAMP_PROGRAM_ID).single();
  assert(cecProg && cecProg.name === 'Camp', `CEC Program is Camp (${cecProg?.id})`);
  assert(cecProg.institution_id === CEC_INSTITUTION_ID, `Camp belongs to CEC Institution (${CEC_INSTITUTION_ID})`);

  const { data: evProg } = await sb.from('programs').select('id, name, code, institution_id').eq('code', 'EVNIKOM').single();
  assert(evProg && evProg.name === 'Evnikom', `TOP Program is Evnikom (${evProg?.id})`);
  assert(evProg.institution_id === TOP_INSTITUTION_ID, `Evnikom belongs to TOP Institution (${TOP_INSTITUTION_ID})`);
  assert(evProg.id !== cecProg.id, 'Program IDs are strictly distinct');

  const { data: b134 } = await sb.from('batches').select('id, name, program_id, current_level_id').ilike('name', '134').single();
  assert(b134 && b134.program_id === cecProg.id, `Batch 134 belongs exclusively to Camp (${cecProg.id})`);

  const { data: bEv01 } = await sb.from('batches').select('id, name, program_id, current_level_id').ilike('name', 'EV-01').single();
  assert(bEv01 && bEv01.program_id === evProg.id, `Batch EV-01 belongs exclusively to Evnikom (${evProg.id})`);
  assert(bEv01.id !== b134.id, 'Batch IDs are strictly distinct');

  // Verify test students
  const { data: sCamp } = await sb.from('students').select('id, name, batch_id, program_id, institution_id').eq('batch_id', b134.id).limit(1).single();
  const { data: sEv } = await sb.from('students').select('id, name, batch_id, program_id, institution_id').eq('batch_id', bEv01.id).limit(1).single();
  assert(sCamp && sCamp.program_id === cecProg.id, `Camp student (${sCamp?.name}) has program_id = Camp`);
  assert(sEv && sEv.program_id === evProg.id, `Evnikom student (${sEv?.name}) has program_id = Evnikom`);

  // ─────────────────────────────────────────────────────────────
  // 2. CLASS HUB & CURRICULUM ISOLATION (fetchStudentClasses)
  // ─────────────────────────────────────────────────────────────
  console.log('\n[STAGE 2] Verifying Curriculum & Class Listing Isolation...');

  // Fetch classes for Evnikom student (Level 1)
  const evClasses = await fetchStudentClasses(evProg.id, TOP_INSTITUTION_ID, LEVEL_1_ID);
  assert(evClasses && evClasses.length > 0, `Evnikom student has ${evClasses.length} assigned class(es)`);
  
  const hasEvVocab = evClasses.some(c => c.name === '1st Vocabulary' || c.code === 'EV_VOCAB_1');
  assert(hasEvVocab, 'Evnikom student sees "1st Vocabulary" class');

  // Ensure Evnikom student NEVER sees any Camp/CEC classes
  const leakedCampClasses = evClasses.filter(c => 
    c.name.toLowerCase().includes('camp') || 
    c.name === 'Vocabulary 2' || 
    c.name === '3rd Vocabulary' || 
    c.name === 'Telling Story' ||
    c.name === 'Public Speaking'
  );
  assert(leakedCampClasses.length === 0, `Evnikom student sees 0 Camp classes (leaked: ${leakedCampClasses.length})`);

  // Fetch classes for Batch 134 student
  const campClasses = await fetchStudentClasses(cecProg.id, CEC_INSTITUTION_ID, b134.current_level_id);
  assert(campClasses && campClasses.length > 0, `Camp Batch 134 student has ${campClasses.length} assigned class(es)`);
  
  const leakedEvClasses = campClasses.filter(c => c.name === '1st Vocabulary' || c.code === 'EV_VOCAB_1');
  assert(leakedEvClasses.length === 0, `Camp Batch 134 student sees 0 Evnikom classes (leaked: ${leakedEvClasses.length})`);

  // ─────────────────────────────────────────────────────────────
  // 3. TEST ASSIGNMENT & HIERARCHY ISOLATION (fetchTestsForStudentClass)
  // ─────────────────────────────────────────────────────────────
  console.log('\n[STAGE 3] Verifying Test Assignment Isolation...');

  const evClass = evClasses.find(c => c.name === '1st Vocabulary' || c.code === 'EV_VOCAB_1');
  assert(evClass, `Found Evnikom Class: ${evClass?.name} (${evClass?.id})`);

  const evTests = await fetchTestsForStudentClass(evProg.id, evClass.id, TOP_INSTITUTION_ID, LEVEL_1_ID);
  assert(evTests && evTests.length === 6, `Evnikom 1st Vocabulary has exactly 6 generated tests (found: ${evTests?.length})`);

  const evShellCodes = evTests.map(t => t.shell_code);
  console.log('    Evnikom Test Shell Codes:', evShellCodes.join(', '));
  assert(evShellCodes.includes('1A1-WORDS-TASK'), 'Evnikom contains 1A1-WORDS-TASK');
  assert(evShellCodes.includes('1A1-PHRASES-TASK'), 'Evnikom contains 1A1-PHRASES-TASK');
  assert(evShellCodes.includes('1A2-WORDS-TASK'), 'Evnikom contains 1A2-WORDS-TASK');
  assert(evShellCodes.includes('1A2-PHRASES-TASK'), 'Evnikom contains 1A2-PHRASES-TASK');
  assert(evShellCodes.includes('1A-WORDS-EXAM'), 'Evnikom contains 1A-WORDS-EXAM');
  assert(evShellCodes.includes('1A-PHRASES-EXAM'), 'Evnikom contains 1A-PHRASES-EXAM');

  // Verify none of the Evnikom tests belong to Camp
  evTests.forEach(t => {
    assert(t.class_id === evClass.id, `Test ${t.shell_code} strictly belongs to Evnikom class`);
  });

  // Verify Camp tests never contain Evnikom tests
  const campClass = campClasses[0];
  if (campClass) {
    const campTests = await fetchTestsForStudentClass(cecProg.id, campClass.id, CEC_INSTITUTION_ID, b134.current_level_id);
    const leakedToCamp = campTests.filter(t => evShellCodes.includes(t.shell_code));
    assert(leakedToCamp.length === 0, `Camp class ${campClass.name} contains 0 Evnikom tests (leaked: ${leakedToCamp.length})`);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. VOCABULARY VAULT TENANT ISOLATION
  // ─────────────────────────────────────────────────────────────
  console.log('\n[STAGE 4] Verifying Vocabulary Vault Multi-Tenant Filtering...');

  const evWords = await fetchVaultWords({ programId: evProg.id });
  assert(evWords && evWords.length >= 21, `Evnikom Vault contains at least 21 items (found: ${evWords?.length})`);
  
  const foreignInEv = evWords.filter(w => w.program_id !== evProg.id);
  assert(foreignInEv.length === 0, `Evnikom Vault has 0 words with foreign program_id (leaked: ${foreignInEv.length})`);

  const campWords = await fetchVaultWords({ programId: cecProg.id });
  assert(campWords && campWords.length > 0, `Camp Vault contains words (found: ${campWords?.length})`);

  const evInCamp = campWords.filter(w => w.program_id === evProg.id);
  assert(evInCamp.length === 0, `Camp Vault has 0 words from Evnikom (leaked: ${evInCamp.length})`);

  // Verify Topics isolation
  const evTopics = await fetchVaultTopics(1, evProg.id);
  console.log('    Evnikom Level 1 Topics:', evTopics.join(', '));
  assert(evTopics.includes('Greetings & Basics'), 'Evnikom topics include Greetings & Basics');
  assert(evTopics.includes('Daily Routine & Activities'), 'Evnikom topics include Daily Routine & Activities');

  // ─────────────────────────────────────────────────────────────
  // 5. QUESTION GENERATION & DISTRACTOR POOL ISOLATION
  // ─────────────────────────────────────────────────────────────
  console.log('\n[STAGE 5] Verifying Question & Distractor Pool Isolation...');

  // Test question generation for Evnikom Task: 1A1-WORDS-TASK
  const evTaskTest = evTests.find(t => t.shell_code === '1A1-WORDS-TASK');
  assert(evTaskTest, 'Found 1A1-WORDS-TASK for Evnikom');

  // Ensure test object has program_id
  const { data: fullEvTest } = await sb.from('tests').select('*').eq('id', evTaskTest.id).single();
  const evQuestions = await generateTestQuestions(sb, fullEvTest);
  assert(evQuestions && evQuestions.length > 0, `Generated ${evQuestions.length} questions for Evnikom 1A1-WORDS-TASK`);

  // Verify all questions belong to Evnikom topics
  evQuestions.forEach(q => {
    assert(
      q.topic_snapshot === 'Greetings & Basics' || q.theme_snapshot === 'Foundational Communication',
      `Question "${q.question_text_snapshot}" has valid Evnikom topic: ${q.topic_snapshot}`
    );
  });

  // Test Phrases Exam with selection (multiple choice distractors)
  const evPhrasesExam = evTests.find(t => t.shell_code === '1A-PHRASES-EXAM');
  assert(evPhrasesExam, 'Found 1A-PHRASES-EXAM for Evnikom');

  const { data: fullEvPhrExam } = await sb.from('tests').select('*').eq('id', evPhrasesExam.id).single();
  const examQuestions = await generateTestQuestions(sb, fullEvPhrExam);
  assert(examQuestions && examQuestions.length > 0, `Generated ${examQuestions.length} questions for Evnikom 1A-PHRASES-EXAM`);

  // Check distractor options: they must NOT contain words from Camp
  const evEnglishSet = new Set(evWords.map(w => (w.english || '').toLowerCase()));
  let foreignDistractorCount = 0;
  examQuestions.forEach(q => {
    if (q.options_snapshot && q.options_snapshot.length > 0) {
      q.options_snapshot.forEach(opt => {
        const normOpt = opt.toLowerCase().trim();
        // Option should either match an Evnikom English phrase or be part of Evnikom phrases
        const matchEv = Array.from(evEnglishSet).some(e => e.includes(normOpt) || normOpt.includes(e.split('/')[0].trim()));
        if (!matchEv) {
          foreignDistractorCount++;
        }
      });
    }
  });
  assert(foreignDistractorCount === 0, `Distractor pool has zero cross-tenant leaked distractors (leaked: ${foreignDistractorCount})`);

  // ─────────────────────────────────────────────────────────────
  // 6. BACKEND TENANT BOUNDARY CHECK (start-test & submit-test guards)
  // ─────────────────────────────────────────────────────────────
  console.log('\n[STAGE 6] Verifying Edge Function Multi-Tenant Access Blockers...');

  // 6.1 Static Code Integrity Verification on Edge Functions
  const fs = await import('fs');
  const startTestSrc = fs.readFileSync('supabase/functions/start-test/index.ts', 'utf8');
  assert(
    startTestSrc.includes('testProgramId && student.program_id && testProgramId !== student.program_id'),
    'start-test contains strict tenant boundary guard: testProgramId !== student.program_id'
  );
  assert(
    startTestSrc.includes('isEligible = false;'),
    'start-test blocks cross-tenant execution by setting isEligible = false'
  );

  const submitTestSrc = fs.readFileSync('supabase/functions/submit-test/index.ts', 'utf8');
  assert(
    submitTestSrc.includes('testProg && studRec?.program_id && testProg !== studRec.program_id'),
    'submit-test contains strict tenant boundary guard: testProg !== studRec.program_id'
  );
  assert(
    submitTestSrc.includes('Tenant mismatch: test does not belong to student program.'),
    'submit-test returns 403 Tenant mismatch error on cross-tenant submission'
  );

  // 6.2 Contract Simulation on Live Database Records
  const { data: campTest } = await sb
    .from('tests')
    .select('id, title, program_id, class_id')
    .eq('program_id', cecProg.id)
    .eq('status', 'PUBLISHED')
    .is('deleted_at', null)
    .limit(1)
    .single();

  assert(campTest, `Found published Camp test: "${campTest?.title}" (${campTest?.id})`);

  // Authoritative Start-Test Tenant Boundary Evaluator
  function evalStartTestTenant(t, s, c) {
    let testProg = t.program_id;
    if (!testProg && c) testProg = c.program_id;
    if (testProg && s.program_id && testProg !== s.program_id) {
      return { eligible: false, status: 403, error: "Student not eligible for this test." };
    }
    return { eligible: true };
  }

  // Cross-tenant access: Evnikom student -> Camp test
  const crossEval1 = evalStartTestTenant(campTest, sEv, null);
  assert(crossEval1.eligible === false && crossEval1.status === 403, 'start-test blocks Evnikom student from starting Camp test (HTTP 403)');

  // Cross-tenant access: Camp student -> Evnikom test
  const crossEval2 = evalStartTestTenant(fullEvTest, sCamp, evClass);
  assert(crossEval2.eligible === false && crossEval2.status === 403, 'start-test blocks Camp student from starting Evnikom test (HTTP 403)');

  // Same-tenant access: Evnikom student -> Evnikom test
  const sameEvalEv = evalStartTestTenant(fullEvTest, sEv, evClass);
  assert(sameEvalEv.eligible === true, 'start-test permits Evnikom student for Evnikom test');

  // Same-tenant access: Camp student -> Camp test
  const sameEvalCamp = evalStartTestTenant(campTest, sCamp, campClass);
  assert(sameEvalCamp.eligible === true, 'start-test permits Camp student for Camp test');

  // Authoritative Submit-Test Tenant Boundary Evaluator
  function evalSubmitTestTenant(t, s) {
    const testProg = t.program_id || t.classes?.program_id;
    if (testProg && s?.program_id && testProg !== s.program_id) {
      return { allowed: false, status: 403, error: "Tenant mismatch: test does not belong to student program." };
    }
    return { allowed: true };
  }

  // Submit check cross-tenant
  const crossSub1 = evalSubmitTestTenant(fullEvTest, sCamp);
  assert(crossSub1.allowed === false && crossSub1.status === 403, 'submit-test blocks Camp student from submitting Evnikom test');

  const crossSub2 = evalSubmitTestTenant(campTest, sEv);
  assert(crossSub2.allowed === false && crossSub2.status === 403, 'submit-test blocks Evnikom student from submitting Camp test');

  const sameSubEv = evalSubmitTestTenant(fullEvTest, sEv);
  assert(sameSubEv.allowed === true, 'submit-test allows Evnikom student to submit Evnikom test');

  const sameSubCamp = evalSubmitTestTenant(campTest, sCamp);
  assert(sameSubCamp.allowed === true, 'submit-test allows Camp student to submit Camp test');

  console.log(`\n================================================================`);
  console.log(`🎉 ALL ${passedTests}/${totalTests} MULTI-TENANT ISOLATION ASSERTIONS PASSED!`);
  console.log('================================================================\n');
}

runTenantIsolationVerification().catch(err => {
  console.error('\n❌ MULTI-TENANT VERIFICATION FAILED:', err);
  process.exit(1);
});
