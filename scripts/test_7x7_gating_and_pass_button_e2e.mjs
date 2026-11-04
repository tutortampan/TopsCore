import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('=== STARTING PLAYWRIGHT E2E: 7x7 GATING & PASS COUNTER BUTTON VERIFICATION ===');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  
  // Mobile Viewport matching user's phone screenshot
  const context = await browser.newContext({
    viewport: { width: 420, height: 860 }
  });
  const page = await context.newPage();

  // Set real student session for Queen Isnantika Salsabila
  await page.addInitScript(() => {
    sessionStorage.setItem('topscore_session', JSON.stringify({
      student_id: 'b0fce8b7-37c4-41c0-93b9-f3bab8142c83',
      student_name: 'Miss Isnantika Salsabila',
      name: 'Miss Isnantika Salsabila',
      gender: 'female',
      institution_name: 'CEC',
      program_name: 'Camp',
      batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7',
      batch_name: '134',
      level_id: '9936683a-5b4a-4796-bb5d-a7fd8ecf0b71',
      level_name: '2nd Level',
      level_number: 2,
      has_photo: true,
      avatar_url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="teal"/></svg>',
      photo_url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="teal"/></svg>'
    }));
  });

  console.log('Navigating to http://127.0.0.1:5500/dashboard.html for Queen Isnantika Salsabila...');
  await page.goto('http://127.0.0.1:5500/dashboard.html');
  await page.waitForTimeout(6000); // Allow Supabase Cloud queries to complete

  // Close modals if any open
  await page.evaluate(() => {
    document.getElementById('photo-setup-modal')?.classList.add('hidden');
    document.getElementById('onboard-education-modal')?.classList.add('hidden');
  });

  // TEST 1: Section 3 Grade Legend - No mystery number "40"
  console.log('\n[1] Verifying Section 3: Grade Legend & No Flashcard Button');
  const flashcardBtn = await page.$('#btn-lobby-flashcards');
  if (flashcardBtn !== null) {
    throw new Error('FAIL: #btn-lobby-flashcards still exists in DOM!');
  }
  console.log('  ✅ PASS: #btn-lobby-flashcards successfully removed from DOM!');

  const achievementText = await page.$eval('#dashboard-achievement-text', el => el.textContent.trim());
  console.log(`  Grade description text: "${achievementText}"`);
  if (achievementText.includes('40')) {
    throw new Error(`FAIL: Grade description text contains "40": "${achievementText}"`);
  }
  console.log('  ✅ PASS: Grade description text is completely clean of any "40" number!');

  // TEST 2: Section 5 Repetitions Row
  console.log('\n[2] Verifying Section 5: Repetitions Progress Row');
  const repRight = await page.$eval('#repetition-deck-right', el => el.textContent.trim());
  console.log(`  Repetition counter pill: "${repRight}"`);
  if (repRight !== '1/7') {
    throw new Error(`FAIL: Expected "1/7" for active task, got "${repRight}"`);
  }
  console.log('  ✅ PASS: Section 5 correctly shows "1/7" for the active task!');

  // TEST 3: Section 6 Action Button - Pass Counter Badge
  console.log('\n[3] Verifying Section 6: Next Assessment Action Button');
  const upNextTitle = await page.$eval('#up-next-container .next-test-title', el => el.textContent.trim());
  console.log(`  Next Assessment Title: "${upNextTitle}"`);
  if (!upNextTitle.includes('C1 Words Task')) {
    throw new Error(`FAIL: Expected next test to stay on C1 (1/7 passes), but got "${upNextTitle}"`);
  }
  console.log('  ✅ PASS: 7x7 Gating holds! C1 (1/7 passes) does NOT advance to C2!');

  const nextBtn = page.locator('#up-next-container .next-test-go-btn');
  const isVisible = await nextBtn.isVisible();
  console.log(`  Action button visible: ${isVisible}`);
  if (!isVisible) {
    throw new Error('FAIL: Next assessment button is not visible!');
  }

  const btnClasses = await nextBtn.getAttribute('class');
  console.log(`  Button class list: "${btnClasses}"`);
  if (!btnClasses.includes('pass-counter-btn') || !btnClasses.includes('is-pass-tier-e')) {
    throw new Error(`FAIL: Button missing pass-counter-btn or is-pass-tier-e: "${btnClasses}"`);
  }

  const btnText = await nextBtn.innerText();
  console.log(`  Button content/text: "${btnText.trim()}"`);
  if (btnText.trim() !== '1') {
    throw new Error(`FAIL: Expected pass count "1" on button, got "${btnText.trim()}"`);
  }
  console.log('  ✅ PASS: Action button correctly renders number "1" with Red E tier!');

  const computedStyle = await nextBtn.evaluate(el => {
    const s = window.getComputedStyle(el);
    return {
      bg: s.backgroundColor,
      color: s.color,
      width: s.width,
      height: s.height,
      fontSize: s.fontSize,
      fontWeight: s.fontWeight
    };
  });
  console.log('  Button computed styles:', computedStyle);

  // Take screenshot
  const screenshotPath = 'C:/Users/ASUS/.gemini/antigravity/brain/32e9ca28-d796-4f35-afe9-223111004d95/dashboard_7x7_pass_counter_verified.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`\nScreenshot saved to: ${screenshotPath}`);

  await browser.close();
  console.log('\n=== ALL PLAYWRIGHT E2E CHECKS PASSED 100% ===');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
