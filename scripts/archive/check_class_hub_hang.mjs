import { chromium } from '@playwright/test';

async function test() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGEERROR] ${err.message}`));

  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });

  await page.goto('http://127.0.0.1:5500/admin.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Click Camp 2nd Vocabulary
  await page.locator('.sidebar-class-item').first().click();
  
  // Wait up to 10 seconds and log what happens
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(1000);
    const text = await page.evaluate(() => document.getElementById('admin-content-area')?.innerText?.slice(0, 100));
    console.log(`Second ${i+1}:`, text?.replace(/\n/g, ' '));
  }

  console.log('All Logs:', logs);
  await browser.close();
}
test().catch(console.error);

