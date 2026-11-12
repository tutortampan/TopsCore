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

  // Click on Class: Camp 2nd Vocabulary
  await page.locator('.sidebar-class-item').first().click();
  await page.waitForTimeout(2000);

  const tabs = await page.locator('.tab-btn, .nav-tab, button, a').evaluateAll(els => 
    els.map(e => ({ text: e.innerText.trim(), class: e.className, id: e.id })).filter(e => e.text.length > 0 && e.text.length < 50)
  );
  console.log('Available buttons/tabs:', tabs.filter(t => t.text.includes('Score') || t.text.includes('Grade') || t.text.includes('Test') || t.text.includes('Matrix') || t.text.includes('Attendance')));

  await browser.close();
})();

