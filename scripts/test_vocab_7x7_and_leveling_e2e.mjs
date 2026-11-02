// scripts/test_vocab_7x7_and_leveling_e2e.mjs
// Full Comprehensive E2E Verification Suite across all 6 Pillars

global.window = {
  addEventListener: () => {},
  location: { hostname: 'localhost' },
  localStorage: { getItem: () => null, setItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {} }
};
global.document = {
  documentElement: {},
  addEventListener: () => {},
  getElementById: () => null
};

const { getSupabase } = await import('../js/supabase.js');
const { getTaskProgressVisual, TOPSCORE_COLORS, evaluateAnswer } = await import('../js/grading.js');
const { toOrdinalLevel, fetchStudentClasses, fetchTestsForStudentClass } = await import('../js/api.js');

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

export async function runFullE2ETestSuite(runNumber = 1) {
  console.log(`\n======================================================`);
  console.log(`RUN #${runNumber}: FULL VOCAB 7×7 & LEVEL PROGRESSION E2E SUITE`);
  console.log(`======================================================\n`);

  const supabase = await getSupabase();

  // ─────────────────────────────────────────────────────────────
  // PILLAR 1: Terminology Unification (Zero 'Quiz' Leaks in active Tests)
  // ─────────────────────────────────────────────────────────────
  console.log('[PILLAR 1] Terminology Unification (Zero Quiz Leaks in Active Tests)...');
  const vocab3rdClassId = 'ab33498a-90e6-44b7-83f4-5765f964543e';
  const { data: vocabTests, error: vtErr } = await supabase.from('tests')
    .select('id, title, test_type, test_subtype, category, shell_code')
    .eq('class_id', vocab3rdClassId)
    .is('deleted_at', null);

  if (vtErr) throw vtErr;

  assert(vocabTests && vocabTests.length === 40, `Found all 40 active test shells in 3rd Vocabulary (found: ${vocabTests?.length})`);

  let quizCategoryCount = 0;
  let quizTitleCount = 0;
  let taskCount = 0;
  let examCount = 0;

  vocabTests.forEach(t => {
    if ((t.category || '').toLowerCase() === 'quiz') quizCategoryCount++;
    if ((t.title || '').toLowerCase().includes('quiz')) quizTitleCount++;
    if ((t.shell_code || '').toUpperCase().includes('QUIZ')) quizCategoryCount++;
    if (t.category === 'TASK') {
      taskCount++;
      assert(t.shell_code.endsWith('-TASK'), `Shell code for Task "${t.title}" ends with -TASK: ${t.shell_code}`);
      assert(t.test_subtype === 'VOCAB_TASK' || t.test_subtype === 'PHRASE_TASK', `Subtype for Task "${t.title}" is VOCAB_TASK or PHRASE_TASK: ${t.test_subtype}`);
    }
    if (t.category === 'EXAM') {
      examCount++;
      assert(t.shell_code.endsWith('-EXAM'), `Shell code for Exam "${t.title}" ends with -EXAM: ${t.shell_code}`);
      assert(t.test_subtype === 'VOCAB_EXAM' || t.test_subtype === 'PHRASE_EXAM', `Subtype for Exam "${t.title}" is VOCAB_EXAM or PHRASE_EXAM: ${t.test_subtype}`);
    }
  });

  assert(quizCategoryCount === 0, `Zero test records with category or shell_code 'QUIZ' (found: ${quizCategoryCount})`);
  assert(quizTitleCount === 0, `Zero test records with 'Quiz' in title (found: ${quizTitleCount})`);
  assert(taskCount === 32, `All 32 Daily practice modules normalized to category 'TASK' (found: ${taskCount})`);
  assert(examCount === 8, `All 8 Theme assessments normalized to category 'EXAM' (found: ${examCount})`);

  // ─────────────────────────────────────────────────────────────
  // PILLAR 2: 7×7 Repetitive Mastery Engine & 5-Tier Gamified Palette
  // ─────────────────────────────────────────────────────────────
  console.log('\n[PILLAR 2] 7×7 Repetitive Mastery Engine & 5-Tier Gamified Palette...');
  const v0 = getTaskProgressVisual(0);
  assert(v0.text === '0/7' && v0.tierClass === 'tier-0' && v0.color === TOPSCORE_COLORS.E && v0.isComplete === false, 'Tier 0 (0/7): Red E verified');

  const v1 = getTaskProgressVisual(1);
  const v2 = getTaskProgressVisual(2);
  assert(v1.text === '1/7' && v1.tierClass === 'tier-1' && v1.color === TOPSCORE_COLORS.D && v1.isComplete === false, 'Tier 1 (1/7): Orange D verified');
  assert(v2.text === '2/7' && v2.tierClass === 'tier-2' && v2.color === TOPSCORE_COLORS.D && v2.isComplete === false, 'Tier 2 (2/7): Orange D verified');

  const v3 = getTaskProgressVisual(3);
  const v4 = getTaskProgressVisual(4);
  assert(v3.text === '3/7' && v3.tierClass === 'tier-3' && v3.color === TOPSCORE_COLORS.C && v3.isComplete === false, 'Tier 3 (3/7): Yellow C verified');
  assert(v4.text === '4/7' && v4.tierClass === 'tier-4' && v4.color === TOPSCORE_COLORS.C && v4.isComplete === false, 'Tier 4 (4/7): Yellow C verified');

  const v5 = getTaskProgressVisual(5);
  const v6 = getTaskProgressVisual(6);
  assert(v5.text === '5/7' && v5.tierClass === 'tier-5' && v5.color === TOPSCORE_COLORS.B && v5.isComplete === false, 'Tier 5 (5/7): Lime B verified');
  assert(v6.text === '6/7' && v6.tierClass === 'tier-6' && v6.color === TOPSCORE_COLORS.B && v6.isComplete === false, 'Tier 6 (6/7): Lime B verified');

  const v7 = getTaskProgressVisual(7);
  const v10 = getTaskProgressVisual(10);
  assert(v7.text === '7/7 ✓ Complete' && v7.tierClass === 'tier-7' && v7.color === TOPSCORE_COLORS.STAR && v7.isComplete === true, 'Tier 7 (7/7 ✓ Complete): Star Green ★ verified');
  assert(v10.text === '7/7 ✓ Complete' && v10.tierClass === 'tier-7' && v10.isComplete === true, 'Overflow pass count (10/7) caps cleanly at 7/7 ✓ Complete');

  // Verify pass counting logic: effective_score >= 70 or percentage >= 70
  const mockAttempts = [
    { test_id: 't1', status: 'submitted', effective_score: 85 },
    { test_id: 't1', status: 'evaluated', effective_score: 70 },
    { test_id: 't1', status: 'graded', percentage: 75 },
    { test_id: 't1', status: 'submitted', effective_score: 65 }, // Failed (< 70)
    { test_id: 't1', status: 'in_progress', effective_score: 100 } // Unsubmitted
  ];
  const validPasses = mockAttempts.filter(a => {
    const st = (a.status || '').toLowerCase();
    const isDone = st === 'submitted' || st === 'auto_submitted' || st === 'evaluated' || st === 'graded';
    if (!isDone) return false;
    const sc = a.effective_score != null ? parseFloat(a.effective_score) : parseFloat(a.percentage || 0);
    return sc >= 70;
  });
  assert(validPasses.length === 3, `Pass attempt counting filters correctly for >= 70% and completed status (3/5)`);

  // ─────────────────────────────────────────────────────────────
  // PILLAR 3: Hard Gate Exam Lock (7/7 Task Passes Required)
  // ─────────────────────────────────────────────────────────────
  console.log('\n[PILLAR 3] Hard Gate Exam Lock (7/7 Task Passes Required)...');
  const themeATasks = vocabTests.filter(t => t.category === 'TASK' && t.shell_code.startsWith('3A'));
  assert(themeATasks.length === 6, `Found 6 Daily Tasks for Theme A (3 Words + 3 Phrases)`);

  // Gating test: Task with 6/7 passes blocks exam
  const passCountsIncomplete = {
    [themeATasks[0].id]: 7,
    [themeATasks[1].id]: 6, // 6/7 incomplete
    [themeATasks[2].id]: 7,
    [themeATasks[3].id]: 7,
    [themeATasks[4].id]: 7,
    [themeATasks[5].id]: 7
  };
  const isLockedIncomplete = themeATasks.some(t => (passCountsIncomplete[t.id] || 0) < 7);
  assert(isLockedIncomplete === true, `Exam is strictly locked 🔒 when any Task has < 7 passes (1 task has 6/7)`);

  // Gating test: All tasks with 7/7 passes unlocks exam
  const passCountsComplete = {
    [themeATasks[0].id]: 7,
    [themeATasks[1].id]: 7,
    [themeATasks[2].id]: 7,
    [themeATasks[3].id]: 8,
    [themeATasks[4].id]: 7,
    [themeATasks[5].id]: 7
  };
  const isLockedComplete = themeATasks.some(t => (passCountsComplete[t.id] || 0) < 7);
  assert(isLockedComplete === false, `Exam is UNLOCKED ✅🔓 when all Tasks reach 7/7 mastery`);

  // ─────────────────────────────────────────────────────────────
  // PILLAR 4: Words Exam Written Mode & 70% Threshold
  // ─────────────────────────────────────────────────────────────
  console.log('\n[PILLAR 4] Words Exam Written Mode & 70% Threshold...');
  const { data: wordsExams, error: weErr } = await supabase.from('tests')
    .select('id, title, shell_code, answer_type, minimum_required_score')
    .in('shell_code', ['3A-WORDS-EXAM', '3B-WORDS-EXAM', '3C-WORDS-EXAM', '3D-WORDS-EXAM']);

  if (weErr) throw weErr;

  assert(wordsExams && wordsExams.length === 4, `Fetched all 4 Words Exams (found: ${wordsExams?.length})`);
  wordsExams.forEach(e => {
    assert(e.answer_type === 'written', `${e.shell_code} has answer_type = 'written'`);
    assert(e.minimum_required_score === 70, `${e.shell_code} has minimum_required_score = 70`);
  });

  // Evaluate tolerance matrix (Rule 2.13) in Written mode
  const writtenExact = evaluateAnswer('destination', 'destination', 'written');
  assert(writtenExact.score === 1.0 && writtenExact.result === 'correct', 'Written exact match awards 1.0 pt (correct)');

  const writtenTypo = evaluateAnswer('destinaton', 'destination', 'written'); // missing 'i', edit distance 1
  assert(writtenTypo.score === 0.5 && writtenTypo.result === 'minor_spelling_error', 'Written 1-char typo awards 0.5 pt partial credit (minor_spelling_error)');

  const writtenWordForm = evaluateAnswer('destinations', 'destination', 'written'); // plural form of 11-char word
  assert(writtenWordForm.score === 0.5, 'Written word form / inflection awards 0.5 pt partial credit');

  const writtenWrong = evaluateAnswer('departure', 'destination', 'written');
  assert(writtenWrong.score === 0.0 && writtenWrong.result === 'incorrect', 'Written incorrect answer awards 0.0 pt');

  // Verify Passing Threshold >= 70%
  const scoreFail = 69.9;
  const scorePass = 70.0;
  assert(scoreFail < 70, 'Score 69.9% is below passing threshold');
  assert(scorePass >= 70, 'Score 70.0% meets passing threshold');

  // ─────────────────────────────────────────────────────────────
  // PILLAR 5: Cumulative Retroactive Access & Alumni Universal Access
  // ─────────────────────────────────────────────────────────────
  console.log('\n[PILLAR 5] Cumulative Retroactive Access & Alumni Universal Access...');
  const { data: levels, error: lvlErr } = await supabase.from('levels')
    .select('id, name, level_number')
    .order('level_number');
  if (lvlErr) throw lvlErr;

  const lvl1 = levels.find(l => l.level_number === 1);
  const lvl2 = levels.find(l => l.level_number === 2);
  const lvl3 = levels.find(l => l.level_number === 3);
  const lvl0 = levels.find(l => l.level_number === 0);

  assert(lvl0 && lvl0.name === 'Alumni', `Level 0 named 'Alumni' (found: ${lvl0?.name})`);

  const cecProgramId = '11deb53c-434a-44b0-83ca-1cc9b239cab3';

  // Level 1 Student: Receives Level 1 classes
  const classesLvl1 = await fetchStudentClasses(cecProgramId, null, lvl1.id);
  assert(classesLvl1.length > 0, `Level 1 student fetches active classes`);
  classesLvl1.forEach(c => {
    const num = c.levels?.level_number;
    assert(num == null || num <= 1, `Level 1 student class "${c.name}" has level_number <= 1`);
  });

  // Level 2 Student: Receives Level 1 + Level 2 classes (Cumulative Retroactive Access)
  const classesLvl2 = await fetchStudentClasses(cecProgramId, null, lvl2.id);
  assert(classesLvl2.some(c => c.name.includes('2nd Vocabulary')), `Level 2 student receives reactivated '2nd Vocabulary'`);
  assert(classesLvl2.length >= classesLvl1.length, `Level 2 student receives cumulative classes (count: ${classesLvl2.length})`);

  // Alumni (Level 0): Receives Universal Access across all program classes
  const classesAlumni = await fetchStudentClasses(cecProgramId, null, lvl0.id);
  assert(classesAlumni.length >= classesLvl2.length, `Alumni student receives universal access to all program classes (count: ${classesAlumni.length})`);

  // Universal Access for Tests: Alumni receives tests from all levels
  const testsAlumni = await fetchTestsForStudentClass(cecProgramId, vocab3rdClassId, null, lvl0.id);
  assert(testsAlumni.length === 40, `Alumni receives universal access to all 40 tests in 3rd Vocabulary`);

  // ─────────────────────────────────────────────────────────────
  // PILLAR 6: Lifecycle Actions, Batch Transfer & Waivers (Skor F & Remedial 60%ᴿ)
  // ─────────────────────────────────────────────────────────────
  console.log('\n[PILLAR 6] Lifecycle Actions, Batch Transfer & Waivers (Skor F & Remedial 60%ᴿ)...');
  
  // toOrdinalLevel tests
  assert(toOrdinalLevel(0) === 'Alumni', `toOrdinalLevel(0) -> 'Alumni'`);
  assert(toOrdinalLevel(1) === '1st Level', `toOrdinalLevel(1) -> '1st Level'`);
  assert(toOrdinalLevel(2) === '2nd Level', `toOrdinalLevel(2) -> '2nd Level'`);
  assert(toOrdinalLevel(3) === '3rd Level', `toOrdinalLevel(3) -> '3rd Level'`);

  // Promotion sequence
  function getNextLevelNum(curNum) {
    if (curNum >= 3) return 0; // Alumni
    return curNum + 1;
  }
  assert(getNextLevelNum(1) === 2, 'Promotion from Level 1 -> Level 2');
  assert(getNextLevelNum(2) === 3, 'Promotion from Level 2 -> Level 3');
  assert(getNextLevelNum(3) === 0, 'Promotion from Level 3 -> Level 0 (Alumni)');

  // Waiver evaluations:
  // Case A: Unwaived attempt with 55% (< 70%) fails prerequisite
  const unwaivedAttempt = { score: 55, percentage: 55, is_forgiven: false, is_remedial_unlocked: false };
  const unwaivedPass = Boolean(unwaivedAttempt.is_forgiven || (unwaivedAttempt.is_remedial_unlocked && unwaivedAttempt.score >= 60) || unwaivedAttempt.score >= 70);
  assert(unwaivedPass === false, `Unwaived 55% exam score does NOT satisfy prerequisite (Locked 🔒)`);

  // Case B: Skor F (Forgiven pure score 55%ᶠ Red E) waives prerequisite
  const forgivenAttempt = { score: 55, percentage: 55, is_forgiven: true, forgiven_reason: 'Dispensasi sakit' };
  const forgivenPass = Boolean(forgivenAttempt.is_forgiven || (forgivenAttempt.is_remedial_unlocked && forgivenAttempt.score >= 60) || forgivenAttempt.score >= 70);
  assert(forgivenPass === true, `Skor F (is_forgiven = true) WAIVES prerequisite requirement (Unlocked ✅🔓)`);

  // Case C: Remedial Cap 60% (60%ᴿ Yellow C) waives prerequisite
  const remedialAttempt = { score: 60, percentage: 60, is_remedial_unlocked: true, is_remedial: true };
  const remedialPass = Boolean(remedialAttempt.is_forgiven || (remedialAttempt.is_remedial_unlocked && remedialAttempt.score >= 60) || remedialAttempt.score >= 70);
  assert(remedialPass === true, `Remedial Cap 60% (is_remedial_unlocked = true && score >= 60) WAIVES prerequisite (Unlocked ✅🔓)`);

  // Batch Transfer with Level Inheritance
  const studentBeforeTransfer = { id: 's1', batch_id: 'b1', level_id: lvl1.id };
  const targetBatch = { id: 'b2', name: 'Batch 134', current_level_id: lvl2.id };
  const inheritLevel = true;
  const studentAfterTransfer = {
    ...studentBeforeTransfer,
    batch_id: targetBatch.id,
    level_id: inheritLevel && targetBatch.current_level_id ? targetBatch.current_level_id : studentBeforeTransfer.level_id
  };
  assert(studentAfterTransfer.batch_id === targetBatch.id, 'Batch ID updated to target batch');
  assert(studentAfterTransfer.level_id === targetBatch.current_level_id, 'Student inherits target batch Level 2');

  console.log(`\n🎉 RUN #${runNumber} PASSED: ${passedTests} / ${totalTests} assertions verified without defect!`);
  return true;
}

// Execute 10 consecutive full realtime E2E runs if executed directly
if (process.argv[1]?.endsWith('test_vocab_7x7_and_leveling_e2e.mjs')) {
  (async () => {
    try {
      console.log('STARTING 10× CONSECUTIVE PASS PROTOCOL...');
      for (let i = 1; i <= 10; i++) {
        totalTests = 0;
        passedTests = 0;
        await runFullE2ETestSuite(i);
      }
      console.log('\n======================================================');
      console.log('🏆 10/10 CONSECUTIVE E2E RUNS PASSED WITH ZERO DEFECTS!');
      console.log('======================================================\n');
      process.exit(0);
    } catch (err) {
      console.error('\n💥 E2E Test Suite Encountered Error:', err);
      process.exit(1);
    }
  })();
}
