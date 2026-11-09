import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\Top\\.gemini\\antigravity\\brain\\30416560-f6e5-4275-91c0-9f8f8014feb0';
const BASE_URL = 'http://127.0.0.1:5500';

async function capture() {
  console.log('Launching Edge for Class Hub 2nd Vocabulary verification...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await adminContext.addInitScript(() => {
    const session = JSON.stringify({
      admin_id: 'admin-super',
      role: 'admin',
      authenticated_at: new Date().toISOString()
    });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_selected_class_id', '2ccf6468-1e03-41d1-b72b-1d84dcad85b2'); // 2nd Vocabulary
    window._selectedClassId = '2ccf6468-1e03-41d1-b72b-1d84dcad85b2';
    window._classHubActiveTab = 'tests'; // Active tab set to Class Tests
  });

  const adminPage = await adminContext.newPage();
  console.log('Navigating to Class Hub (Class Tests Tab)...');
  await adminPage.goto(`${BASE_URL}/admin.html#class-hub`, { waitUntil: 'networkidle' });
  await adminPage.waitForTimeout(3000);

  // If not on tests tab, call window._switchClassHubTab('tests')
  await adminPage.evaluate(() => {
    if (window._switchClassHubTab) {
      window._switchClassHubTab('tests');
    }
  });
  await adminPage.waitForTimeout(1500);

  const imgPath = path.join(ARTIFACTS_DIR, 'class_hub_vocab2_19_tests_verified.png');
  await adminPage.screenshot({ path: imgPath, fullPage: false });
  console.log(`✓ Screenshot saved successfully: ${imgPath}`);

  // Also log the table row count and badges
  const metaChips = await adminPage.locator('.asm-meta-chips').first().textContent().catch(() => 'N/A');
  const recordsBadge = await adminPage.locator('text=RECORDS').first().textContent().catch(() => 'N/A');
  console.log('Live Badges in Browser:');
  console.log(' - Meta chips:', metaChips.trim());
  console.log(' - Records:', recordsBadge.trim());

  await browser.close();
}

capture().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
