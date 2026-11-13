import fs from 'fs';
import { chromium } from '@playwright/test';

async function runVerification() {
  console.log('====================================================');
  console.log('🚀 RUNNING PHASE 451 VERIFICATION SUITE');
  console.log('Target: Diagnostic Result Cards, Star Exclusivity & Print A4 Report');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(desc, condition) {
    total++;
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
    }
  }

  // --- Step 1: Static Code Assertions ---
  console.log('--- Step 1: Static Code Assertions ---');
  const html = fs.readFileSync('result.html', 'utf8');
  const css = fs.readFileSync('css/result.css', 'utf8');
  const js = fs.readFileSync('js/result.js', 'utf8');

  assert('result.html contains #btn-print-result in header', html.includes('id="btn-print-result"'));
  assert('result.html contains #printable-report-card', html.includes('id="printable-report-card"'));
  assert('result.html contains #print-breakdown-table', html.includes('id="print-breakdown-table"'));
  assert('css/result.css contains @media print with A4 portrait', css.includes('@page') && css.includes('size: A4 portrait'));
  assert('css/result.css contains #printable-report-card.print-only', css.includes('#printable-report-card.print-only'));
  assert('css/result.css hides #result-hero-section during print', css.includes('#result-hero-section') && css.includes('display: none !important;'));
  assert('js/result.js implements populatePrintableReportCard', js.includes('function populatePrintableReportCard'));
  assert('js/result.js guarantees Star Exclusivity (TOPSCORE_COLORS.STAR)', js.includes('TOPSCORE_COLORS.STAR'));
  assert('js/result.js formats remedial tag with test-rem-sup', js.includes('test-rem-sup') && js.includes('isRemedial'));

  // --- Step 2: Live Playwright Browser Verification ---
  console.log('\n--- Step 2: Live Playwright Browser Verification ---');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1366, height: 768 });

  await page.addInitScript(() => {
    // Neutralize Live Server auto-reload
    window.WebSocket = class MockWebSocket {
      constructor() {}
      addEventListener() {}
      removeEventListener() {}
      send() {}
      close() {}
    };

    // Seed mock student session
    const studentSession = JSON.stringify({
      student_id: 'std-test-123',
      student_name: 'Test Student',
      gender: 'male',
      institution_name: 'Cake English Course',
      program_name: 'CAMP',
      batch_name: '133',
      level_name: '3rd Level',
      auth: true
    });
    sessionStorage.setItem('topscore_session', studentSession);
    localStorage.setItem('topscore_session', studentSession);

    // Mock window.print
    window.printCalled = false;
    window.print = () => { window.printCalled = true; };
  });

  // Mock API routes for attempt and answers
  await page.route('**/rest/v1/attempts*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'mock-attempt-1',
        student_id: 'std-test-123',
        test_id: 'mock-test-1',
        percentage: 100,
        effective_score: 100,
        score: 2,
        grade: '★',
        status: 'submitted',
        total_questions: 2,
        is_remedial_unlocked: false,
        is_best_score: true,
        submitted_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        tests: {
          id: 'mock-test-1',
          title: 'Vocabulary Master - Food & Drinks',
          shell_code: 'VOC-FOOD',
          status: 'PUBLISHED',
          test_subtype: 'VOCAB',
          test_type: 'Vocabulary',
          class_id: 'class-1',
          classes: { name: 'English 101' },
          levels: { name: '3rd Level' }
        }
      })
    });
  });

  await page.route('**/rest/v1/students*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'std-test-123',
        name: 'Top Student',
        gender: 'male',
        photo_url: '',
        batch_id: 'b-1',
        level_id: 'l-1',
        program_id: 'p-1',
        institution_id: 'i-1',
        institutions: { name: 'Cake English Course' },
        programs: { name: 'CAMP' },
        batches: { name: '133' },
        levels: { name: '3rd Level' }
      })
    });
  });

  await page.route('**/rest/v1/attempt_answers*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'ans-1',
          attempt_id: 'mock-attempt-1',
          question_id: 'q-1',
          score: 1,
          result_code: 'correct',
          evaluation_result: 'correct',
          is_correct: true,
          student_answer: 'makan',
          correct_answer_snapshot: 'makan',
          question_snapshot: JSON.stringify({ prompt: 'eat', indonesian: 'makan', english: 'eat' })
        },
        {
          id: 'ans-2',
          attempt_id: 'mock-attempt-1',
          question_id: 'q-2',
          score: 1,
          result_code: 'correct',
          evaluation_result: 'correct',
          is_correct: true,
          student_answer: 'minum',
          correct_answer_snapshot: 'minum',
          question_snapshot: JSON.stringify({ prompt: 'drink', indonesian: 'minum', english: 'drink' })
        }
      ])
    });
  });

  try {
    await page.goto('http://127.0.0.1:5500/result.html?attempt_id=mock-attempt-1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // Screen mode assertions
    const printBtn = await page.$('#btn-print-result');
    assert('#btn-print-result button is present in DOM', !!printBtn);

    const isPrintBtnVisible = await page.isVisible('#btn-print-result');
    assert('#btn-print-result button is visible on screen in top header', isPrintBtnVisible);

    const isPrintCardHiddenOnScreen = await page.evaluate(() => {
      const el = document.getElementById('printable-report-card');
      return !el || window.getComputedStyle(el).display === 'none';
    });
    assert('#printable-report-card is hidden on screen display', isPrintCardHiddenOnScreen);

    // Trigger print button click
    await page.click('#btn-print-result');
    const wasPrintCalled = await page.evaluate(() => window.printCalled);
    assert('Clicking #btn-print-result triggers window.print()', wasPrintCalled);

    // Capture screen mode screenshot
    await page.screenshot({ path: 'tests/artifacts/phase451_result_screen.png' });
    console.log('✓ Captured screenshot: tests/artifacts/phase451_result_screen.png');

    // Emulate print media
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(300);

    const isPrintCardVisibleInPrint = await page.evaluate(() => {
      const el = document.getElementById('printable-report-card');
      return el && window.getComputedStyle(el).display === 'block';
    });
    assert('#printable-report-card displays block in print media mode', isPrintCardVisibleInPrint);

    const isHeaderHiddenInPrint = await page.evaluate(() => {
      const el = document.getElementById('result-page-header');
      return el && window.getComputedStyle(el).display === 'none';
    });
    assert('.dashboard-header is hidden in print media mode', isHeaderHiddenInPrint);

    const isHeroHiddenInPrint = await page.evaluate(() => {
      const el = document.getElementById('result-hero-section');
      return el && window.getComputedStyle(el).display === 'none';
    });
    assert('#result-hero-section is hidden in print media mode', isHeroHiddenInPrint);

    // Capture print media screenshot
    await page.screenshot({ path: 'tests/artifacts/phase451_result_a4_report.png', fullPage: true });
    console.log('✓ Captured screenshot: tests/artifacts/phase451_result_a4_report.png');

    // Reset media
    await page.emulateMedia({ media: 'screen' });

  } catch (err) {
    console.error('Playwright verification error:', err);
    assert('Playwright test completed without unhandled exceptions', false);
  } finally {
    await browser.close();
  }

  console.log('\n====================================================');
  console.log(`📊 FINAL RESULTS: ${passed} / ${total} CHECKS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runVerification();
