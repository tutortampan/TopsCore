import { chromium } from '@playwright/test';
import path from 'node:path';

const outDir = 'C:/Users/Top/.gemini/antigravity/brain/0cc055bc-6115-4880-89a3-5b72dafc9e68';

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

  // Take a high-resolution crop of the table footer and bottom area
  const tableWrap = await page.$('.table-wrap');
  const cropPath = path.join(outDir, 'table_bottom_crop.png');
  await tableWrap.screenshot({ path: cropPath });
  console.log('Saved table crop to:', cropPath);

  // Check scrollbar state
  const scrollCheck = await page.evaluate(() => {
    const tw = document.querySelector('.table-wrap');
    return {
      scrollWidth: tw.scrollWidth,
      clientWidth: tw.clientWidth,
      scrollHeight: tw.scrollHeight,
      clientHeight: tw.clientHeight,
      overflowX: window.getComputedStyle(tw).overflowX,
      overflowY: window.getComputedStyle(tw).overflowY,
      scrollLeft: tw.scrollLeft,
      canScrollRight: tw.scrollWidth > tw.clientWidth
    };
  });

  console.log('Scroll check:', scrollCheck);
  await browser.close();
}

run().catch(console.error);
