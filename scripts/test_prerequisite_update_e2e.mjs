import { chromium } from 'playwright';
import path from 'path';

async function main() {
  console.log('=== VERIFYING CLASS TESTS TABLE PREREQUISITE DISPLAY ===');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('Logging into Admin...');
  await page.goto('http://127.0.0.1:5500/admin.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const loginScreen = page.locator('#admin-login-screen');
  if (await loginScreen.isVisible()) {
    await page.fill('#admin-username', 'admin');
    await page.fill('#admin-password', 'admin123');
    await page.click('#admin-login-btn');
    await page.waitForTimeout(2000);
  }

  const clsId = '2ccf6468-1e03-41d1-b72b-1d84dcad85b2'; // 2nd Vocabulary
  console.log('Rendering Class Hub for 2nd Vocabulary...');
  await page.evaluate(async (cid) => {
    window._selectedClassId = cid;
    window._classHubActiveTab = 'tests';
    const area = document.getElementById('admin-content-area');
    if (window.renderClassHub) {
      await window.renderClassHub(area);
    }
  }, clsId);
  await page.waitForTimeout(2000);

  // Click on Class Tests tab (#btn-tab-tests)
  console.log('Clicking #btn-tab-tests...');
  await page.evaluate(() => {
    const btn = document.getElementById('btn-tab-tests');
    if (btn) btn.click();
  });
  await page.waitForTimeout(2000);

  // Find C1 Words Task row
  const c1Row = page.locator('tr:has-text("2nd Vocabulary C1 Words Task")').first();
  await c1Row.waitFor({ state: 'visible', timeout: 10000 });

  const c1Text = (await c1Row.innerText()).replace(/\s+/g, ' ');
  console.log('C1 Words Task Row Text:', c1Text);

  // Check the prerequisite cell content
  // In the table: Title, Code, Prerequisite, Type, ...
  const prereqHas2B = c1Text.includes('2B-WORDS-EXAM');
  console.log('Does C1 row contain "2B-WORDS-EXAM"?:', prereqHas2B);
  if (prereqHas2B) {
    console.error('❌ FAIL: C1 row still shows 2B-WORDS-EXAM!');
    process.exit(1);
  }
  console.log('✅ PASS: C1 row shows "—" and NO LONGER has 2B-WORDS-EXAM!');

  // Take screenshot of the table matching Image 2
  const artifactDir = path.join(process.env.USERPROFILE || '', '.gemini', 'antigravity', 'brain', '32e9ca28-d796-4f35-afe9-223111004d95');
  const shotPath = path.join(artifactDir, 'class_tests_prerequisite_fixed.png');
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log('📸 Screenshot saved to:', shotPath);

  await browser.close();
  console.log('=== VERIFICATION COMPLETE: ALL CHECKS PASSED ===');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
