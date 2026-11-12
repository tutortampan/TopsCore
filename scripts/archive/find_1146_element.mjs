import { chromium } from '@playwright/test';

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });

  await context.addInitScript(() => {
    const adminSession = JSON.stringify({
      admin_id: 'admin-master',
      username: 'admin',
      role: 'admin',
      authenticated_at: new Date().toISOString()
    });
    localStorage.setItem('topscore_admin_session', adminSession);
    sessionStorage.setItem('topscore_admin_session', adminSession);
  });

  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5500/admin.html?status=active#students', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForSelector('.table-wrap table', { timeout: 15000 });

  const offenders = await page.evaluate(() => {
    const tableWrap = document.querySelector('.table-wrap');
    const all = Array.from(tableWrap.querySelectorAll('*'));
    return all
      .filter(el => el.offsetWidth > 1144 || el.scrollWidth > 1144)
      .map(el => ({
        tag: el.tagName,
        className: el.className,
        id: el.id,
        offsetWidth: el.offsetWidth,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        getBoundingClientRect: el.getBoundingClientRect().width,
        styleWidth: el.style.width,
        computedWidth: window.getComputedStyle(el).width,
      }));
  });

  console.log(JSON.stringify(offenders, null, 2));
  await browser.close();
}

run().catch(console.error);
