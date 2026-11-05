// TOPSCORE LMS — Test Suite: Acoustic Homophone & Spelling Evaluation across Modalities
import { evaluateAnswer, isAcousticHomophoneMatch } from '../js/grading.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log('--- 1. Testing Acoustic Homophone Engine in Spoken Mode ---');

const spokenTests = [
  { student: 'bye', correct: 'buy', expectedScore: 1.0, expectedResult: 'correct' },
  { student: 'by', correct: 'buy', expectedScore: 1.0, expectedResult: 'correct' },
  { student: 'rap', correct: 'wrap', expectedScore: 1.0, expectedResult: 'correct' },
  { student: 'rap gifts', correct: 'wrap gifts', expectedScore: 1.0, expectedResult: 'correct' },
  { student: 'see', correct: 'sea', expectedScore: 1.0, expectedResult: 'correct' },
  { student: 'here', correct: 'hear', expectedScore: 1.0, expectedResult: 'correct' },
  { student: 'weight', correct: 'wait', expectedScore: 1.0, expectedResult: 'correct' },
  { student: 'flower', correct: 'flour', expectedScore: 1.0, expectedResult: 'correct' },
  { student: 'peace', correct: 'piece', expectedScore: 1.0, expectedResult: 'correct' },
  { student: 'hole', correct: 'whole', expectedScore: 1.0, expectedResult: 'correct' },
  { student: 'brake', correct: 'break', expectedScore: 1.0, expectedResult: 'correct' },
  { student: 'cat', correct: 'buy', expectedScore: 0.0, expectedResult: 'incorrect' }
];

spokenTests.forEach(({ student, correct, expectedScore, expectedResult }) => {
  const ev = evaluateAnswer(student, correct, 'spoken');
  assert(
    ev.score === expectedScore && ev.result === expectedResult,
    `Spoken: "${student}" for "${correct}" -> score: ${ev.score} (expected ${expectedScore}), result: ${ev.result}`
  );
});

console.log('\n--- 2. Testing Spelling with Spaces / Punctuation Normalization ---');

const spellingTests = [
  { student: 'b u y', correct: 'buy', expectedScore: 1.0, expectedResult: 'correct', mode: 'spoken' },
  { student: 'b  u  y', correct: 'buy', expectedScore: 1.0, expectedResult: 'correct', mode: 'written' },
  { student: 'b-u-y', correct: 'buy', expectedScore: 1.0, expectedResult: 'correct', mode: 'written' },
  { student: 'high quality', correct: 'high-quality', expectedScore: 1.0, expectedResult: 'correct', mode: 'written' },
  { student: 'high-quality', correct: 'high quality', expectedScore: 1.0, expectedResult: 'correct', mode: 'spoken' },
  { student: 'cost an arm and leg', correct: 'cost an arm and a leg', expectedScore: 1.0, expectedResult: 'correct', mode: 'spoken' }
];

spellingTests.forEach(({ student, correct, expectedScore, expectedResult, mode }) => {
  const ev = evaluateAnswer(student, correct, mode);
  assert(
    ev.score === expectedScore && ev.result === expectedResult,
    `${mode.toUpperCase()}: "${student}" for "${correct}" -> score: ${ev.score}, result: ${ev.result}`
  );
});

console.log('\n--- 3. Testing Written Mode Strictness (Homophones Rejected) ---');

const writtenTests = [
  { student: 'buy', correct: 'buy', expectedScore: 1.0, expectedResult: 'correct' },
  { student: 'cat', correct: 'car', expectedScore: 0.5, expectedResult: 'minor_spelling_error' }, // dist=1 on 3-char word
  { student: 'rap', correct: 'wrap', expectedScore: 0.5, expectedResult: 'minor_spelling_error' }, // dist=1 (omission of 'w')
  { student: 'bye', correct: 'buy', expectedScore: 0.0, expectedResult: 'incorrect' }, // dist=2 on 3-char word (homophone rejected in written)
  { student: 'weight', correct: 'wait', expectedScore: 0.0, expectedResult: 'incorrect' } // dist=3, rejected in written
];

writtenTests.forEach(({ student, correct, expectedScore, expectedResult }) => {
  const ev = evaluateAnswer(student, correct, 'written');
  assert(
    ev.score === expectedScore && ev.result === expectedResult,
    `Written: "${student}" for "${correct}" -> score: ${ev.score} (expected ${expectedScore}), result: ${ev.result}`
  );
});

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed successfully!');
  process.exit(0);
}
