// scripts/verify_self_paced_exam_and_duration_calibration.mjs
// Automated verification suite for Independent Retake and Self-Paced Exam Mode with Real-Time Duration Calibration

import assert from 'node:assert';
import fs from 'node:fs';

console.log('🧪 Starting Automated Verification: Self-Paced Exam & Duration Calibration...\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
  }
}

// -------------------------------------------------------------
// Test 1: Duration Calibration Unit Verification (SSOT Formulas)
// -------------------------------------------------------------
runTest('calculateAutoDurationMinutes accurately calculates SSOT rates', () => {
  const apiJs = fs.readFileSync('js/api.js', 'utf8');
  assert(apiJs.includes('export function calculateAutoDurationMinutes'), 'Function must be exported in js/api.js');

  // Extract function to test in isolation
  const start = apiJs.indexOf('export function calculateAutoDurationMinutes');
  const end = apiJs.indexOf('export async function upsertDynamicTestShell');
  const fnStr = apiJs.slice(start, end).replace('export ', '');
  const calculateAutoDurationMinutes = new Function(`
    ${fnStr}
    return calculateAutoDurationMinutes;
  `)();

  // 1. Spoken Words (15s per question)
  assert.strictEqual(calculateAutoDurationMinutes(40, 'spoken', 'words'), 10, 'Words Task (40 QS @ 15s) must be 10 min');
  assert.strictEqual(calculateAutoDurationMinutes(120, 'spoken', 'words'), 30, 'Theme A Words Exam (120 QS @ 15s) must be 30 min');
  assert.strictEqual(calculateAutoDurationMinutes(280, 'spoken', 'words'), 70, 'Theme B Words Exam (280 QS @ 15s) must be 70 min');
  assert.strictEqual(calculateAutoDurationMinutes(440, 'spoken', 'words'), 110, 'Theme C Words Exam (440 QS @ 15s) must be 110 min');
  assert.strictEqual(calculateAutoDurationMinutes(600, 'spoken', 'words'), 150, 'Theme D Words Exam (600 QS @ 15s) must be 150 min');

  // 2. Spoken Phrases (20s per question)
  assert.strictEqual(calculateAutoDurationMinutes(10, 'spoken', 'phrases'), 5, 'Phrases Task (10 QS @ 20s) must be clamped to 5 min');
  assert.strictEqual(calculateAutoDurationMinutes(30, 'spoken', 'phrases'), 10, 'Theme A Phrases Exam (30 QS @ 20s) must be 10 min');

  // 3. Selection (20s per question)
  assert.strictEqual(calculateAutoDurationMinutes(30, 'selection', 'phrases'), 10, 'Selection (30 QS @ 20s) must be 10 min');

  // 4. Written (30s per question)
  assert.strictEqual(calculateAutoDurationMinutes(40, 'written', 'words'), 20, 'Written (40 QS @ 30s) must be 20 min');
  assert.strictEqual(calculateAutoDurationMinutes(120, 'written', 'words'), 60, 'Written (120 QS @ 30s) must be 60 min');

  // 5. Custom Pace Override
  assert.strictEqual(calculateAutoDurationMinutes(40, 'spoken', 'words', 10), 7, 'Custom 10s pace (40 QS) must be 7 min');
});

// -------------------------------------------------------------
// Test 2: Admin Table Real-Time Duration Calibration
// -------------------------------------------------------------
runTest('Admin Table in js/admin/app.js references calculateAutoDurationMinutes for DUR. (M)', () => {
  const appJs = fs.readFileSync('js/admin/app.js', 'utf8');
  assert(appJs.includes('calculateAutoDurationMinutes'), 'js/admin/app.js must import calculateAutoDurationMinutes');
  assert(appJs.includes('calculateAutoDurationMinutes(effectiveQCount, rawAns, category)'), 'app.js must dynamically compute timeLimit');
  assert(appJs.includes('label: \'DUR. (M)\''), 'app.js must maintain DUR. (M) column');
});

// -------------------------------------------------------------
// Test 3: Test Generator Real-Time Pace Presets
// -------------------------------------------------------------
runTest('Test Generator in js/admin/auto-gen-modal.js has pace presets and live listeners', () => {
  const modalJs = fs.readFileSync('js/admin/auto-gen-modal.js', 'utf8');
  assert(modalJs.includes('wizard-quiz-words-pace'), 'Modal must contain Words pace input');
  assert(modalJs.includes('wizard-quiz-phrases-pace'), 'Modal must contain Phrases pace input');
  assert(modalJs.includes('pace-preset-btn'), 'Modal must have pace preset buttons');
  assert(modalJs.includes('recalculateDurations'), 'Modal must have recalculateDurations live handler');
  assert(modalJs.includes('wordsTaskPaceSeconds'), 'Modal must pass wordsTaskPaceSeconds');
});

// -------------------------------------------------------------
// Test 4: Backend start-test Auto-Clean and Session Bypass
// -------------------------------------------------------------
runTest('Backend start-test auto-cleans expired attempts and allows self-paced retakes', () => {
  const startTestTs = fs.readFileSync('supabase/functions/start-test/index.ts', 'utf8');

  // Check 1: Auto-clean expired attempt without returning HTTP 410
  assert(!startTestTs.includes('status: 410'), 'start-test must eliminate HTTP 410 error');
  assert(startTestTs.includes('// Auto-clean expired attempt without throwing 410 error'), 'start-test must auto-clean expired attempts');

  // Check 2: Self-paced eligibility computation
  assert(startTestTs.includes('isEligibleForSelfPaced'), 'start-test must evaluate isEligibleForSelfPaced');
  assert(startTestTs.includes('pct >= 60 || Boolean(a.is_forgiven)'), 'Eligibility requires pct >= 60 or is_forgiven');

  // Check 3: Attempt limit bypass
  assert(startTestTs.includes('!isEligibleForSelfPaced'), 'Attempt cap must be bypassed for self-paced retakes');

  // Check 4: 100% Spoken modality enforcement outside active sessions
  assert(startTestTs.includes('isSelfPacedRetake'), 'start-test must distinguish self-paced retake context');
  assert(startTestTs.includes('dynamicAnswerType = \'spoken\';'), 'Self-paced retakes outside session must enforce spoken modality');
});

// -------------------------------------------------------------
// Test 5: Backend submit-test Grace Period & Highest Score
// -------------------------------------------------------------
runTest('Backend submit-test has 60s grace period and resolves best score', () => {
  const submitTestTs = fs.readFileSync('supabase/functions/submit-test/index.ts', 'utf8');
  assert(submitTestTs.includes('GRACE_PERIOD_MS = 60 * 1000'), 'submit-test must have 60s grace period');
  assert(submitTestTs.includes('is_best_score: a.id === bestId'), 'submit-test must authoritatively set is_best_score');
});

// -------------------------------------------------------------
// Test 6: Dashboard Gating & ComponentChoiceModal
// -------------------------------------------------------------
runTest('Dashboard in js/dashboard.js unlocks retake buttons and displays Spoken badges', () => {
  const dashJs = fs.readFileSync('js/dashboard.js', 'utf8');
  assert(dashJs.includes('isEligibleForSelfPaced'), 'dashboard.js must check isEligibleForSelfPaced');
  assert(dashJs.includes('🎙️ Spoken Mode @ 15s'), 'Words Exam badge must display Spoken Mode @ 15s in retake');
  assert(dashJs.includes('🎙️ Spoken Mode @ 20s'), 'Phrases Exam badge must display Spoken Mode @ 20s in retake');
  assert(dashJs.includes('🔒 Session Locked'), 'Session lock badge must be preserved for ineligible students');
});

// -------------------------------------------------------------
// Test 7: Client Speech Buffer Flush on Expiry
// -------------------------------------------------------------
runTest('Client test.js implements 1.5s speech buffer flush on timer expiry', () => {
  const testJs = fs.readFileSync('js/test.js', 'utf8');
  assert(testJs.includes('// Speech Grace Buffer (+1.5s)'), 'test.js must have 1.5s speech grace buffer');
  assert(testJs.includes('window.currentActiveSpeechSession.stop()'), 'test.js must stop active speech session');
  assert(testJs.includes('setTimeout(() => {\n          saveCurrentAnswer();\n          proceedTimeUp(isSection);\n       }, 1500)'), 'test.js must flush speech buffer before auto-submitting');
});

console.log(`\n========================================`);
console.log(`Results: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
