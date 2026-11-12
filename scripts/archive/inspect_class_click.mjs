import { chromium } from '@playwright/test';

async function test() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });
  await page.goto('http://127.0.0.1:5500/admin.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Click sidebar-class-item
  await page.locator('.sidebar-class-item').first().click();
  await page.waitForTimeout(3000);

  const html = await page.evaluate(() => {
    const area = document.getElementById('admin-content-area');
    return {
      childrenCount: area?.children.length,
      childrenTags: Array.from(area?.children || []).map(c => `${c.tagName}#${c.id}.${c.className}`),
      innerHtmlSample: area?.innerHTML?.slice(0, 1500)
    };
  });
  console.log('Admin content area after clicking class:', JSON.stringify(html, null, 2));
  await browser.close();
}
test().catch(console.error);

