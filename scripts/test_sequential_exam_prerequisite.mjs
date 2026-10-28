import { getSupabase } from '../js/supabase.js';

async function runTest() {
  const supabase = await getSupabase();
  console.log('Testing Sequential Exam Prerequisite Logic against Supabase data...');

  const gaganId = '151bc378-b99a-4583-8ef3-bf1007a69531';
  const test18Id = '931fd729-31b9-4fa9-8b37-7b038b9d09b9'; // 3B Phrases Exam
  const test17Id = '0d4b1cdf-43bb-4a28-873b-0906fea1804c'; // 3B Words Exam

  // 1. Fetch test 18
  const { data: test18, error: tErr } = await supabase.from('tests').select('*').eq('id', test18Id).single();
  if (tErr || !test18) {
    console.error('Failed to fetch Test 18:', tErr);
    process.exit(1);
  }

  console.log(`Fetched Test 18: "${test18.title}", subtype: ${test18.test_subtype}, theme_code: ${test18.payload?.theme_code}`);

  // 2. Fetch sibling tests for same class & level
  const { data: classTests, error: ctErr } = await supabase.from('tests')
    .select('*')
    .eq('class_id', test18.class_id)
    .eq('level_id', test18.level_id);
  
  if (ctErr) {
    console.error('Failed to fetch class tests:', ctErr);
    process.exit(1);
  }

  const themeCode = test18.payload?.theme_code;
  const isPhrasesExam = Boolean(
    (test18.category === 'phrases' || test18.test_subtype === 'PHRASE_EXAM' ||
     (test18.title || '').toLowerCase().includes('phrase') ||
     (test18.shell_code || '').toUpperCase().includes('PHRASE') ||
     (test18.payload?.subtype || '').toUpperCase().includes('PHRASE')) &&
    !((test18.test_type || '').toLowerCase() === 'quiz' || (test18.category || '').toLowerCase() === 'quiz')
  );

  console.log(`Is Phrases Exam: ${isPhrasesExam}`);

  const siblingWordsExam = classTests.find(a => 
    a.id !== test18.id &&
    (
      (themeCode && a.payload?.theme_code === themeCode) ||
      (!themeCode && (a.title || '').substring(0, 3).toLowerCase() === (test18.title || '').substring(0, 3).toLowerCase())
    ) &&
    (
      a.category === 'words' || a.test_subtype === 'VOCAB_EXAM' ||
      (a.title || '').toLowerCase().includes('word') ||
      (a.shell_code || '').toUpperCase().includes('WORD') ||
      (a.payload?.subtype || '').toUpperCase().includes('WORD')
    ) &&
    !((a.test_type || '').toLowerCase() === 'quiz' || (a.category || '').toLowerCase() === 'quiz')
  );

  if (!siblingWordsExam) {
    console.error('Failed to detect sibling words exam!');
    process.exit(1);
  }

  console.log(`Matched Sibling Words Exam: "${siblingWordsExam.title}" (ID: ${siblingWordsExam.id})`);

  // 3. Test gating logic with Attempt 12 (58.57% / 59% - Not Passed)
  const nonPassedScore = 58.57;
  const passedScore = 60.0;
  const reqWordsScore = siblingWordsExam.minimum_required_score || siblingWordsExam.pass_threshold || 60;

  console.log(`Evaluating threshold: Required score is ${reqWordsScore}%`);
  
  // Test case A: Student with 58.57% (Gagan's highest non-remedial score)
  const isEligibleA = nonPassedScore >= reqWordsScore;
  console.log(`Test A (Score: 58.57%): ${isEligibleA ? 'Allowed' : 'BLOCKED (Correct)'}`);
  if (isEligibleA) {
    console.error('Test A failed: 58.57% should NOT pass prerequisite >= 60%');
    process.exit(1);
  }

  // Test case B: Student with 60%
  const isEligibleB = passedScore >= reqWordsScore;
  console.log(`Test B (Score: 60.00%): ${isEligibleB ? 'ALLOWED (Correct)' : 'Blocked'}`);
  if (!isEligibleB) {
    console.error('Test B failed: 60% should pass prerequisite >= 60%');
    process.exit(1);
  }

  console.log('✅ ALL SEQUENTIAL PRE-REQUISITE TESTS PASSED SUCCESSFULLY!');
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
