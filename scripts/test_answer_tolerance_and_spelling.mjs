// ==============================================================================
// Script: scripts/test_answer_tolerance_and_spelling.mjs
// Description: Automated tests for answer tolerance, hyphen ignoring,
//              punctuation ignoring, and letter-by-letter spelling support.
// ==============================================================================

import assert from 'node:assert';
import {
  cleanPunctuationAndSymbols,
  stripAllPunctuationAndSpaces,
  evaluateAnswer,
  calculateGrade
} from '../js/grading.js';

console.log('--- Testing Answer Tolerance & Spelling Support ---');

// 1. Hyphen & Dash Tolerance
{
  const res1 = evaluateAnswer('high quality', 'High-Quality', 'written');
  assert.strictEqual(res1.score, 1.0, 'high quality vs High-Quality (written) must score 1.0');
  assert.strictEqual(res1.result, 'correct');

  const res2 = evaluateAnswer('high quality', 'High-Quality', 'spoken');
  assert.strictEqual(res2.score, 1.0, 'high quality vs High-Quality (spoken) must score 1.0');

  const res3 = evaluateAnswer('error free', 'Error-Free; Flawless', 'written');
  assert.strictEqual(res3.score, 1.0, 'error free vs Error-Free must score 1.0');

  const res4 = evaluateAnswer('business-like', 'Businesslike', 'written');
  assert.strictEqual(res4.score, 1.0, 'business-like vs Businesslike must score 1.0');
  console.log('✅ 1. Hyphen & dash tolerance tests passed.');
}

// 2. Letter-by-Letter Spelling Support (collapsed spaces/punctuation)
{
  const res1 = evaluateAnswer('b u y', 'Buy', 'written');
  assert.strictEqual(res1.score, 1.0, '"b u y" spelling vs "Buy" must score 1.0');

  const res2 = evaluateAnswer('b. u. y.', 'Buy', 'spoken');
  assert.strictEqual(res2.score, 1.0, '"b. u. y." spelling vs "Buy" must score 1.0');

  const res3 = evaluateAnswer('w r a p', 'Wrap', 'written');
  assert.strictEqual(res3.score, 1.0, '"w r a p" spelling vs "Wrap" must score 1.0');

  const res4 = evaluateAnswer('m y t h', 'Myth', 'spoken');
  assert.strictEqual(res4.score, 1.0, '"m y t h" spelling vs "Myth" must score 1.0');
  console.log('✅ 2. Letter-by-letter spelling support tests passed.');
}

// 3. Punctuation Ignoring in Idioms & Sentences
{
  const res1 = evaluateAnswer('do not judge a book by its cover', "Don't judge a book by its cover.", 'written');
  assert.strictEqual(res1.score, 1.0, 'punctuation & contraction in proverb must score 1.0');

  const res2 = evaluateAnswer('East or West home is best', 'East or west, home is best.', 'spoken');
  assert.strictEqual(res2.score, 1.0, 'comma in idiom must score 1.0');

  const res3 = evaluateAnswer('you learn something new everyday', 'You learn something new every day.', 'written');
  assert.strictEqual(res3.score, 1.0, 'everyday vs every day must score 1.0 via compact match');
  console.log('✅ 3. Punctuation & idiom tolerance tests passed.');
}

// 4. Distinction from Wrong Words (Protection against False Positives)
{
  const res1 = evaluateAnswer('b a d', 'Bag', 'written');
  assert.notStrictEqual(res1.score, 1.0, '"b a d" vs "Bag" must NOT score 1.0');

  const res2 = evaluateAnswer('Bay', 'Pay', 'written');
  assert.notStrictEqual(res2.score, 1.0, '"Bay" vs "Pay" must NOT score 1.0 in written');

  const res3 = evaluateAnswer('a square', 'Acquire', 'written');
  assert.notStrictEqual(res3.score, 1.0, '"a square" vs "Acquire" must NOT score 1.0');
  console.log('✅ 4. False positive protections passed.');
}

// 5. Official Grading Scale Verification
{
  assert.strictEqual(calculateGrade(100), '★', '100% must be Star ★');
  assert.strictEqual(calculateGrade(90), 'A', '90% must be Grade A');
  assert.strictEqual(calculateGrade(80), 'B', '80% must be Grade B');
  assert.strictEqual(calculateGrade(60), 'C', '60% must be Grade C');
  assert.strictEqual(calculateGrade(30), 'D', '30% must be Grade D');
  assert.strictEqual(calculateGrade(29), 'E', '29% must be Grade E');
  console.log('✅ 5. Official Grading scale tests passed.');
}

console.log('\n🎉 ALL ANSWER TOLERANCE & SPELLING TESTS PASSED!');

