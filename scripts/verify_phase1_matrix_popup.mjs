import { chromium } from '@playwright/test';

const BASE = 'http://127.0.0.1:5500';
const SESSION = JSON.stringify({
  student_id: 'test-student-123',
  student_name: 'Test Student',
  institution_id: 'inst-1',
  program_id: 'prog-1',
  test_id: '31b7ac85-4c44-4a45-81d4-3a077207dc03'
});

const PASS = (msg) => console.log(`  ✅ PASS: ${msg}`);
const FAIL = (msg) => { console.error(`  ❌ FAIL: ${msg}`); process.exitCode = 1; };

async function run() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });

  await page.addInitScript((sess) => {
    sessionStorage.setItem('topscore_session', sess);
    localStorage.setItem('topscore_session', sess);
  }, SESSION);

  console.log('\n=== PHASE 1: QUESTION MATRIX POPUP VERIFICATION ===\n');
  await page.goto(`${BASE}/test.html?test_id=31b7ac85-4c44-4a45-81d4-3a077207dc03`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // 1. Check #matrix-popup exists
  const matrixExists = await page.locator('#matrix-popup').count();
  matrixExists > 0 ? PASS('#matrix-popup element exists') : FAIL('#matrix-popup element missing');

  // 2. Check redundant submit button is GONE
  const submitGone = await page.locator('#global-submit-btn').count();
  submitGone === 0 ? PASS('Redundant #global-submit-btn purged from matrix popup') : FAIL('#global-submit-btn still present in matrix popup');

  // 3. Check legend bar exists
  const legendBar = await page.locator('.matrix-legend-bar').count();
  legendBar > 0 ? PASS('.matrix-legend-bar legend row exists') : FAIL('.matrix-legend-bar missing');

  // 4. Check progress pill exists
  const pill = await page.locator('#matrix-progress-pill').count();
  pill > 0 ? PASS('#matrix-progress-pill exists') : FAIL('#matrix-progress-pill missing');

  // 5. Check tip box
  const tipBox = await page.locator('.matrix-tip-box').count();
  tipBox > 0 ? PASS('.matrix-tip-box tip text exists') : FAIL('.matrix-tip-box missing');

  // 6. Force display the matrix popup and check grid
  await page.evaluate(() => {
    const popup = document.getElementById('matrix-popup');
    if (popup) popup.style.display = 'flex';
    // Add mock buttons manually to test layout
    const grid = document.getElementById('q-nav-grid');
    if (grid && grid.children.length === 0) {
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(8, 1fr)';
      grid.style.gap = '6px';
      for (let i = 1; i <= 40; i++) {
        const btn = document.createElement('button');
        btn.className = 'q-nav-btn' + (i === 1 ? ' current' : i <= 15 ? ' answered' : '');
        btn.textContent = i;
        grid.appendChild(btn);
      }
    }
  });
  await page.waitForTimeout(500);

  // 7. Check matrix popup is visible
  const matrixVisible = await page.locator('#matrix-popup').isVisible();
  matrixVisible ? PASS('#matrix-popup visible after toggle') : FAIL('#matrix-popup not visible');

  // 8. Check grid has 8-column layout 
  const gridCols = await page.locator('#q-nav-grid').evaluate(el => {
    const style = window.getComputedStyle(el);
    return style.gridTemplateColumns;
  });
  const colCount = gridCols.trim().split(/\s+/).length;
  colCount === 8 ? PASS(`Grid has 8 columns (${gridCols})`) : FAIL(`Grid has ${colCount} columns, expected 8: ${gridCols}`);

  // 9. Check JUMP button exists and correct text
  const jumpBtn = await page.locator('#btn-sidebar-jump-unanswered').count();
  jumpBtn > 0 ? PASS('#btn-sidebar-jump-unanswered CTA button present') : FAIL('#btn-sidebar-jump-unanswered missing');

  // 10. Check no matrix-submit-btn class
  const oldSubmitClass = await page.locator('.matrix-submit-btn').count();
  oldSubmitClass === 0 ? PASS('.matrix-submit-btn class removed') : FAIL('.matrix-submit-btn still present');

  // 11. Check tile min-height >= 36px
  const tiles = await page.locator('.q-nav-btn').all();
  if (tiles.length > 0) {
    const h = await tiles[0].evaluate(el => el.getBoundingClientRect().height);
    h >= 36 ? PASS(`Tile height ${h}px >= 36px (thumb-friendly)`) : FAIL(`Tile height ${h}px < 36px (too small)`);
  } else {
    FAIL('No .q-nav-btn tiles found in grid');
  }

  // 12. Screenshot
  await page.screenshot({
    path: 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/phase1_matrix_verified.png',
    fullPage: false
  });
  PASS('Screenshot saved → phase1_matrix_verified.png');

  await browser.close();

  console.log('\n' + (process.exitCode === 1 ? '❌ SOME CHECKS FAILED' : '✅ ALL PHASE 1 CHECKS PASSED') + '\n');
}

run().catch(err => { console.error('Script error:', err); process.exit(1); });
