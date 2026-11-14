import fs from 'fs';
import { chromium } from '@playwright/test';

async function runVerification() {
  console.log('====================================================');
  console.log('🚀 RUNNING PHASE 449 VERIFICATION SUITE');
  console.log('Target: Admin Master Edit Safety HUD & 32px Toolbars');
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
  const adminHtml = fs.readFileSync('admin.html', 'utf8');
  const adminCss = fs.readFileSync('css/admin.css', 'utf8');
  const appJs = fs.readFileSync('js/admin/app.js', 'utf8');

  assert('admin.html contains #master-edit-safety-hud', adminHtml.includes('id="master-edit-safety-hud"'));
  assert('admin.html contains #btn-safety-hud-exit', adminHtml.includes('id="btn-safety-hud-exit"'));
  assert('css/admin.css contains body.global-edit-mode-on #master-edit-safety-hud', adminCss.includes('body.global-edit-mode-on #master-edit-safety-hud'));
  assert('css/admin.css standardizes table-toolbar-unified to 32px', adminCss.includes('height: 32px !important') && adminCss.includes('.table-toolbar-unified'));
  assert('js/admin/app.js wires ESC key listener for edit mode', appJs.includes("e.key === 'Escape'"));

  // --- 2. Live Playwright Browser Verification ---
  console.log('\n--- Step 2: Live Playwright Browser Verification ---');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1366, height: 768 });

  // Disable Live Server auto-reload in testing
  await page.addInitScript(() => {
    window.WebSocket = class MockWebSocket {
      constructor() {}
      addEventListener() {}
      removeEventListener() {}
      send() {}
      close() {}
    };

    const adminSession = JSON.stringify({
      username: 'admin',
      role: 'admin',
      auth: true,
      timestamp: Date.now()
    });
    sessionStorage.setItem('topscore_admin_session', adminSession);
    localStorage.setItem('topscore_admin_session', adminSession);
  });

  try {
    await page.goto('http://127.0.0.1:5500/admin.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    const hudEl = await page.$('#master-edit-safety-hud');
    assert('DOM contains #master-edit-safety-hud', !!hudEl);

    // Initial state: HUD should be hidden (display: none)
    const initialDisplay = await page.evaluate(() => {
      const el = document.getElementById('master-edit-safety-hud');
      return window.getComputedStyle(el).display;
    });
    assert('Initial state: #master-edit-safety-hud is hidden (display: none)', initialDisplay === 'none');

    // Toggle Master Edit Mode ON
    await page.evaluate(() => {
      if (typeof window.setGlobalEditMode === 'function') {
        window.setGlobalEditMode(true);
      } else {
        document.body.classList.add('global-edit-mode-on');
        document.body.classList.remove('global-edit-mode-off');
      }
    });
    await page.waitForTimeout(300);

    const activeDisplay = await page.evaluate(() => {
      const el = document.getElementById('master-edit-safety-hud');
      return window.getComputedStyle(el).display;
    });
    assert('Active Edit Mode: #master-edit-safety-hud displays as flex', activeDisplay === 'flex');

    const exitBtn = await page.$('#btn-safety-hud-exit');
    assert('#btn-safety-hud-exit is present and visible', await exitBtn.isVisible());

    // Capture screenshot of Master Edit Mode Safety HUD
    await page.screenshot({ path: 'tests/artifacts/phase449_master_edit_safety_hud.png' });
    console.log('✓ Captured screenshot: tests/artifacts/phase449_master_edit_safety_hud.png');

    // Press ESC key to exit
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const isExitViaEsc = await page.evaluate(() => {
      return !document.body.classList.contains('global-edit-mode-on');
    });
    assert('Pressing ESC toggles Master Edit Mode OFF', isExitViaEsc);

    // Test 32px toolbar height computation
    const toolbarHeight = await page.evaluate(() => {
      const testToolbar = document.createElement('div');
      testToolbar.className = 'table-toolbar-unified';
      document.body.appendChild(testToolbar);
      const h = window.getComputedStyle(testToolbar).height;
      testToolbar.remove();
      return h;
    });
    assert('.table-toolbar-unified computed height is strictly 32px', toolbarHeight === '32px');

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

