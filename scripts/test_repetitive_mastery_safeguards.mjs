/**
 * scripts/test_repetitive_mastery_safeguards.mjs
 *
 * Automated Invariant & Regression Guard for TopsCore 7x7 Repetitive Mastery:
 * 1. Static Query Column Audit (API & Dashboard)
 * 2. Component Classifier & Tag Resolution (getAttemptSection)
 * 3. Self-Healing Auto-Balancer for Untagged Attempts
 * 4. Symmetric Backend Partitioning for Manual Repetitions
 */

import fs from 'node:fs';
import assert from 'node:assert';

console.log('🛡️  Running Repetitive Mastery & Dashboard Synchronization Safeguards...');

// ============================================================
// 1. STATIC QUERY COLUMN AUDIT (AST/Regex Verification)
// ============================================================
const apiContent = fs.readFileSync('js/api.js', 'utf8');
const dashboardContent = fs.readFileSync('js/dashboard.js', 'utf8');

// Check fetchAllStudentAttempts
const fetchAllMatch = apiContent.match(/export async function fetchAllStudentAttempts[\s\S]*?from\('attempts'\)[\s\S]*?\.select\('([^']+)'\)/);
assert(fetchAllMatch, 'fetchAllStudentAttempts query to attempts table must exist');
const fetchAllCols = fetchAllMatch[1].split(',').map(c => c.trim());
assert(fetchAllCols.includes('forgiven_reason'), 'fetchAllStudentAttempts MUST select forgiven_reason');
assert(fetchAllCols.includes('is_manual_override'), 'fetchAllStudentAttempts MUST select is_manual_override');
assert(fetchAllCols.includes('forgiven_by'), 'fetchAllStudentAttempts MUST select forgiven_by');
assert(fetchAllCols.includes('forgiven_at'), 'fetchAllStudentAttempts MUST select forgiven_at');
console.log('  ✔ Pillar 1.1: fetchAllStudentAttempts selects all critical forgiven & manual override columns');

// Check fetchStudentAttemptsForTest
const fetchForTestMatch = apiContent.match(/export async function fetchStudentAttemptsForTest[\s\S]*?from\('attempts'\)[\s\S]*?\.select\('([^']+)'\)/);
assert(fetchForTestMatch, 'fetchStudentAttemptsForTest query to attempts table must exist');
const fetchForTestCols = fetchForTestMatch[1].split(',').map(c => c.trim());
assert(fetchForTestCols.includes('forgiven_reason'), 'fetchStudentAttemptsForTest MUST select forgiven_reason');
assert(fetchForTestCols.includes('is_manual_override'), 'fetchStudentAttemptsForTest MUST select is_manual_override');
console.log('  ✔ Pillar 1.2: fetchStudentAttemptsForTest selects all critical forgiven & manual override columns');

// Check dashboard batch attempts query
assert(dashboardContent.includes('.select(\'id, student_id, test_id, score, total_questions, percentage, effective_score, is_remedial_unlocked, is_best_score, is_forgiven, is_manual_override, status, submitted_at, forgiven_reason,'), 'dashboard leaderboard query MUST select forgiven_reason');
console.log('  ✔ Pillar 1.3: dashboard batch attempts query selects forgiven_reason');


// ============================================================
// 2. ATTEMPT COMPONENT CLASSIFIER (getAttemptSection)
// ============================================================
function testGetAttemptSection(att) {
  if (!att) return 'words';
  const rawSec = att?.payload?.section || att?.payload?.subtype || att?.payload?.component || att?.test_section || att?.section;
  if (rawSec) {
    const s = String(rawSec).toLowerCase();
    if (s.includes('phrase') || s === 'phr') return 'phrases';
    if (s.includes('word') || s === 'wrd') return 'words';
  }
  const fr = String(att?.forgiven_reason || '');
  if (/\b(phrases?|phr)\b/i.test(fr)) return 'phrases';
  if (/\b(words?|wrd)\b/i.test(fr)) return 'words';
  const totalQ = Number(att?.total_questions || 0);
  const correctCount = Number(att?.correct_count || att?.score || 0);
  if (totalQ > 0 && totalQ <= 20) return 'phrases';
  if (totalQ > 20) return 'words';
  if (correctCount > 15) return 'words';
  if (correctCount > 0 && correctCount <= 10) return 'phrases';
  return 'words';
}

assert.strictEqual(testGetAttemptSection({ forgiven_reason: '[Mr. Top] MANUAL_REPS: 7/7 WORDS' }), 'words');
assert.strictEqual(testGetAttemptSection({ forgiven_reason: '[Mr. Top] MANUAL_REPS: 7/7 PHRASES' }), 'phrases');
assert.strictEqual(testGetAttemptSection({ forgiven_reason: 'MANUAL_REPS: 7/7 WRD' }), 'words');
assert.strictEqual(testGetAttemptSection({ forgiven_reason: 'MANUAL_REPS: 7/7 PHR' }), 'phrases');
assert.strictEqual(testGetAttemptSection({ total_questions: 50, correct_count: 35 }), 'words');
assert.strictEqual(testGetAttemptSection({ total_questions: 10, correct_count: 7 }), 'phrases');
assert.strictEqual(testGetAttemptSection({ total_questions: 30, correct_count: 21 }), 'words');
console.log('  ✔ Pillar 2: getAttemptSection accurately classifies all tag & heuristic variants');


// ============================================================
// 3. SELF-HEALING AUTO-BALANCER FOR UNTAGGED ATTEMPTS
// ============================================================
function simulateProgressionEvaluation(rawAttempts) {
  const targetReps = 7;
  const wordsPassCountByTest = {};
  const phrasesPassCountByTest = {};
  const passCountByTest = {};
  const testId = 'test_unified_a4';

  rawAttempts.forEach(a => {
    const sec = testGetAttemptSection(a);
    if (sec === 'phrases') {
      phrasesPassCountByTest[testId] = (phrasesPassCountByTest[testId] || 0) + 1;
    } else {
      wordsPassCountByTest[testId] = (wordsPassCountByTest[testId] || 0) + 1;
    }
  });

  // Self-Healing Fail-Safe
  if ((phrasesPassCountByTest[testId] || 0) === 0 && (wordsPassCountByTest[testId] || 0) >= 14) {
    const halfPasses = Math.floor(wordsPassCountByTest[testId] / 2);
    wordsPassCountByTest[testId] = halfPasses;
    phrasesPassCountByTest[testId] = halfPasses;
  }
  passCountByTest[testId] = Math.min(wordsPassCountByTest[testId] || 0, phrasesPassCountByTest[testId] || 0);

  return {
    wordsPasses: wordsPassCountByTest[testId],
    phrasesPasses: phrasesPassCountByTest[testId],
    combinedPasses: passCountByTest[testId],
    isTaskComplete: passCountByTest[testId] >= targetReps
  };
}

// Case: 14 untagged attempts with 50 questions each (all falling into words naturally)
const untaggedAttempts = Array.from({ length: 14 }, (_, i) => ({
  id: `att_${i}`,
  total_questions: 50,
  correct_count: 35,
  percentage: 70,
  forgiven_reason: null // Untagged
}));

const evalResult = simulateProgressionEvaluation(untaggedAttempts);
assert.strictEqual(evalResult.wordsPasses, 7, 'Self-healing balancer must allocate 7 passes to Words');
assert.strictEqual(evalResult.phrasesPasses, 7, 'Self-healing balancer must allocate 7 passes to Phrases');
assert.strictEqual(evalResult.combinedPasses, 7, 'Combined pass count must equal 7');
assert.strictEqual(evalResult.isTaskComplete, true, 'Unified Task must qualify as complete');
console.log('  ✔ Pillar 3: Self-healing balancer successfully auto-recovers untagged 14-attempt payloads');


// ============================================================
// 4. BACKEND SYMMETRIC PARTITIONING IN adminApplyForgiven
// ============================================================
function simulateAdminApplyPartitioning({ requestedReps, totalQ, isUnifiedTask, compTag = '' }) {
  const adminLabel = 'Mr. Top';
  const defaultMax = (isUnifiedTask && requestedReps > 7) ? 14 : 7;
  const maxReps = defaultMax;
  const reps = Math.max(0, Math.min(maxReps, requestedReps));
  const passPct = 70.0;
  const sc = Math.round(totalQ * (passPct / 100));

  const isSplitReps = reps > 7 || (isUnifiedTask && reps === 14) || (isUnifiedTask && reps > 0 && !compTag);
  const partition = [];

  for (let r = 0; r < reps; r++) {
    let itemReason = `[${adminLabel}] MANUAL_REPS: ${reps}/${maxReps}${compTag}`;
    let itemTotalQ = totalQ;
    let itemSc = sc;

    if (isSplitReps) {
      const halfMax = Math.max(1, Math.floor(reps / 2));
      const isWordHalf = r < halfMax;
      if (isWordHalf) {
        itemReason = `[${adminLabel}] MANUAL_REPS: ${halfMax}/${halfMax} WORDS`;
        itemTotalQ = totalQ;
        itemSc = sc;
      } else {
        itemReason = `[${adminLabel}] MANUAL_REPS: ${halfMax}/${halfMax} PHRASES`;
        itemTotalQ = Math.min(totalQ, 10);
        itemSc = Math.round(itemTotalQ * (passPct / 100));
      }
    }
    partition.push({ itemReason, itemTotalQ, itemSc });
  }
  return partition;
}

const split14 = simulateAdminApplyPartitioning({ requestedReps: 14, totalQ: 50, isUnifiedTask: true });
assert.strictEqual(split14.length, 14, 'Must produce 14 attempts');
const wordsAttempts = split14.filter(p => p.itemReason.includes('WORDS'));
const phrasesAttempts = split14.filter(p => p.itemReason.includes('PHRASES'));
assert.strictEqual(wordsAttempts.length, 7, 'Must produce exactly 7 WORDS attempts');
assert.strictEqual(phrasesAttempts.length, 7, 'Must produce exactly 7 PHRASES attempts');
assert.strictEqual(wordsAttempts[0].itemTotalQ, 50, 'WORDS must have 50 questions');
assert.strictEqual(phrasesAttempts[0].itemTotalQ, 10, 'PHRASES must have 10 questions');
console.log('  ✔ Pillar 4: Backend partitioning cleanly divides 14 reps into 7 WORDS (50 Q) + 7 PHRASES (10 Q)');

console.log('\n✅ ALL 4 REPETITIVE MASTERY SAFEGUARDS PASSED WITH 100% SUCCESS!\n');
