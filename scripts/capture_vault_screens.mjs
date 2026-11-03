import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\Top\\.gemini\\antigravity\\brain\\44e7f103-6ced-4fdc-b086-cbe3ff4c6546';
const BASE_URL = 'http://127.0.0.1:5500';

async function capture() {
  console.log('Launching Edge to capture Vocabulary Vault screens...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  await context.addInitScript(() => {
    const session = JSON.stringify({
      admin_id: 'admin-super',
      role: 'admin',
      authenticated_at: new Date().toISOString()
    });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });

  const page = await context.newPage();

  // 1. Words Tab
  console.log('Navigating to Words Tab: ' + BASE_URL + '/admin.html#vocab_vault?tab=vocab');
  await page.goto(`${BASE_URL}/admin.html#vocab_vault?tab=vocab`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const wordsImgPath = path.join(ARTIFACTS_DIR, 'vocab_vault_words_tab.png');
  await page.screenshot({ path: wordsImgPath, fullPage: false });
  console.log(`✓ Words Tab screenshot saved: ${wordsImgPath}`);

  // 2. Blueprint Tab
  console.log('Navigating to Topic Blueprint Tab: ' + BASE_URL + '/admin.html#vocab_vault?tab=blueprint');
  await page.goto(`${BASE_URL}/admin.html#vocab_vault?tab=blueprint`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const blueprintImgPath = path.join(ARTIFACTS_DIR, 'vocab_vault_blueprint_tab.png');
  await page.screenshot({ path: blueprintImgPath, fullPage: false });
  console.log(`✓ Blueprint Tab screenshot saved: ${blueprintImgPath}`);

  await browser.close();
  console.log('Screenshots captured successfully!');
}

capture().catch(console.error);
