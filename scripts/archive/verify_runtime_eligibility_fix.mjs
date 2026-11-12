import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🧪 Starting Verification: Eligibility Runtime & Function Signature Suite...');

// 1. Check syntax of tests-access.js
const codePath = path.join(rootDir, 'js', 'admin', 'tests-access.js');
const code = fs.readFileSync(codePath, 'utf8');

console.log('  Testing 1: Static Code Invariant Checks...');
if (!code.includes('function evaluateStudentEligibility(')) {
  throw new Error('FAIL: evaluateStudentEligibility wrapper function missing in tests-access.js');
}
if (!code.includes('function evaluateStudentsEligibility(')) {
  throw new Error('FAIL: evaluateStudentsEligibility engine function missing in tests-access.js');
}

// Ensure lines 230-245 call evaluateStudentsEligibility with object
const matchNormal = code.match(/const normalEvals = evaluateStudentsEligibility\(\s*\{\s*students:\s*activeBatchStudents/);
if (!matchNormal) {
  throw new Error('FAIL: normalEvals is not calling evaluateStudentsEligibility with activeBatchStudents object');
}
const matchRemedial = code.match(/const remedialEvals = evaluateStudentsEligibility\(\s*\{\s*students:\s*activeBatchStudents/);
if (!matchRemedial) {
  throw new Error('FAIL: remedialEvals is not calling evaluateStudentsEligibility with activeBatchStudents object');
}
console.log('  ✔ Testing 1 Passed: Invocations in renderClassTestSessions are aligned to evaluateStudentsEligibility');

// 2. Functional Runtime Simulation
console.log('  Testing 2: Execution & Output Validation of Eligibility Engines...');

// Extract evaluateStudentsEligibility and evaluateStudentEligibility functions to test in sandbox
const wrapperMatch = code.match(/function evaluateStudentEligibility\([\s\S]*?^}/m);
const engineMatch = code.match(/function evaluateStudentsEligibility\([\s\S]*?^}/m);

if (!wrapperMatch || !engineMatch) {
  throw new Error('FAIL: Could not extract eligibility functions for runtime testing');
}

// Create executable functions in test context
const testContext = {
  window: {
    APP_CONFIG: { REMEDIAL_CAP_SCORE: 60 }
  }
};

const fnString = `
  ${wrapperMatch[0]}
  ${engineMatch[0]}
  return { evaluateStudentEligibility, evaluateStudentsEligibility };
`;

const factory = new Function('context', fnString);
const { evaluateStudentEligibility, evaluateStudentsEligibility } = factory(testContext);

// Mock Data
const mockStudents = [
  { id: 's1', name: 'Alice', batch_id: 'batch-ev7', is_active: true },
  { id: 's2', name: 'Bob', batch_id: 'batch-ev7', is_active: true },
  { id: 's3', name: 'Charlie', batch_id: 'batch-ev7', is_active: true }
];

const mockTheme = {
  code: 'A',
  name: 'Workplace Test',
  tasks: [
    { id: 'quiz-1', title: 'Workplace Quiz 1', test_type: 'QUIZ' },
    { id: 'quiz-2', title: 'Workplace Quiz 2', test_type: 'QUIZ' }
  ],
  wordsTest: { id: 'exam-w1', title: 'Workplace Words Test', test_type: 'EXAM' },
  phrasesTest: { id: 'exam-p1', title: 'Workplace Phrases Test', test_type: 'EXAM' }
};

const mockAttempts = [
  // Alice passed both quizzes with 80% and 90%
  { student_id: 's1', test_id: 'quiz-1', status: 'submitted', percentage: 80, is_highest: true },
  { student_id: 's1', test_id: 'quiz-2', status: 'submitted', percentage: 90, is_highest: true },
  // Bob passed only 1 quiz
  { student_id: 's2', test_id: 'quiz-1', status: 'submitted', percentage: 85, is_highest: true },
  // Charlie passed neither
];

// Test Object Invocation
const normalObjResult = evaluateStudentsEligibility({
  students: mockStudents,
  theme: mockTheme,
  themeTasks: mockTheme.tasks,
  wordsTest: mockTheme.wordsTest,
  phrasesTest: mockTheme.phrasesTest,
  classTests: [...mockTheme.tasks, mockTheme.wordsTest, mockTheme.phrasesTest],
  allAttempts: mockAttempts,
  mode: 'normal'
});

if (!Array.isArray(normalObjResult) || normalObjResult.length !== 3) {
  throw new Error(`FAIL: Expected 3 evaluation results, got ${normalObjResult?.length}`);
}

const aliceEval = normalObjResult.find(r => r.student.id === 's1');
const bobEval = normalObjResult.find(r => r.student.id === 's2');
const charlieEval = normalObjResult.find(r => r.student.id === 's3');

if (!aliceEval.isEligible) {
  throw new Error('FAIL: Alice met all prerequisites but was marked ineligible');
}
if (bobEval.isEligible) {
  throw new Error('FAIL: Bob missed quiz-2 but was marked eligible');
}
if (charlieEval.isEligible) {
  throw new Error('FAIL: Charlie took no quizzes but was marked eligible');
}
console.log('  ✔ Testing 2 Passed: Object invocation calculated prerequisite eligibility with 100% precision');

// Test Remedial Eligibility Mode
console.log('  Testing 3: Remedial Eligibility Evaluation...');
// Mock Alice took exam-w1 and failed with 50%
const mockRemedialAttempts = [
  ...mockAttempts,
  { student_id: 's1', test_id: 'exam-w1', status: 'submitted', percentage: 50, is_highest: true }
];

const remedialResult = evaluateStudentsEligibility({
  students: mockStudents,
  theme: mockTheme,
  themeTasks: mockTheme.tasks,
  wordsTest: mockTheme.wordsTest,
  phrasesTest: mockTheme.phrasesTest,
  classTests: [...mockTheme.tasks, mockTheme.wordsTest, mockTheme.phrasesTest],
  allAttempts: mockRemedialAttempts,
  mode: 'remedial'
});

const aliceRemedial = remedialResult.find(r => r.student.id === 's1');
if (!aliceRemedial.isEligible) {
  throw new Error('FAIL: Alice failed exam-w1 with 50% but was marked ineligible for remedial');
}
console.log('  ✔ Testing 3 Passed: Remedial evaluation correctly identifies failed attempts (<60%)');

// Test Wrapper Positional Invocation (Backward Compatibility)
console.log('  Testing 4: Positional Wrapper Compatibility Invocation...');
const positionalResult = evaluateStudentEligibility(
  mockTheme,
  mockStudents,
  mockAttempts,
  'normal',
  [...mockTheme.tasks, mockTheme.wordsTest, mockTheme.phrasesTest]
);

if (!Array.isArray(positionalResult) || positionalResult.length !== 3) {
  throw new Error('FAIL: Positional wrapper did not return expected student array');
}
if (positionalResult[0].student.id !== 's1' || !positionalResult[0].isEligible) {
  throw new Error('FAIL: Positional wrapper produced incorrect eligibility for Alice');
}
console.log('  ✔ Testing 4 Passed: Positional wrapper executes seamlessly without ReferenceError');

console.log('\n🎉 ALL ELIGIBILITY RUNTIME & WRAPPER SUITES PASSED FLAWLESSLY!');
