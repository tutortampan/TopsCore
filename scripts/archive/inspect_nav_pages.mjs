import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });

  await page.goto('http://127.0.0.1:5500/admin.html#batches', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const title = await page.locator('#admin-content-area h1, #admin-content-area h2, #admin-content-area .page-title, #admin-content-area .section-title').allInnerTexts();
  console.log('Title on #batches:', title);
  console.log('Current URL on #batches:', page.url());

  // Also check Curriculum (#classes-hub)
  await page.goto('http://127.0.0.1:5500/admin.html#classes-hub', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const titleCurriculum = await page.locator('#admin-content-area h1, #admin-content-area h2, #admin-content-area .page-title, #admin-content-area .section-title').allInnerTexts();
  console.log('Title on #classes-hub:', titleCurriculum);

  // Also check Organization (#organization)
  await page.goto('http://127.0.0.1:5500/admin.html#organization', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const titleOrg = await page.locator('#admin-content-area h1, #admin-content-area h2, #admin-content-area .page-title, #admin-content-area .section-title').allInnerTexts();
  console.log('Title on #organization:', titleOrg);

  await browser.close();
})();

