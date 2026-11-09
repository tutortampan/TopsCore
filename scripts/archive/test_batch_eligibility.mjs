// scripts/test_batch_eligibility.mjs
global.window = { location: { hostname: 'cloud' }, localStorage: { getItem: () => null } };
const { getSupabase } = await import('../js/supabase.js');
const supabase = await getSupabase();

const { data: students } = await supabase.from('students').select('*').eq('batch_id', '3e7288b7-a90e-4323-9b02-24e73991f0d7');
const sIds = students.map(s => s.id);
const { data: allAttempts } = await supabase.from('attempts').select('*').in('student_id', sIds);
const { data: classTests } = await supabase.from('tests').select('*').eq('class_id', '2ccf6468-1e03-41d1-b72b-1d84dcad85b2');

const wordsTest = classTests.find(t => t.shell_code === '2C-WORDS-EXAM');
const themeTasks = classTests.filter(t => t.shell_code.startsWith('2C') && t.shell_code.includes('TASK'));

console.log('WordsTest:', wordsTest.shell_code);
console.log('ThemeTasks:', themeTasks.map(t => t.shell_code));
console.log('--------------------------------------------------------------------------------');

const testMap = Object.fromEntries(classTests.map(t => [t.id, t]));

let eligibleCount = 0;
students.forEach(student => {
  const studAtts = allAttempts.filter(a => a.student_id === student.id);
  let prereqMet = true;
  let completedQuizCount = 0;
  for (const quiz of themeTasks) {
    const quizAtts = studAtts.filter(a => a.test_id === quiz.id);
    const passedAtt = quizAtts.find(a => {
      const st = String(a.status || '').toLowerCase();
      const isSub = ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st);
      const pct = parseFloat(a.percentage ?? 0);
      return isSub && pct >= 60;
    });
    if (passedAtt) completedQuizCount++;
    else prereqMet = false;
  }

  // Prior exam check: Theme B
  const priorExamAtts = studAtts.filter(a => {
    const t = testMap[a.test_id] || {};
    const shell = String(t.shell_code || '');
    const isEx = t.test_type === 'exam' || /EXAM/i.test(shell);
    return isEx && shell.startsWith('2B');
  });

  const priorBestScores = {};
  priorExamAtts.forEach(a => {
    const st = String(a.status || '').toLowerCase();
    if (['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st)) {
      const sc = parseFloat(a.effective_score ?? a.percentage ?? 0);
      if (!priorBestScores[a.test_id] || sc > priorBestScores[a.test_id]) {
        priorBestScores[a.test_id] = sc;
      }
    }
  });

  const priorPublishedExams = classTests.filter(t => t.test_type === 'exam' && t.shell_code.startsWith('2B') && t.status === 'PUBLISHED');
  const requiredPriorCount = Math.max(1, priorPublishedExams.length);
  const failedPrior = Object.keys(priorBestScores).length < requiredPriorCount || Object.values(priorBestScores).some(sc => sc < 60);
  const priorPassed = priorExamAtts.length > 0 && !failedPrior;

  const isEligible = prereqMet && priorPassed;
  if (isEligible) eligibleCount++;
  console.log(
    student.name.padEnd(20),
    '| Tasks:', `${completedQuizCount}/${themeTasks.length}`,
    '| Prior B Exam:', priorPassed ? 'PASSED' : 'NOT PASSED',
    '| isEligible:', isEligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'
  );
});

console.log('--------------------------------------------------------------------------------');
console.log(`Summary: ${eligibleCount} out of ${students.length} students are AUTOMATICALLY ELIGIBLE!`);

