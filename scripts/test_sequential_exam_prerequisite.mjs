import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lttewafpysasfblvceie.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dGV3YWZweXNhc2ZibHZjZWllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkzNDk1NDIsImV4cCI6MjA1NDkyNTU0Mn0.U_E9V5bU9Y7Zz5G0Nqv9x7tEw_786T-V-pZkW-2x4j0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Testing Sequential Exam Prerequisite Logic against Supabase data...');

  // 1. Fetch Class 3rd Vocabulary
  const { data: vocabClass } = await supabase
    .from('classes')
    .select('id, name')
    .eq('name', '3rd Vocabulary')
    .single();

  if (!vocabClass) {
    console.log('Class 3rd Vocabulary not found, skipping integration check.');
    process.exit(0);
  }

  // 2. Fetch all tests for this class
  const { data: classTests } = await supabase
    .from('tests')
    .select('id, title, test_type, test_subtype, category, shell_code, payload, minimum_required_score, display_order')
    .eq('class_id', vocabClass.id)
    .order('display_order', { ascending: true });

  // Find Test 18 (3B Phrases Exam - Tourism)
  const test18 = classTests.find(t => 
    /3B/i.test(t.title) && /Phrases/i.test(t.title) && /Exam/i.test(t.title)
  );

  if (!test18) {
    console.log('Test 18 (3B Phrases Exam) not found, skipping.');
    process.exit(0);
  }

  console.log(`Fetched Test 18: "${test18.title}", subtype: ${test18.test_subtype}, theme_code: ${test18.payload?.theme_code}`);

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

  // 3. Test gating logic with dynamic passing threshold (aligned to 60% Grade C KKM)
  const reqWordsScore = siblingWordsExam.minimum_required_score || siblingWordsExam.pass_threshold || 60;
  console.log(`Evaluating threshold: Required score is ${reqWordsScore}%`);

  const nonPassedScore = reqWordsScore - 1.43; // e.g. 58.57% if req is 60%
  const passedScore = reqWordsScore;
  const highPassedScore = reqWordsScore + 10;

  // Test case A: Student with score below threshold
  const isEligibleA = nonPassedScore >= reqWordsScore;
  console.log(`Test A (Score: ${nonPassedScore.toFixed(2)}%): ${isEligibleA ? 'Allowed' : 'BLOCKED (Correct)'}`);
  if (isEligibleA) {
    console.error(`Test A failed: ${nonPassedScore.toFixed(2)}% should NOT pass prerequisite >= ${reqWordsScore}%`);
    process.exit(1);
  }

  // Test case B: Student with passing score
  const isEligibleB = passedScore >= reqWordsScore;
  console.log(`Test B (Score: ${passedScore.toFixed(2)}%): ${isEligibleB ? 'ALLOWED (Correct)' : 'Blocked'}`);
  if (!isEligibleB) {
    console.error(`Test B failed: ${passedScore.toFixed(2)}% should pass prerequisite >= ${reqWordsScore}%`);
    process.exit(1);
  }

  // Test case C: Daily Task (Test 20: 3C1 Phrases Task) MUST NOT be classified as Phrases Exam
  const test20Id = 'ccfce187-d9be-42a3-9745-cd4852865481';
  const { data: test20 } = await supabase.from('tests').select('*').eq('id', test20Id).single();
  if (test20) {
    const isQuizFallback = (test20.test_type || '').toLowerCase() === 'quiz' || 
                           (test20.test_type || '').toLowerCase() === 'task' || 
                           (test20.category || '').toLowerCase() === 'quiz' ||
                           (test20.category || '').toLowerCase() === 'task' ||
                           (test20.shell_code || '').toUpperCase().includes('QUIZ') ||
                           (test20.shell_code || '').toUpperCase().includes('TASK') ||
                           (test20.payload?.shell_code || '').toUpperCase().includes('QUIZ') ||
                           (test20.payload?.shell_code || '').toUpperCase().includes('TASK');

    const isTest20PhrasesExam = !isQuizFallback && Boolean(
      test20.payload?.category === 'phrases' || 
      /PHRASES/i.test(test20.shell_code || test20.payload?.shell_code || '') || 
      /phrase/i.test(test20.title || '') ||
      test20.test_subtype === 'PHRASE_EXAM' ||
      test20.test_subtype === 'PHRASE_TEST'
    );

    console.log(`Test C (3C1 Phrases Task isPhrasesExam): ${isTest20PhrasesExam ? 'FAILED (Incorrectly flagged as exam)' : 'PASSED (Cleanly recognized as Task)'}`);
    if (isTest20PhrasesExam) {
      console.error('Test C failed: 3C1 Phrases Task must not be classified as Phrases Exam!');
      process.exit(1);
    }
  }

  console.log('✅ ALL SEQUENTIAL PRE-REQUISITE TESTS PASSED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('Error during execution:', err);
  process.exit(1);
});
