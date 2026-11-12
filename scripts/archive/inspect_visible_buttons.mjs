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

  // Check Batch Camp 134
  await page.locator('.sidebar-program-item').first().click();
  await page.waitForTimeout(2000);

  const batchBtns = await page.locator('.btn, button').evaluateAll(els => 
    els.filter(e => e.offsetParent !== null).map(e => ({ text: e.innerText.trim(), class: e.className, id: e.id }))
  );
  console.log('Visible buttons on Batch Camp 134 (EDIT: OFF):', batchBtns);

  // Check Class Camp 2nd Vocab (Class Tests)
  await page.locator('.sidebar-class-item').first().click();
  await page.waitForTimeout(2000);
  await page.locator('[data-tab-id="tests"]').click();
  await page.waitForTimeout(2000);

  const testBtns = await page.locator('.btn, button').evaluateAll(els => 
    els.filter(e => e.offsetParent !== null).map(e => ({ text: e.innerText.trim(), class: e.className, id: e.id }))
  );
  console.log('Visible buttons on Class Tests (EDIT: OFF):', testBtns);

  await browser.close();
})();

