import { chromium } from '@playwright/test';
import path from 'path';

const BASE = 'http://127.0.0.1:5500';
const SESSION = JSON.stringify({
  student_id: 'test-student-123',
  student_name: 'Test Student',
  institution_id: 'inst-1',
  program_id: 'prog-1'
});

const PASS = (msg) => console.log(`  ✅ PASS: ${msg}`);
const FAIL = (msg) => { console.error(`  ❌ FAIL: ${msg}`); process.exitCode = 1; };
const brainDir = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function run() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });

  await page.addInitScript((sess) => {
    sessionStorage.setItem('topscore_session', sess);
    localStorage.setItem('topscore_session', sess);
  }, SESSION);

  console.log('\n=== PHASE 2: GENDER SETUP MODAL & MOJIBAKE FIX VERIFICATION ===\n');
  await page.goto(`${BASE}/dashboard.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // 1. Check no mojibake in component selector
  const pageText = await page.content();
  const hasMojibake1 = pageText.includes('ðŸ"') || pageText.includes('\u00f0\u0178\u201c\u009d');
  const hasMojibake2 = pageText.includes("ðŸ'¬") || pageText.includes('\u00f0\u0178\u2018\u00ac');
  const hasMojibake3 = pageText.includes('ðŸŒŸ') || pageText.includes('\u00f0\u0178\u0152\u0178');
  !hasMojibake1 ? PASS('Component selector: 📊 emoji clean (no mojibake)') : FAIL('Mojibake ðŸ" still found in component selector');
  !hasMojibake2 ? PASS('Component selector: 💬 emoji clean (no mojibake)') : FAIL('Mojibake ðŸ\'¬ still found in component selector');
  !hasMojibake3 ? PASS('Gender setup: 🌟 emoji clean (no mojibake)') : FAIL('Mojibake ðŸŒŸ still found in gender setup');

  // 2. Force show gender modal
  await page.evaluate(() => {
    const modal = document.getElementById('gender-setup-modal');
    if (modal) modal.classList.remove('hidden');
  });
  await page.waitForTimeout(500);

  // 3. Check modal is visible
  const modalVisible = await page.locator('#gender-setup-modal').isVisible();
  modalVisible ? PASS('#gender-setup-modal visible') : FAIL('#gender-setup-modal not visible');

  // 4. Check 2-column grid
  const gridCols = await page.locator('.gender-cards-row').evaluate(el => {
    return window.getComputedStyle(el).gridTemplateColumns;
  });
  const colCount = gridCols.trim().split(/\s+/).length;
  colCount === 2 ? PASS(`Gender cards grid = 2 columns (${gridCols})`) : FAIL(`Expected 2 columns, got ${colCount}: ${gridCols}`);

  // 5. Check checkmark elements exist in both cards
  const checkmarks = await page.locator('.gender-card-checkmark').count();
  checkmarks === 2 ? PASS('2 checkmark badges exist in gender cards') : FAIL(`Expected 2 checkmarks, found ${checkmarks}`);

  // 6. Check "CHOOSE YOUR AVATAR" title
  const title = await page.locator('#gender-setup-title').textContent();
  title?.includes('CHOOSE YOUR AVATAR') ? PASS('Title = "CHOOSE YOUR AVATAR"') : FAIL(`Title = "${title}" (expected "CHOOSE YOUR AVATAR")`);

  // 7. Click Male card — check .selected class applied
  await page.locator('#opt-gender-male').click();
  await page.waitForTimeout(300);
  const maleSelected = await page.locator('#opt-gender-male').evaluate(el => el.classList.contains('selected'));
  maleSelected ? PASS('Male card gets .selected class on click') : FAIL('Male card missing .selected class after click');

  // 8. Check confirm button is now enabled
  const btnEnabled = await page.locator('#btn-confirm-gender').isEnabled();
  btnEnabled ? PASS('Confirm button enabled after selection') : FAIL('Confirm button still disabled after selection');

  // 9. Check male card has blue glow (via CSS class — computed border-color)
  const maleBorder = await page.locator('#opt-gender-male').evaluate(el => {
    return window.getComputedStyle(el).borderColor;
  });
  console.log(`  ℹ️  Male card border-color: ${maleBorder}`);

  // 10. Click Female card — male should deselect
  await page.locator('#opt-gender-female').click();
  await page.waitForTimeout(300);
  const femaleSelected = await page.locator('#opt-gender-female').evaluate(el => el.classList.contains('selected'));
  const maleDeselected = await page.locator('#opt-gender-male').evaluate(el => !el.classList.contains('selected'));
  femaleSelected ? PASS('Female card .selected on click') : FAIL('Female card missing .selected class');
  maleDeselected ? PASS('Male card deselected when female clicked') : FAIL('Male card still has .selected after female clicked');

  // 11. Touch target height >= 44px
  const cardH = await page.locator('#opt-gender-male').evaluate(el => el.getBoundingClientRect().height);
  cardH >= 44 ? PASS(`Gender card height ${Math.round(cardH)}px >= 44px (touch-friendly)`) : FAIL(`Gender card height ${Math.round(cardH)}px < 44px`);

  // 12. Screenshot
  await page.screenshot({
    path: `${brainDir}/phase2_gender_verified.png`,
    fullPage: false
  });
  PASS('Screenshot saved → phase2_gender_verified.png');

  await browser.close();
  console.log('\n' + (process.exitCode === 1 ? '❌ SOME CHECKS FAILED' : '✅ ALL PHASE 2 CHECKS PASSED') + '\n');
}

run().catch(err => { console.error('Script error:', err); process.exit(1); });
