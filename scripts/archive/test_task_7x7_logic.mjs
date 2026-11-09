/**
 * test_task_7x7_logic.mjs
 * Authoritative verification of 7×7 Repetitive Mastery Engine & Hard Gate Exam Logic
 */
import assert from 'node:assert/strict';
import { TOPSCORE_COLORS, getTaskProgressVisual } from '../js/grading.js';

console.log('--- TEST SUITE: 7×7 Repetitive Mastery Engine & Hard Gate Logic ---');

// Test 1: Gamified 5-Tier Visual Palette Verification
console.log('\n[1] Testing 5-Tier Gamified Palette Visuals...');

const v0 = getTaskProgressVisual(0);
assert.equal(v0.count, 0);
assert.equal(v0.text, '0/7');
assert.equal(v0.tierClass, 'tier-0');
assert.equal(v0.color, TOPSCORE_COLORS.E);
assert.equal(v0.isComplete, false);
console.log('  ✓ Tier 0 (0/7): Red E verified');

const v1 = getTaskProgressVisual(1);
assert.equal(v1.count, 1);
assert.equal(v1.text, '1/7');
assert.equal(v1.tierClass, 'tier-1');
assert.equal(v1.color, TOPSCORE_COLORS.D);
assert.equal(v1.isComplete, false);

const v2 = getTaskProgressVisual(2);
assert.equal(v2.count, 2);
assert.equal(v2.text, '2/7');
assert.equal(v2.tierClass, 'tier-2');
assert.equal(v2.color, TOPSCORE_COLORS.D);
assert.equal(v2.isComplete, false);
console.log('  ✓ Tier 1 & 2 (1/7, 2/7): Orange D verified');

const v3 = getTaskProgressVisual(3);
assert.equal(v3.count, 3);
assert.equal(v3.text, '3/7');
assert.equal(v3.tierClass, 'tier-3');
assert.equal(v3.color, TOPSCORE_COLORS.C);
assert.equal(v3.isComplete, false);

const v4 = getTaskProgressVisual(4);
assert.equal(v4.count, 4);
assert.equal(v4.text, '4/7');
assert.equal(v4.tierClass, 'tier-4');
assert.equal(v4.color, TOPSCORE_COLORS.C);
assert.equal(v4.isComplete, false);
console.log('  ✓ Tier 3 & 4 (3/7, 4/7): Yellow C verified');

const v5 = getTaskProgressVisual(5);
assert.equal(v5.count, 5);
assert.equal(v5.text, '5/7');
assert.equal(v5.tierClass, 'tier-5');
assert.equal(v5.color, TOPSCORE_COLORS.B);
assert.equal(v5.isComplete, false);

const v6 = getTaskProgressVisual(6);
assert.equal(v6.count, 6);
assert.equal(v6.text, '6/7');
assert.equal(v6.tierClass, 'tier-6');
assert.equal(v6.color, TOPSCORE_COLORS.B);
assert.equal(v6.isComplete, false);
console.log('  ✓ Tier 5 & 6 (5/7, 6/7): Lime B verified');

const v7 = getTaskProgressVisual(7);
assert.equal(v7.count, 7);
assert.equal(v7.text, '7/7 ✓ Complete');
assert.equal(v7.tierClass, 'tier-7');
assert.equal(v7.color, TOPSCORE_COLORS.STAR);
assert.equal(v7.isComplete, true);
console.log('  ✓ Tier 7 (7/7 ✓ Complete): Pure Green Star verified');

// Boundary & overflow handling
const vOver = getTaskProgressVisual(12);
assert.equal(vOver.count, 7);
assert.equal(vOver.text, '7/7 ✓ Complete');
assert.equal(vOver.isComplete, true);

const vNeg = getTaskProgressVisual(-3);
assert.equal(vNeg.count, 0);
assert.equal(vNeg.text, '0/7');
assert.equal(vNeg.isComplete, false);
console.log('  ✓ Overflow/Underflow boundaries verified');

// Test 2: Passing Attempt Counter Calculation (>= 70%)
console.log('\n[2] Testing Valid Pass Attempt Counting (>= 70%)...');

function calculateTaskPasses(attempts, taskId) {
  let passes = 0;
  for (const a of attempts) {
    if ((a.test_id === taskId || a.Test_id === taskId)) {
      const st = (a.status || '').toLowerCase();
      if (['submitted', 'auto_submitted', 'evaluated'].includes(st)) {
        const pct = parseFloat(a.effective_score ?? a.percentage ?? 0);
        if (pct >= 70) {
          passes++;
        }
      }
    }
  }
  return passes;
}

const mockAttempts = [
  { test_id: 'task-1', percentage: 65, status: 'submitted' },    // Failed (< 70) -> 0
  { test_id: 'task-1', percentage: 80, status: 'submitted' },    // Pass 1 -> 1
  { test_id: 'task-1', percentage: 72, status: 'auto_submitted' },// Pass 2 -> 2
  { test_id: 'task-1', percentage: 50, status: 'submitted' },    // Failed (< 70) -> 2
  { test_id: 'task-1', percentage: 95, status: 'evaluated' },   // Pass 3 -> 3
  { test_id: 'task-1', percentage: 78, status: 'submitted' },    // Pass 4 -> 4
  { test_id: 'task-1', percentage: 85, status: 'submitted' },    // Pass 5 -> 5
  { test_id: 'task-1', percentage: 88, status: 'submitted' },    // Pass 6 -> 6
  { test_id: 'task-1', percentage: 100, status: 'submitted' },   // Pass 7 -> 7
  { test_id: 'task-1', percentage: 90, status: 'in_progress' },  // Ignored (in_progress)
];

const passCountTask1 = calculateTaskPasses(mockAttempts, 'task-1');
assert.equal(passCountTask1, 7, 'Expected exactly 7 passing attempts');
console.log(`  ✓ Pass count for task-1: ${passCountTask1}/7 (ignored 2 failed & 1 in_progress)`);

// Test 3: Hard Gate Exam Lock & Unlock Simulation
console.log('\n[3] Testing Hard Gate Exam Prerequisite...');

function checkExamHardGate(themeCode, themeTasks, passCountByTask) {
  for (const task of themeTasks) {
    const pCount = passCountByTask[task.id] || 0;
    if (pCount < 7) {
      return {
        locked: true,
        reason: `All Theme ${themeCode} Tasks (7/7 Passes Required)`,
        failingTaskId: task.id,
        failingTaskPasses: pCount
      };
    }
  }
  return { locked: false };
}

const themeATasks = [
  { id: '3A1-WORDS-TASK', theme_code: 'A' },
  { id: '3A1-PHRASES-TASK', theme_code: 'A' },
  { id: '3A2-WORDS-TASK', theme_code: 'A' },
  { id: '3A2-PHRASES-TASK', theme_code: 'A' },
];

// Scenario A: Only 3 out of 4 tasks completed
const passMapPartial = {
  '3A1-WORDS-TASK': 7,
  '3A1-PHRASES-TASK': 7,
  '3A2-WORDS-TASK': 5, // Not yet 7
  '3A2-PHRASES-TASK': 7,
};

const gateA = checkExamHardGate('A', themeATasks, passMapPartial);
assert.equal(gateA.locked, true, 'Exam should be locked when any task has < 7 passes');
assert.equal(gateA.failingTaskId, '3A2-WORDS-TASK');
console.log('  ✓ Exam locked 🔒 when 3A2-WORDS-TASK has 5/7 passes');

// Scenario B: All 4 tasks completed (7/7)
const passMapFull = {
  '3A1-WORDS-TASK': 7,
  '3A1-PHRASES-TASK': 7,
  '3A2-WORDS-TASK': 7,
  '3A2-PHRASES-TASK': 8, // >= 7
};

const gateB = checkExamHardGate('A', themeATasks, passMapFull);
assert.equal(gateB.locked, false, 'Exam should be unlocked when all tasks have >= 7 passes');
console.log('  ✓ Exam UNLOCKED ✅🔓 when all Theme A Tasks reach 7/7 passes');

console.log('\n======================================================');
console.log('ALL 7×7 REPETITIVE MASTERY & HARD GATE TESTS PASSED 100%');
console.log('======================================================');
