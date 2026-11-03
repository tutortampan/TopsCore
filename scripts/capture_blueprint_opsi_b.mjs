import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\Top\\.gemini\\antigravity\\brain\\30416560-f6e5-4275-91c0-9f8f8014feb0';
const BASE_URL = 'http://127.0.0.1:5500';

async function capture() {
  console.log('Launching Edge to capture Blueprint Opsi B matrix...');
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

  console.log('Navigating to Topic Blueprint Tab: ' + BASE_URL + '/admin.html#vocab_vault?tab=blueprint');
  await page.goto(`${BASE_URL}/admin.html#vocab_vault?tab=blueprint`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const imgPath = path.join(ARTIFACTS_DIR, 'blueprint_opsi_b_verified.png');
  await page.screenshot({ path: imgPath, fullPage: false });
  console.log(`✓ Blueprint Opsi B screenshot saved: ${imgPath}`);

  // Also check rows in table
  const rowCount = await page.evaluate(() => {
    return document.querySelectorAll('#blueprint-matrix-table tbody tr').length;
  });
  console.log(`✓ Rendered matrix rows count: ${rowCount}`);

  const levelCells = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.cell-level-group')).map(td => ({
      text: td.innerText.trim(),
      rowspan: td.getAttribute('rowspan')
    }));
  });
  console.log('✓ Level cells rendered with rowspan:', levelCells);

  const themeCells = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.cell-theme-code')).map(td => ({
      code: td.innerText.trim(),
      rowspan: td.getAttribute('rowspan')
    }));
  });
  console.log('✓ Theme code cells rendered with rowspan:', themeCells);

  await browser.close();
  console.log('Verification completed successfully!');
}

capture().catch(console.error);

