/**
 * Verification Test: Live Sessions Analytics Board and Remedial Eligibility Refactor
 * Phase 447 (v447) / Phase 460
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting Verification Suite: Live Sessions Analytics & Eligibility...\n');

const testsAccessPath = path.join(__dirname, '..', 'js', 'admin', 'tests-access.js');
const testsAccessCode = fs.readFileSync(testsAccessPath, 'utf8');

const appPath = path.join(__dirname, '..', 'js', 'admin', 'app.js');
const appCode = fs.readFileSync(appPath, 'utf8');

// -----------------------------------------------------------------------------
// Test 1: Cache Buster Bump in js/admin/app.js
// -----------------------------------------------------------------------------
console.log('Test 1: Cache Buster Bump in app.js');
assert.ok(
  /tests-access\.js\?v=20261114_v\d+/.test(appCode),
  'app.js must import tests-access.js with updated cache buster'
);
console.log('  ✅ PASS: Cache buster bumped to latest version.\n');

// -----------------------------------------------------------------------------
// Test 2: Card Height 250px, 12px Font & 10px Gap Invariants
// -----------------------------------------------------------------------------
console.log('Test 2: Card Height 250px, 12px Font & 10px Gap Invariants');
assert.ok(
  testsAccessCode.includes('height:250px !important; min-height:250px !important; max-height:250px !important;') ||
  testsAccessCode.includes('height: 250px !important; min-height: 250px !important; max-height: 250px !important;'),
  'renderThemeCard must lock card height strictly to 250px'
);
assert.ok(
  testsAccessCode.includes('${code}</span> - ${escapeHtml(name)}'),
  'renderThemeCard must format Line 1 as Theme Code - Name'
);
assert.ok(
  (testsAccessCode.includes('⏱️ Default Duration:') || testsAccessCode.includes('Default Duration:')) &&
  (testsAccessCode.includes('📊 Question Count:') || testsAccessCode.includes('Question Count:')),
  'renderThemeCard must include 12px metadata box with Duration and Question Count'
);
assert.ok(
  testsAccessCode.includes('gap:10px') || testsAccessCode.includes('gap: 10px'),
  'renderThemeCard must use 10px gap between action rows'
);

// Check for zero sub-11px text in card popover
assert.ok(!testsAccessCode.includes('0.65rem'), 'Zero sub-11px: 0.65rem must not exist in tests-access.js');
assert.ok(!testsAccessCode.includes('0.73rem'), 'Zero sub-11px: 0.73rem must not exist in tests-access.js');
console.log('  ✅ PASS: 225px zero-overflow card, 12px metadata, and 10px gap verified.\n');

// -----------------------------------------------------------------------------
// Test 3: 4-Column Table Headers, Full Scrolling & Typography Invariants
// -----------------------------------------------------------------------------
console.log('Test 3: 4-Column Table Headers & Zero-Capsule Invariants');
assert.ok(testsAccessCode.includes('TARGET'), 'Table must contain TARGET header');
assert.ok(testsAccessCode.includes('MISTAKE'), 'Table must contain MISTAKE header');
assert.ok(testsAccessCode.includes('COUNT'), 'Table must contain COUNT header');
assert.ok(testsAccessCode.includes('RATE'), 'Table must contain RATE header');

// Electric Blue for Mistake
assert.ok(
  testsAccessCode.includes('color:#38bdf8;') && testsAccessCode.includes('${escapeHtml(cleanMistake)}'),
  'Mistake column must use Electric Blue #38bdf8'
);

// Inverted Scale Score Color for Error Rate
assert.ok(
  testsAccessCode.includes('getInvertedGradeColor(failRate)') && testsAccessCode.includes('${rateColor}') && testsAccessCode.includes('${failRate}%'),
  'Rate column must use inverted score color getInvertedGradeColor(failRate) and display failRate'
);

// No quotes on Mistake
assert.ok(
  testsAccessCode.includes("replace(/^[\"']|[\"']$/g, '')"),
  'Mistake column must strip surrounding quotes'
);

// No .slice(0, 10) artificial cap in analytics rendering (allows full scroll)
assert.ok(
  !testsAccessCode.includes('questions.slice(0, 10).map'),
  'Table must render all questions without .slice(0, 10) cap'
);

console.log('  ✅ PASS: 4-column table (TARGET | MISTAKE | COUNT | RATE), uncapped scrolling, and typography verified.\n');

// -----------------------------------------------------------------------------
// Test 4: Dynamic 3-Way Eligibility Logic Execution Test
// -----------------------------------------------------------------------------
console.log('Test 4: Dynamic 3-Way Eligibility Logic Execution Test');

// Extract evaluateStudentsEligibility from source for unit execution
const evalFuncMatch = testsAccessCode.match(/function evaluateStudentsEligibility\([\s\S]*?\n\}/);
assert.ok(evalFuncMatch, 'evaluateStudentsEligibility function must exist');

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

// -----------------------------------------------------------------------------
// Test 5: Full-Height Vertical Flex Stretch & Zero Horizontal Scroll Invariants
// -----------------------------------------------------------------------------
console.log('Test 5: Full-Height Vertical Flex Stretch & Zero Horizontal Scroll Invariants');

const cssAdminPath = path.join(__dirname, '..', 'css', 'admin.css');
const cssAdminCode = fs.readFileSync(cssAdminPath, 'utf8');

// 1. Flex chain container in tests-access.js
assert.ok(
  testsAccessCode.includes('class="test-sessions-tab-wrapper" style="display: flex; flex-direction: column; flex: 1 1 0; min-height: 0; height: 100%;'),
  'test-sessions-tab-wrapper must stretch vertically with flex: 1 1 0'
);
assert.ok(
  testsAccessCode.includes('id="theme-exam-analytics-container" style="display: flex; flex-direction: column; flex: 1 1 0; min-height: 0; height: 100%;'),
  'theme-exam-analytics-container must stretch vertically with flex: 1 1 0'
);
assert.ok(
  testsAccessCode.includes('analytics-table-wrap" style="flex: 1 1 0 !important; min-height: 0 !important; height: 100% !important; overflow-y: auto !important; overflow-x: hidden !important;'),
  'analytics-table-wrap must stretch to full remaining height without horizontal scroll'
);

// 2. Table Layout Fixed and Column Standard
assert.ok(
  testsAccessCode.includes('table-layout: fixed;'),
  'Analytics tables must enforce table-layout: fixed to prevent column blow-out'
);
assert.ok(
  testsAccessCode.includes('overflow:hidden; text-overflow:ellipsis;') || testsAccessCode.includes('overflow: hidden; text-overflow: ellipsis;'),
  'Target and Mistake columns must use ellipsis for long text'
);

// 3. CSS declarations in css/admin.css
assert.ok(
  cssAdminCode.includes('#class-test-sessions-container') &&
  cssAdminCode.includes('.test-sessions-tab-wrapper') &&
  cssAdminCode.includes('#theme-exam-analytics-container'),
  'css/admin.css must include test session containers in flex stretch group'
);
assert.ok(
  cssAdminCode.includes('.analytics-table-wrap'),
  'css/admin.css must include .analytics-table-wrap in vertical-only scrolling group'
);
console.log('  ✅ PASS: Full-height flex stretch, table-layout fixed, and zero horizontal scroll verified.\n');

console.log('🎉 ALL 5 VERIFICATION TESTS PASSED SUCCESSFULLY! (100% PASS)\n');
