import assert from 'node:assert';

console.log('--- Testing Unified Section Scoring & Pip Logic ---');

// 1. Partial Submit Denominator Test
function calculateScore(attemptAnswers, submittedAnswers) {
  const answersMap = new Map(submittedAnswers.map(a => [a.attempt_answer_id, a.student_answer || '']));
  const submittedIds = new Set(answersMap.keys());
  const isPartialSubmit = submittedIds.size > 0 && submittedIds.size < attemptAnswers.length;

  const scoredRows = isPartialSubmit
    ? attemptAnswers.filter(r => submittedIds.has(r.id))
    : attemptAnswers;

  let totalScore = 0;
  let correctCount = 0;
  const totalQuestions = scoredRows.length;

  for (const row of attemptAnswers) {
    const isInSubmit = !isPartialSubmit || submittedIds.has(row.id);
    if (!isInSubmit) continue;

    const studentAns = answersMap.get(row.id) || '';
    const isCorrect = studentAns === row.correct_answer;
    if (isCorrect) {
      totalScore += 1;
      correctCount += 1;
    }
  }

  const rawPercentage = totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0;
  const percentage = Math.round(rawPercentage * 100) / 100;

  return { totalScore, correctCount, totalQuestions, percentage };
}

// Generate 50 questions: 40 words, 10 phrases
const mockAttemptAnswers = [];
for (let i = 1; i <= 40; i++) {
  mockAttemptAnswers.push({ id: `w_${i}`, section: 'words', correct_answer: `word_${i}` });
}
for (let i = 1; i <= 10; i++) {
  mockAttemptAnswers.push({ id: `p_${i}`, section: 'phrases', correct_answer: `phrase_${i}` });
}

// Student answers all 40 words correctly, 0 phrases submitted
const studentWordsSubmit = mockAttemptAnswers
  .filter(r => r.section === 'words')
  .map(r => ({ attempt_answer_id: r.id, student_answer: r.correct_answer }));

const resultWords = calculateScore(mockAttemptAnswers, studentWordsSubmit);
console.log('Result Words Submit:', resultWords);
assert.strictEqual(resultWords.totalQuestions, 40, 'Total questions should be 40 (only Words submitted)');
assert.strictEqual(resultWords.correctCount, 40, 'Correct count should be 40');
assert.strictEqual(resultWords.percentage, 100, 'Score should be 100% (40/40), not 80% (40/50)');

// 2. Section Identification Logic Test
const getAttemptSection = (att) => {
  const totalQ = Number(att.total_questions || 0);
  const correctCount = Number(att.correct_count || att.score || 0);
  if (totalQ > 0 && totalQ <= 20) return 'phrases';
  if (totalQ > 20 && totalQ <= 45) return 'words';
  if (correctCount > 15) return 'words';
  if (correctCount > 0 && correctCount <= 10) return 'phrases';
  return 'words';
};

assert.strictEqual(getAttemptSection({ total_questions: 40, correct_count: 40 }), 'words');
assert.strictEqual(getAttemptSection({ total_questions: 10, correct_count: 9 }), 'phrases');
// Legacy attempt with total_questions = 50 but 40 correct
assert.strictEqual(getAttemptSection({ total_questions: 50, correct_count: 40 }), 'words');

// 3. Pip Isolation Test
const wordsPassCountByTest = {};
const phrasesPassCountByTest = {};
const testId = 'test-unified-1';

// Student completes 1 Words attempt (passes)
const attempt1 = { test_id: testId, total_questions: 40, correct_count: 40, percentage: 100, effective_score: 100 };
const sec1 = getAttemptSection(attempt1);
if (sec1 === 'words') {
  wordsPassCountByTest[testId] = (wordsPassCountByTest[testId] || 0) + 1;
} else {
  phrasesPassCountByTest[testId] = (phrasesPassCountByTest[testId] || 0) + 1;
}

console.log('Words Passes:', wordsPassCountByTest[testId] || 0);
console.log('Phrases Passes:', phrasesPassCountByTest[testId] || 0);
assert.strictEqual(wordsPassCountByTest[testId], 1, 'Words should have 1 pass');
assert.strictEqual(phrasesPassCountByTest[testId] || 0, 0, 'Phrases should have 0 passes (isolated!)');

// 4. Result Page Section Filter Test
let answers = [
  ...mockAttemptAnswers.slice(0, 40).map(r => ({ ...r, student_answer: r.correct_answer, question_snapshot: { test_section: 'words' }, score: 1 })),
  ...mockAttemptAnswers.slice(40).map(r => ({ ...r, student_answer: null, question_snapshot: { test_section: 'phrases' }, score: 0 }))
];

const answeredRows = answers.filter(a => a.student_answer != null && a.student_answer !== '');
const hasWords = answeredRows.some(a => a.question_snapshot?.test_section === 'words');
const hasPhrases = answeredRows.some(a => a.question_snapshot?.test_section === 'phrases');

let filteredAnswers = answers;
if (hasWords && !hasPhrases) {
  filteredAnswers = answers.filter(a => a.question_snapshot?.test_section === 'words');
} else if (hasPhrases && !hasWords) {
  filteredAnswers = answers.filter(a => a.question_snapshot?.test_section === 'phrases');
}

console.log('Filtered Answers Length on Result Page:', filteredAnswers.length);
assert.strictEqual(filteredAnswers.length, 40, 'Result page should only show 40 Words questions');
assert.strictEqual(filteredAnswers.every(a => a.question_snapshot.test_section === 'words'), true, 'All shown questions must be Words');

console.log('✔ All 4 tests passed successfully!');
