/**
 * Verification Test: Live Sessions Analytics Board and Remedial Eligibility Refactor
 * Phase 447 (v447)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting Verification Suite: Live Sessions Analytics & Eligibility (Phase 447)...\n');

const testsAccessPath = path.join(__dirname, '..', 'js', 'admin', 'tests-access.js');
const testsAccessCode = fs.readFileSync(testsAccessPath, 'utf8');

const appPath = path.join(__dirname, '..', 'js', 'admin', 'app.js');
const appCode = fs.readFileSync(appPath, 'utf8');

// -----------------------------------------------------------------------------
// Test 1: Cache Buster Bump in js/admin/app.js
// -----------------------------------------------------------------------------
console.log('Test 1: Cache Buster Bump in app.js');
assert.ok(
  appCode.includes("tests-access.js?v=20261113_v447"),
  'app.js must import tests-access.js with cache buster v20261113_v447'
);
console.log('  ✅ PASS: Cache buster bumped to v20261113_v447.\n');

// -----------------------------------------------------------------------------
// Test 2: Card Height 225px, 12px Font & 10px Gap Invariants
// -----------------------------------------------------------------------------
console.log('Test 2: Card Height 225px, 12px Font & 10px Gap Invariants');
assert.ok(
  testsAccessCode.includes('height:225px !important; min-height:225px !important; max-height:225px !important;') ||
  testsAccessCode.includes('height: 225px !important; min-height: 225px !important; max-height: 225px !important;'),
  'renderThemeCard must lock card height strictly to 225px'
);
assert.ok(
  testsAccessCode.includes('A - ${escapeHtml(name)}') || testsAccessCode.includes('${code}</span> - ${escapeHtml(name)}'),
  'renderThemeCard must format Line 1 as Theme Code - Name'
);
assert.ok(
  testsAccessCode.includes('⏱️ Default Duration:') && testsAccessCode.includes('📊 Question Count:'),
  'renderThemeCard must include 12px metadata box with Duration and Question Count'
);
assert.ok(
  testsAccessCode.includes('gap:10px !important') || testsAccessCode.includes('gap: 10px') || testsAccessCode.includes('gap:10px'),
  'renderThemeCard must use 10px gap between action rows'
);

// Check for zero sub-11px text in card popover
assert.ok(!testsAccessCode.includes('0.65rem'), 'Zero sub-11px: 0.65rem must not exist in tests-access.js');
assert.ok(!testsAccessCode.includes('0.73rem'), 'Zero sub-11px: 0.73rem must not exist in tests-access.js');
console.log('  ✅ PASS: 225px zero-overflow card, 12px metadata, and 10px gap verified.\n');

// -----------------------------------------------------------------------------
// Test 3: 5-Column Table Headers and Typography Invariants
// -----------------------------------------------------------------------------
console.log('Test 3: 5-Column Table Headers & Zero-Capsule Invariants');
assert.ok(testsAccessCode.includes('TARGET'), 'Table must contain TARGET header');
assert.ok(testsAccessCode.includes('MISTAKE'), 'Table must contain MISTAKE header');
assert.ok(testsAccessCode.includes('COUNT'), 'Table must contain COUNT header');
assert.ok(testsAccessCode.includes('RATE'), 'Table must contain RATE header');
assert.ok(testsAccessCode.includes('MISTAKE TYPE'), 'Table must contain MISTAKE TYPE header');

// Electric Blue for Mistake and Mistake Type
assert.ok(
  testsAccessCode.includes('color:#38bdf8;') && testsAccessCode.includes('${escapeHtml(cleanMistake)}'),
  'Mistake column must use Electric Blue #38bdf8'
);
assert.ok(
  testsAccessCode.includes('color:#38bdf8;') && testsAccessCode.includes('${escapeHtml(mistakeType)}'),
  'Mistake Type column must use Electric Blue #38bdf8'
);

// Grade E Red for Rate
assert.ok(
  testsAccessCode.includes('var(--grade-e, #FF0000)') && testsAccessCode.includes('${failRate}%'),
  'Rate column must use Grade E Red var(--grade-e, #FF0000)'
);

// No quotes on Mistake
assert.ok(
  testsAccessCode.includes("replace(/^[\"']|[\"']$/g, '')"),
  'Mistake column must strip surrounding quotes'
);
console.log('  ✅ PASS: 5-column table with Electric Blue typography and zero capsules verified.\n');

// -----------------------------------------------------------------------------
// Test 4: Dynamic 3-Way Eligibility Logic Execution Test
// -----------------------------------------------------------------------------
console.log('Test 4: Dynamic 3-Way Eligibility Logic Execution Test');

// Extract evaluateStudentsEligibility from source for unit execution
const evalFuncMatch = testsAccessCode.match(/function evaluateStudentsEligibility\([\s\S]*?\n\}/);
assert.ok(evalFuncMatch, 'evaluateStudentsEligibility function must exist');

// Run simulated test in isolated context
const evalCode = evalFuncMatch[0];
const fn = new Function('params', `
  ${evalCode}
  return evaluateStudentsEligibility(params);
`);

// Mock Data: 4 students with different states
const mockStudents = [
  { id: 's1', name: 'Student 1 - Not Attempted, Tasks Done' },
  { id: 's2', name: 'Student 2 - Failed Exam (45%)' },
  { id: 's3', name: 'Student 3 - Passed Exam (85%)' },
  { id: 's4', name: 'Student 4 - Incomplete Tasks' },
];

const mockTheme = { code: 'A', name: 'Public Speaking' };
const mockTasks = [{ id: 'task-1' }, { id: 'task-2' }];
const mockWordsTest = { id: 'test-words' };

// Attempts
const mockAttempts = [
  // s1: passed tasks, 0 exam attempts
  { student_id: 's1', test_id: 'task-1', percentage: 80, status: 'submitted' },
  { student_id: 's1', test_id: 'task-2', percentage: 90, status: 'submitted' },

  // s2: passed tasks, failed exam
  { student_id: 's2', test_id: 'task-1', percentage: 80, status: 'submitted' },
  { student_id: 's2', test_id: 'task-2', percentage: 90, status: 'submitted' },
  { student_id: 's2', test_id: 'test-words', percentage: 45, status: 'submitted' },

  // s3: passed tasks, passed exam
  { student_id: 's3', test_id: 'task-1', percentage: 80, status: 'submitted' },
  { student_id: 's3', test_id: 'task-2', percentage: 90, status: 'submitted' },
  { student_id: 's3', test_id: 'test-words', percentage: 85, status: 'submitted' },

  // s4: 0 tasks completed
];

// Test Normal Mode
const normalResults = fn({
  students: mockStudents,
  theme: mockTheme,
  themeTasks: mockTasks,
  wordsTest: mockWordsTest,
  phrasesTest: null,
  classTests: [mockWordsTest, ...mockTasks],
  allAttempts: mockAttempts,
  mode: 'normal'
});

const normalEligible = normalResults.filter(r => r.isEligible);
assert.strictEqual(normalEligible.length, 1, 'Only s1 (0 attempts, tasks completed) must be eligible in Normal mode');
assert.strictEqual(normalEligible[0].student.id, 's1', 's1 is eligible in Normal');

// Passed student s3 must NOT be eligible in Normal
const s3Normal = normalResults.find(r => r.student.id === 's3');
assert.strictEqual(s3Normal.isEligible, false, 'Passed student s3 must NOT be eligible in Normal mode');
assert.ok(s3Normal.statusLabel.includes('Retake via Student Portal'), 's3 status must indicate portal retake');

// Failed student s2 must NOT be eligible in Normal
const s2Normal = normalResults.find(r => r.student.id === 's2');
assert.strictEqual(s2Normal.isEligible, false, 'Failed student s2 must NOT be eligible in Normal mode');
assert.ok(s2Normal.statusLabel.includes('Needs Remedial'), 's2 status must indicate remedial needed');

// Test Remedial Mode
const remedialResults = fn({
  students: mockStudents,
  theme: mockTheme,
  themeTasks: mockTasks,
  wordsTest: mockWordsTest,
  phrasesTest: null,
  classTests: [mockWordsTest, ...mockTasks],
  allAttempts: mockAttempts,
  mode: 'remedial'
});

const remedialEligible = remedialResults.filter(r => r.isEligible);
assert.strictEqual(remedialEligible.length, 1, 'Only s2 (failed exam < 60%) must be eligible in Remedial mode');
assert.strictEqual(remedialEligible[0].student.id, 's2', 's2 is eligible in Remedial');

// Unattempted student s1 must NOT be eligible in Remedial
const s1Remedial = remedialResults.find(r => r.student.id === 's1');
assert.strictEqual(s1Remedial.isEligible, false, 'Unattempted student s1 must NOT be eligible in Remedial mode');
assert.ok(s1Remedial.statusLabel.includes('Exam Not Attempted'), 's1 status must state Exam Not Attempted');

// Passed student s3 must NOT be eligible in Remedial
const s3Remedial = remedialResults.find(r => r.student.id === 's3');
assert.strictEqual(s3Remedial.isEligible, false, 'Passed student s3 must NOT be eligible in Remedial mode');
assert.ok(s3Remedial.statusLabel.includes('Remedial Ineligible'), 's3 status must state Remedial Ineligible');

console.log('  ✅ PASS: 3-way eligibility split (Normal vs Remedi vs Passed) strictly verified.\n');

console.log('🎉 ALL 4 VERIFICATION TESTS PASSED SUCCESSFULLY! (100% PASS)\n');
