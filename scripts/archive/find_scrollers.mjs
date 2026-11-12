import { chromium } from '@playwright/test';

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 }
  });

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
  await page.waitForTimeout(4000);

  const scrollElements = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const withScroll = [];

    for (const el of all) {
      const style = window.getComputedStyle(el);
      const hasHScroll = el.scrollWidth > el.clientWidth && style.overflowX !== 'hidden';
      const hasVScroll = el.scrollHeight > el.clientHeight && style.overflowY !== 'hidden';
      
      // Also check if overflowX is scroll or auto and scrollWidth > clientWidth
      const actualHScroll = (style.overflowX === 'scroll' || style.overflowX === 'auto') && el.scrollWidth > el.clientWidth;
      const actualVScroll = (style.overflowY === 'scroll' || style.overflowY === 'auto') && el.scrollHeight > el.clientHeight;

      if (actualHScroll || actualVScroll || el.scrollWidth > el.clientWidth + 5) {
        withScroll.push({
          tag: el.tagName,
          id: el.id,
          className: el.className,
          clientWidth: el.clientWidth,
          scrollWidth: el.scrollWidth,
          clientHeight: el.clientHeight,
          scrollHeight: el.scrollHeight,
          overflowX: style.overflowX,
          overflowY: style.overflowY,
          actualHScroll,
          actualVScroll
        });
      }
    }
    return withScroll;
  });

  console.log('--- ELEMENTS WITH SCROLL ---');
  console.log(JSON.stringify(scrollElements, null, 2));

  await browser.close();
}

run();
