import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });

  await page.goto('http://127.0.0.1:5500/admin.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click Class: Camp 2nd Vocabulary
  await page.locator('.sidebar-class-item').first().click();
  await page.waitForTimeout(2000);

  // Click tests tab
  await page.locator('[data-tab-id="tests"]').click();
  await page.waitForTimeout(2000);
  console.log('Class tests visible:', await page.locator('#class-tests-grid table').count());

  // Click attendance tab
  await page.locator('[data-tab-id="attendance"]').click();
  await page.waitForTimeout(4000);

  const gridExists = await page.locator('#class-attendance-grid').count();
  const tableExists = await page.locator('#class-attendance-grid table').count();
  const rows = await page.locator('#class-attendance-grid tbody tr').count();
  console.log('Grid exists:', gridExists, 'Table exists:', tableExists, 'Rows count:', rows);

  await browser.close();
})();

