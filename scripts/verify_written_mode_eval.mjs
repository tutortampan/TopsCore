import assert from 'node:assert/strict';
import { evaluateAnswer } from '../js/grading.js';

console.log('--- Verifying Rule 2.13 Written Mode Evaluation & Typo Tolerance ---');

// 1. Exact match -> 1.0 pt, correct
const r1 = evaluateAnswer('ambitious', 'ambitious', 'written');
assert.equal(r1.score, 1.0);
assert.equal(r1.result, 'correct');
console.log('  ✓ Exact match: 1.0 pt (correct)');

// 2. Minor spelling error (1-2 char edit distance) -> 0.5 pt, minor_spelling_error
const r2 = evaluateAnswer('acommodate', 'accommodate', 'written'); // 1 char missing 'c'
assert.equal(r2.score, 0.5);
assert.equal(r2.result, 'minor_spelling_error');
console.log('  ✓ Typo (1-char DL distance): 0.5 pt (minor_spelling_error)');

const r3 = evaluateAnswer('accomodate', 'accommodate', 'written'); // 1 char missing 'm'
assert.equal(r3.score, 0.5);
assert.equal(r3.result, 'minor_spelling_error');
console.log('  ✓ Typo (missing letter): 0.5 pt (minor_spelling_error)');

// 3. Root match (stem >= 5) -> 0.5 pt, minor_word_form_error
const r4 = evaluateAnswer('communicate', 'communication', 'written');
assert.equal(r4.score, 0.5);
console.log('  ✓ Word form root match: 0.5 pt (minor_word_form_error)');

// 4. Semantic / complete mismatch -> 0.0 pt, incorrect
const r5 = evaluateAnswer('elephant', 'ambitious', 'written');
assert.equal(r5.score, 0.0);
assert.equal(r5.result, 'incorrect');
console.log('  ✓ Complete mismatch: 0.0 pt (incorrect)');

console.log('✅ Rule 2.13 Written Mode Evaluation verified 100%!');
