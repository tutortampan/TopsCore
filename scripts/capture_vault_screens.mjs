import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\Top\\.gemini\\antigravity\\brain\\bfa8ad48-9da7-4bea-aa34-d61621f6d7bc';
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
    // Set default program to Camp (11deb53c-434a-44b0-83ca-1cc9b239cab3)
    localStorage.setItem('topscore_bp_selected_prog_id', '11deb53c-434a-44b0-83ca-1cc9b239cab3');
  });

  const page = await context.newPage();

  // 1. Theme Manager Tab
  console.log('Navigating to Theme Manager Tab: ' + BASE_URL + '/admin.html#vocab_vault?tab=theme_manager');
  await page.goto(`${BASE_URL}/admin.html#vocab_vault?tab=theme_manager`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  const themeManagerImgPath = path.join(ARTIFACTS_DIR, 'theme_manager_tab.png');
  await page.screenshot({ path: themeManagerImgPath, fullPage: false });
  console.log(`✓ Theme Manager Tab screenshot saved: ${themeManagerImgPath}`);

  // 2. Theme Blueprint Tab (Camp)
  console.log('Navigating to Theme Blueprint Tab: ' + BASE_URL + '/admin.html#vocab_vault?tab=blueprint');
  await page.goto(`${BASE_URL}/admin.html#vocab_vault?tab=blueprint`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  
  // Select Camp program if available in dropdown
  const progSelect = await page.$('#bp-program-select');
  if (progSelect) {
    const campOpt = await page.$('#bp-program-select option:has-text("Camp")');
    if (campOpt) {
      const campVal = await campOpt.getAttribute('value');
      if (campVal) {
        await page.selectOption('#bp-program-select', campVal);
        await page.waitForTimeout(2000);
      }
    }
  }

  const blueprintImgPath = path.join(ARTIFACTS_DIR, 'theme_blueprint_camp_tab.png');
  await page.screenshot({ path: blueprintImgPath, fullPage: false });
  console.log(`✓ Blueprint Tab (Camp) screenshot saved: ${blueprintImgPath}`);

  await browser.close();
  console.log('Screenshots captured successfully!');
}

capture().catch(console.error);
