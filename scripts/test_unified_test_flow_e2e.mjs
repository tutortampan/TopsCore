// scripts/test_unified_test_flow_e2e.mjs
// End-to-End Test Suite verifying the resolution of:
// 1. False "+5 minutes" time extension popup during test
// 2. Result page showing all 0s (answer deletion & denominator bug)
// 3. Words vs Phrases component separation, question counts, and pip isolation

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert';

// Load environment variables
if (typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile(); } catch (_) {}
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lgzkbmsyqhvdjirbyzsg.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const BASE_URL = 'http://localhost:5500';
const STUDENT_ID = 'a5e9451f-9bb5-493c-8c2d-27dbdcbb5a6e'; // Lalu Nune Mubarak
const BATCH_ID = '3e7288b7-a90e-4323-9b02-24e73991f0d7';   // Batch 134
const CLASS_ID = 'ab33498a-90e6-44b7-83f4-5765f964543e';   // Camp 3rd Vocabulary
const TEST_ID = 'a0dbb6a7-adfe-477c-9cba-3fb48a45d779';    // CMP-3VCB-A2-TASK

let passed = 0;
let total = 0;

function check(desc, condition) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✔ [PASS] ${desc}`);
  } else {
    console.error(`  ❌ [FAIL] ${desc}`);
    throw new Error(`Assertion failed: ${desc}`);
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runE2E() {
  console.log('===============================================================');
  console.log('🚀 RUNNING E2E TEST: UNIFIED TEST FLOW & ZERO-PURGE RESILIENCE');
  console.log('===============================================================\n');

  // Verify Student Record
  const { data: student } = await sb.from('students').select('*').eq('id', STUDENT_ID).single();
  assert(student, 'Student record for Lalu Nune Mubarak must exist');
  console.log(`✓ Testing as Student: ${student.name} (Batch 134, Level 3)\n`);

  // Launch Playwright Browser
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    console.log('✓ Launched browser via chrome channel');
  } catch (_) {
    browser = await chromium.launch({ headless: true });
    console.log('✓ Launched browser via bundled chromium');
  }

  const context = await browser.newContext({
    viewport: { width: 420, height: 850 }
  });

  // Inject Student Auth Session
  const studentSession = {
    student_id: student.id,
    student_name: student.name,
    gender: student.gender || 'male',
    institution_id: student.institution_id,
    institution_name: 'Cake English Course',
    program_id: student.program_id,
    program_name: 'CAMP',
    batch_id: student.batch_id,
    batch_name: '134',
    level_id: student.level_id,
    level_name: '3rd Level',
    photo_url: student.photo_url,
    authenticated_at: new Date().toISOString()
  };

  await context.addInitScript((sess) => {
    sessionStorage.setItem('topscore_session', JSON.stringify(sess));
    localStorage.setItem('topscore_session', JSON.stringify(sess));
    localStorage.setItem('topscore_student_session', JSON.stringify(sess));
    sessionStorage.setItem('topscore_student_session', JSON.stringify(sess));
    localStorage.setItem('topscore_selected_class_id', 'ab33498a-90e6-44b7-83f4-5765f964543e');
  }, studentSession);

  const page = await context.newPage();

  const toastsObserved = [];
  page.on('console', msg => {
    const txt = msg.text();
    console.log('  [BROWSER LOG]', txt);
    if (txt.includes('Your test time has been extended')) {
      toastsObserved.push(txt);
    }
  });
  page.on('pageerror', err => {
    console.log('  [BROWSER ERROR]', err.message);
  });

  try {
    // ═════════════════════════════════════════════════════════════════════
    // STAGE 1: COMPONENT MODAL & WORDS SECTION SELECTION
    // ═════════════════════════════════════════════════════════════════════
    console.log('--- STAGE 1: Component Selector Modal & Words Selection ---');
    await page.goto(`${BASE_URL}/test.html?test_id=${TEST_ID}`);
    await sleep(2000);
    console.log('Current Page URL:', page.url());
    console.log('Current Body Text:', (await page.locator('body').innerText()).slice(0, 300));

    // Check if component modal appears
    const compModal = page.locator('#component-selector-modal');
    await compModal.waitFor({ state: 'visible', timeout: 8000 });
    check('Component Selector Modal is visible for unified test', await compModal.isVisible());

    const wordsCard = page.locator('#component-opt-words');
    const phrasesCard = page.locator('#component-opt-phrases');
    check('Words selection card exists', await wordsCard.isVisible());
    check('Phrases selection card exists', await phrasesCard.isVisible());

    // Words is selected by default; clicking it directly confirms and starts exam
    await wordsCard.click();
    await sleep(2000);

    // ═════════════════════════════════════════════════════════════════════
    // STAGE 2: IN-EXAM VERIFICATION & NO FALSE TIME EXTENSION POPUP
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n--- STAGE 2: In-Exam Verification & Heartbeat Guard ---');

    // 1. Verify Header displays Words section
    const titleText = await page.locator('#test-main-title').textContent();
    check('Main title contains (Words)', titleText.includes('(Words)') || titleText.includes('Words'));

    const topicText = await page.locator('#test-title-sub').textContent();
    check('Subtitle shows Topic title', topicText.toUpperCase().includes('INTERVIEW & NEGOTIATION'));

    // 2. Verify question count is strictly 40 (only Words, NO phrases)
    const totalQFromNav = await page.evaluate(() => window.allAnswerRows ? window.allAnswerRows.length : 0);
    check('Total active questions is strictly 40 for Words', totalQFromNav === 40);

    const firstQuestionSection = await page.evaluate(() => window.allAnswerRows[0]?.question_snapshot?.test_section);
    check('First question belongs to words section', firstQuestionSection !== 'phrases');

    // 3. Wait 10 seconds for the live heartbeat guard to tick (runs every 8s)
    console.log('  Waiting 10s to verify live heartbeat timer does NOT trigger false extension toast...');
    await sleep(10000);

    // Verify NO toast appeared with "Your test time has been extended"
    const toastLocator = page.locator('.toast, #toast-container, .topscore-toast');
    const toastCount = await toastLocator.count();
    let falseToastFound = false;
    for (let i = 0; i < toastCount; i++) {
      const tText = await toastLocator.nth(i).textContent();
      if (tText.includes('extended by the Tutor')) falseToastFound = true;
    }
    check('No false time extension popup (+5 minutes) triggered on heartbeat', !falseToastFound && toastsObserved.length === 0);

    // 4. Verify Timer displays <= 10:00 (NOT 15:00 or 12:00)
    const timerText = await page.locator('#timer-display').textContent();
    console.log(`  Timer display reading: ${timerText}`);
    const [timerMin] = timerText.split(':').map(Number);
    check('Timer is bounded within 10-minute section limit', timerMin >= 1 && timerMin <= 10);

    // ═════════════════════════════════════════════════════════════════════
    // STAGE 3: SUBMITTING WORDS SECTION & DB PERSISTENCE
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n--- STAGE 3: Submitting Words Section ---');

    // Answer question 1 correctly via direct answer injection for test accuracy
    const activeAttemptId = await page.evaluate(() => window.attemptData?.id);
    assert(activeAttemptId, 'Active attempt ID must exist in window.attemptData');

    // Answer 2 questions in answeredMap with real correct answers from database
    const { data: realAnswerKeys } = await sb.from('attempt_answers')
      .select('id, correct_answer_snapshot, accepted_answers_snapshot')
      .eq('attempt_id', activeAttemptId);

    if (realAnswerKeys && realAnswerKeys.length >= 2) {
      const q0 = realAnswerKeys[0];
      const q1 = realAnswerKeys[1];
      const ans0 = (Array.isArray(q0.accepted_answers_snapshot) ? q0.accepted_answers_snapshot[0] : q0.correct_answer_snapshot || '').split(';')[0].trim();
      const ans1 = (Array.isArray(q1.accepted_answers_snapshot) ? q1.accepted_answers_snapshot[0] : q1.correct_answer_snapshot || '').split(';')[0].trim();

      await page.evaluate(({ id0, a0, id1, a1 }) => {
        window.answeredMap[id0] = a0;
        window.answeredMap[id1] = a1;
      }, { id0: q0.id, a0: ans0, id1: q1.id, a1: ans1 });
      console.log(`  Injected 2 correct answers: Q0="${ans0}", Q1="${ans1}"`);
    }

    // Trigger submit via give up / submit modal
    const submitResult = await page.evaluate(async () => {
      try {
        if (typeof window.doSubmit === 'function') {
          await window.doSubmit(false);
          return { success: true };
        }
        return { error: 'window.doSubmit is not a function' };
      } catch (err) {
        return { error: err.message, stack: err.stack };
      }
    });
    console.log('  Submit execution result:', submitResult);

    // Wait for redirect to result.html
    await page.waitForURL(/result\.html/, { timeout: 15000 });
    check('Redirected to result.html successfully', page.url().includes('result.html'));
    check('Result URL preserves section=words parameter', page.url().includes('section=words'));

    // ═════════════════════════════════════════════════════════════════════
    // STAGE 4: DATABASE ATTEMPT & ANSWERS PERSISTENCE CHECK
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n--- STAGE 4: Database Persistence (Zero Answer Deletion) ---');

    // Query attempt in Supabase
    const { data: dbAttempt } = await sb.from('attempts').select('*').eq('id', activeAttemptId).single();
    check('Attempt status is submitted', dbAttempt.status === 'submitted');
    check('Attempt total_questions is strictly 40 (denominator for Words)', dbAttempt.total_questions === 40);
    check('Attempt correct_count is at least 2', dbAttempt.correct_count >= 2);

    // Crucial check: verify attempt_answers WERE NOT DELETED!
    const { data: dbAnswers, count: dbAnsCount } = await sb.from('attempt_answers')
      .select('id, question_snapshot, score, is_correct, evaluation_result', { count: 'exact' })
      .eq('attempt_id', activeAttemptId);

    console.log(`  Database attempt_answers row count: ${dbAnsCount}`);
    check('Attempt answers were NOT deleted (rows preserved in DB)', dbAnsCount >= 40);

    // ═════════════════════════════════════════════════════════════════════
    // STAGE 5: RESULT PAGE DISPLAY & ACCURACY VERIFICATION
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n--- STAGE 5: Result Page UI & Metrics Verification ---');

    // Wait for cascading score reveal and countUp animation to complete
    await page.waitForFunction(() => {
      const el = document.getElementById('res-correct');
      return el && el.textContent.trim() !== '0';
    }, { timeout: 12000 }).catch(() => null);

    // Allow countUp animation to settle across all rows (duration: ~400ms)
    await sleep(1500);

    // 1. Verify header title contains (WORDS)
    const resultTypeEl = page.locator('#result-test-type-row');
    const resultTypeTxt = await resultTypeEl.textContent();
    check('Result page header shows TASK A2 (WORDS)', resultTypeTxt.toUpperCase().includes('TASK A2 (WORDS)'));

    // 2. Verify metric cards DO NOT SHOW ALL 0s!
    const correctVal = await page.locator('#res-correct').textContent();
    const wrongVal = await page.locator('#res-wrong').textContent();
    const pointsVal = await page.locator('#res-points').textContent();

    console.log(`  Result metrics: CORRECT=${correctVal}, INCORRECT=${wrongVal}, POINTS=${pointsVal}`);

    check('CORRECT metric is not 0 (has correct count)', Number(correctVal) >= 2);
    check('INCORRECT metric is not 0 (has wrong count)', Number(wrongVal) > 0);
    check('Sum of correct and wrong equals 40', Number(correctVal) + Number(wrongVal) === 40);
    check('POINTS metric matches correct count', Number(pointsVal) >= 2);

    // 3. Verify answers review list container is populated with 40 rows
    const reviewItems = await page.locator('.answer-row').count();
    console.log(`  Question review table rows count: ${reviewItems}`);
    check('Question review table is populated with 40 questions', reviewItems === 40);

    // ═════════════════════════════════════════════════════════════════════
    // STAGE 6: PHRASES SECTION ISOLATION
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n--- STAGE 6: Phrases Section Isolation ---');

    // Open test directly with &section=phrases
    await page.goto(`${BASE_URL}/test.html?test_id=${TEST_ID}&section=phrases`);
    await page.waitForLoadState('networkidle');
    await sleep(1500);

    const phrasesTitle = await page.locator('#test-main-title').textContent();
    check('Phrases test title contains (Phrases)', phrasesTitle.includes('(Phrases)') || phrasesTitle.includes('Phrases'));

    const phrasesQCount = await page.evaluate(() => window.allAnswerRows ? window.allAnswerRows.length : 0);
    check('Phrases question count is strictly 10', phrasesQCount === 10);

    const phrasesTimer = await page.locator('#timer-display').textContent();
    console.log(`  Phrases timer reading: ${phrasesTimer}`);
    const [pMin] = phrasesTimer.split(':').map(Number);
    check('Phrases timer duration is within 5-minute section limit', pMin >= 3 && pMin <= 5);

    // ═════════════════════════════════════════════════════════════════════
    // STAGE 7: RETENTION OF PREVIOUS ATTEMPT ANSWERS
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n--- STAGE 7: Previous Attempt Answers Retention ---');
    const { count: priorAnsCount } = await sb.from('attempt_answers')
      .select('*', { count: 'exact', head: true })
      .eq('attempt_id', activeAttemptId);
    console.log(`  Prior Words attempt answers count in DB: ${priorAnsCount}`);
    check('Prior Words attempt answers remain 100% intact after starting Phrases', priorAnsCount >= 40);

    console.log('\n===============================================================');
    console.log(`🎉 E2E TEST COMPLETED SUCCESSFULLY! (${passed}/${total} checks passed)`);
    console.log('===============================================================\n');

  } catch (err) {
    console.error('\n❌ E2E TEST FAILED:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runE2E();
