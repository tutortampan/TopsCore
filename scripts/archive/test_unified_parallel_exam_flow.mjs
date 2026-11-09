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

import assert from 'assert';

const { computeUnifiedScore, computeTopicPassLevel, TOPSCORE_COLORS } = await import('../js/grading.js');
const { toShortLevel, toOrdinalLevel } = await import('../js/api.js');

console.log('Testing Phase 298: Unified Component & Parallel Exam Flow...');

// 1. computeUnifiedScore for 50 PTS Task
const taskUnified = computeUnifiedScore({
  wordsBest: { score: 38, total_questions: 40 },
  phrasesBest: { score: 9, total_questions: 10 },
  wordsMax: 40,
  phrasesMax: 10,
  hasPhrases: true
});

assert.strictEqual(taskUnified.totalPoints, 47, 'Task total points should be 47');
assert.strictEqual(taskUnified.maxPoints, 50, 'Task max points should be 50');
assert.strictEqual(taskUnified.percentage, 94, 'Task percentage should be 94%');
assert.strictEqual(taskUnified.grade, 'A', 'Task grade should be A');
assert.strictEqual(taskUnified.gradeColor, TOPSCORE_COLORS.A, 'Task color should match Grade A');
console.log('✓ Task 50 PTS Unified Score calculation verified');

// 2. computeUnifiedScore for 150 PTS Exam
const examUnified = computeUnifiedScore({
  wordsBest: { score: 114, total_questions: 120 },
  phrasesBest: { score: 28, total_questions: 30 },
  wordsMax: 120,
  phrasesMax: 30,
  hasPhrases: true
});

assert.strictEqual(examUnified.totalPoints, 142, 'Exam total points should be 142');
assert.strictEqual(examUnified.maxPoints, 150, 'Exam max points should be 150');
assert.strictEqual(examUnified.percentage, 95, 'Exam percentage should be 95%');
assert.strictEqual(examUnified.grade, 'A', 'Exam grade should be A');
console.log('✓ Exam 150 PTS Unified Score calculation verified');

// 3. 7x7 Math.min Leveling
assert.strictEqual(computeTopicPassLevel(7, 7, true), 7, '7 Words and 7 Phrases passes equals Level 7 (Mastered)');
assert.strictEqual(computeTopicPassLevel(7, 3, true), 3, '7 Words and 3 Phrases passes equals Level 3');
assert.strictEqual(computeTopicPassLevel(2, 7, true), 2, '2 Words and 7 Phrases passes equals Level 2');
assert.strictEqual(computeTopicPassLevel(0, 0, true), 0, '0 passes equals Level 0');
assert.strictEqual(computeTopicPassLevel(5, 0, false), 5, 'Class without phrases inherits Words passes directly');
console.log('✓ 7×7 Math.min Leveling verified');

// 4. toShortLevel verification across all tables
assert.strictEqual(toShortLevel(1), '1st', 'Level 1 maps to 1st');
assert.strictEqual(toShortLevel(2), '2nd', 'Level 2 maps to 2nd');
assert.strictEqual(toShortLevel(3), '3rd', 'Level 3 maps to 3rd');
assert.strictEqual(toShortLevel('1st Level'), '1st', '1st Level maps to 1st');
assert.strictEqual(toShortLevel('2nd Level'), '2nd', '2nd Level maps to 2nd');
assert.strictEqual(toShortLevel('3rd Level'), '3rd', '3rd Level maps to 3rd');
assert.strictEqual(toShortLevel(0), 'Alumni', '0 maps to Alumni');
assert.strictEqual(toShortLevel('Alumni'), 'Alumni', 'Alumni maps to Alumni');
assert.strictEqual(toShortLevel('Ex'), 'Alumni', 'Ex maps to Alumni');
console.log('✓ toShortLevel format string verified');

console.log('\n🏆 ALL PHASE 298 UNIT TESTS PASSED WITH ZERO DEFECTS!');
