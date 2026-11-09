import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\Top\\.gemini\\antigravity\\brain\\44e7f103-6ced-4fdc-b086-cbe3ff4c6546';

async function run() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'admin-super', role: 'admin', authenticated_at: new Date().toISOString() });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5500/admin.html#vocab_vault?tab=blueprint', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Click 3RD LEVEL button
  const btn3rd = page.locator('button.btn-blueprint-lvl-select[data-lvl="3"]');
  if (await btn3rd.count() > 0) {
    await btn3rd.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'vocab_vault_blueprint_level3.png') });
    console.log('✓ Captured Level 3 Blueprint');
  }

  // Click Table view button
  const btnTable = page.locator('#btn-blueprint-mode-table');
  if (await btnTable.count() > 0) {
    await btnTable.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'vocab_vault_blueprint_table_view.png') });
    console.log('✓ Captured Blueprint Table View');
  }

  await browser.close();
}

run().catch(console.error);
