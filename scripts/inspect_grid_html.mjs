import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_class_hub_tab', 'attendance');
  });

  await page.goto('http://127.0.0.1:5500/admin.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click on Class: Camp 2nd Vocabulary
  await page.locator('.sidebar-class-item').first().click();
  await page.waitForTimeout(2000);

  const gridHtml = await page.locator('#class-attendance-grid').innerHTML().catch(e => e.message);
  console.log('gridHtml length:', gridHtml.length);
  console.log('gridHtml snippet:', gridHtml.slice(0, 1000));

  await browser.close();
})();

