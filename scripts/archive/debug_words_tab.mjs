import { chromium } from '@playwright/test';

async function test() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[PAGEERROR] ${err.message}`));

  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });

  await page.goto('http://127.0.0.1:5500/admin.html#vocab_vault', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Click Vocabulary Words tab
  const tabBtn = page.locator('#vault-tab-btn-words, [data-tab="words"], button:has-text("Vocabulary Words")');
  console.log('Words tab count:', await tabBtn.count());
  if (await tabBtn.count() > 0) {
    await tabBtn.first().click();
    await page.waitForTimeout(3000);
  }

  const state = await page.evaluate(() => {
    const area = document.getElementById('admin-content-area');
    const table = area?.querySelector('table');
    return {
      areaHtmlSample: area?.innerHTML?.slice(0, 500),
      tableExists: !!table,
      tableText: table?.innerText?.slice(0, 200),
      tableRows: table ? table.querySelectorAll('tbody tr').length : 0
    };
  });
  console.log('Words Tab State:', JSON.stringify(state, null, 2));
  console.log('Errors:', consoleLogs.filter(l => l.includes('error') || l.includes('PAGEERROR')));
  await browser.close();
}
test().catch(console.error);

