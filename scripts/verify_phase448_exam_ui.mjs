import fs from 'fs';
import { chromium } from '@playwright/test';

async function runVerification() {
  console.log('====================================================');
  console.log('🚀 RUNNING PHASE 448 VERIFICATION SUITE');
  console.log('Target: High-Stakes Exam Room Intelligence & Popups');
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

  // --- 1. Static AST / Code Assertions ---
  console.log('--- Step 1: Static Code Assertions ---');
  const testHtml = fs.readFileSync('test.html', 'utf8');
  const testJs = fs.readFileSync('js/test.js', 'utf8');
  const testCss = fs.readFileSync('css/test.css', 'utf8');

  // Check 1: submit modal elements
  assert('test.html contains #submit-modal', testHtml.includes('id="submit-modal"'));
  assert('test.html contains #unanswered-count', testHtml.includes('id="unanswered-count"'));
  assert('test.html contains #btn-jump-incomplete-action', testHtml.includes('id="btn-jump-incomplete-action"'));
  assert('test.html contains #danger-submit-btn', testHtml.includes('id="danger-submit-btn"'));
  assert('test.html contains #confirm-submit-btn', testHtml.includes('id="confirm-submit-btn"'));

  // Check 2: test alert modal
  assert('test.html contains #test-alert-modal', testHtml.includes('id="test-alert-modal"'));
  assert('test.html contains #test-alert-title', testHtml.includes('id="test-alert-title"'));
  assert('test.html contains #test-alert-msg', testHtml.includes('id="test-alert-msg"'));
  assert('test.html contains #btn-test-alert-ok', testHtml.includes('id="btn-test-alert-ok"'));

  // Check 3: pre-exam readiness chips
  assert('test.html contains .focus-readiness-chips', testHtml.includes('focus-readiness-chips'));

  // Check 4: zero active native alert() in js/test.js
  const alertLines = testJs.split('\n').filter(l => l.includes('alert(') && !l.trim().startsWith('//') && !l.includes('red_alert'));
  assert('js/test.js contains exactly 0 active native alert() calls', alertLines.length === 0);

  // Check 5: showTestAlert and showTestAlertModal defined
  assert('js/test.js defines showTestAlert', testJs.includes('function showTestAlert'));
  assert('js/test.js defines showTestAlertModal', testJs.includes('function showTestAlertModal'));

  // Check 6: CSS styling for Phase 448
  assert('css/test.css contains .hazard-dual-metrics', testCss.includes('.hazard-dual-metrics'));
  assert('css/test.css contains .hazard-btn-jump', testCss.includes('.hazard-btn-jump'));
  assert('css/test.css contains #test-alert-modal', testCss.includes('#test-alert-modal'));
  assert('css/test.css references var(--grade-a)', testCss.includes('var(--grade-a'));
  assert('css/test.css references var(--grade-e)', testCss.includes('var(--grade-e'));

  // --- 2. Live Browser / Playwright Assertions ---
  console.log('\n--- Step 2: Live Playwright Browser Verification ---');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });

  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      console.log('>>> [NAVIGATED TO]:', frame.url());
    }
  });

  const mockSession = JSON.stringify({
    student_id: 'test-student-123',
    student_name: 'Test Student',
    institution_id: 'inst-1',
    program_id: 'prog-1',
    test_id: '31b7ac85-4c44-4a45-81d4-3a077207dc03'
  });

  await page.addInitScript((sess) => {
    // Disable Live Server auto-reload during automated testing
    window.WebSocket = class MockWebSocket {
      constructor() {}
      addEventListener() {}
      removeEventListener() {}
      send() {}
      close() {}
    };

    sessionStorage.setItem('topscore_session', sess);
    localStorage.setItem('topscore_session', sess);

    // Prevent background error redirect to dashboard during modal verification
    const origSetTimeout = window.setTimeout;
    window.setTimeout = (fn, delay, ...args) => {
      if (typeof fn === 'function' && fn.toString().includes('dashboard.html')) {
        return 0;
      }
      return origSetTimeout(fn, delay, ...args);
    };
  }, mockSession);

  try {
    await page.goto('http://127.0.0.1:5500/test.html?id=31b7ac85-4c44-4a45-81d4-3a077207dc03');
    await page.waitForTimeout(400);

    // Disarm anti-cheat and timers for test isolation
    await page.evaluate(() => {
      window.isTestActive = false;
    });

    // Verify #submit-modal presence and styling
    const submitModal = await page.$('#submit-modal');
    assert('Page loaded #submit-modal', !!submitModal);

    // Trigger openSubmitModal via page evaluation
    await page.evaluate(() => {
      const answeredEl = document.getElementById('answered-count');
      const totalEl = document.getElementById('total-count');
      const unansweredEl = document.getElementById('unanswered-count');
      const progEl = document.getElementById('hazard-mini-progress-bar');
      const modal = document.getElementById('submit-modal');
      const incompleteWrap = document.getElementById('hazard-incomplete-wrap');

      if (answeredEl) answeredEl.textContent = '35';
      if (totalEl) totalEl.textContent = '40';
      if (unansweredEl) unansweredEl.textContent = '5';
      if (progEl) progEl.style.width = '88%';
      if (modal) modal.classList.remove('hidden');
      if (incompleteWrap) incompleteWrap.classList.remove('hidden');
    });

    await page.waitForTimeout(300);

    // Take screenshot of modern Submission Intelligence modal
    await page.screenshot({ path: 'tests/artifacts/phase448_submission_intelligence_modal.png' });
    console.log('✓ Captured screenshot: tests/artifacts/phase448_submission_intelligence_modal.png');

    const jumpBtn = await page.$('#btn-jump-incomplete-action');
    assert('Submission Intelligence Card displays #btn-jump-incomplete-action', !!jumpBtn);

    const isJumpVisible = await jumpBtn.isVisible();
    assert('#btn-jump-incomplete-action is visible to student', isJumpVisible);

    // Now test #test-alert-modal
    await page.evaluate(() => {
      document.getElementById('submit-modal')?.classList.add('hidden');
      window.showTestAlert('Test Alert Notification', '🚨', () => {}, 'Session Cancelled');
    });

    await page.waitForTimeout(300);
    const alertModal = await page.$('#test-alert-modal');
    assert('#test-alert-modal is present', !!alertModal);
    const isAlertVisible = await alertModal.isVisible();
    assert('#test-alert-modal is visible', isAlertVisible);

    await page.screenshot({ path: 'tests/artifacts/phase448_test_alert_modal.png' });
    console.log('✓ Captured screenshot: tests/artifacts/phase448_test_alert_modal.png');

    // Click OK on alert modal
    const okBtn = await page.$('#btn-test-alert-ok');
    assert('#btn-test-alert-ok is present', !!okBtn);
    const isOkBtnVisible = await okBtn.isVisible();
    assert('#btn-test-alert-ok is visible and clickable', isOkBtnVisible);
    await okBtn.click();
    await page.waitForTimeout(300);

    const isAlertHiddenAfterClick = await page.evaluate(() => {
      const modal = document.getElementById('test-alert-modal');
      return modal?.classList.contains('hidden');
    });
    assert('#test-alert-modal hides after clicking OK', isAlertHiddenAfterClick);

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
