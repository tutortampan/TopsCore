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

  const testFixes = await page.evaluate(() => {
    const tableWrap = document.querySelector('.table-wrap');
    const table = tableWrap.querySelector('table');

    const results = [];

    // Baseline
    results.push({
      label: 'Baseline',
      clientWidth: tableWrap.clientWidth,
      scrollWidth: tableWrap.scrollWidth,
      diff: tableWrap.scrollWidth - tableWrap.clientWidth
    });

    // Fix 1: table.style.width = 'calc(100% - 2px)'
    table.style.width = 'calc(100% - 2px)';
    results.push({
      label: 'table width: calc(100% - 2px)',
      clientWidth: tableWrap.clientWidth,
      scrollWidth: tableWrap.scrollWidth,
      diff: tableWrap.scrollWidth - tableWrap.clientWidth
    });

    // Fix 2: table.style.width = '100%'; table.style.maxWidth = '100%'; table.style.boxSizing = 'border-box'
    table.style.width = '100%';
    table.style.maxWidth = '100%';
    table.style.boxSizing = 'border-box';
    results.push({
      label: 'table maxWidth: 100%, boxSizing: border-box',
      clientWidth: tableWrap.clientWidth,
      scrollWidth: tableWrap.scrollWidth,
      diff: tableWrap.scrollWidth - tableWrap.clientWidth
    });

    // Fix 3: Remove borderRight from last th and td
    const lastThs = table.querySelectorAll('th:last-child, td:last-child');
    lastThs.forEach(c => c.style.borderRight = 'none');
    results.push({
      label: 'last cell borderRight: none',
      clientWidth: tableWrap.clientWidth,
      scrollWidth: tableWrap.scrollWidth,
      diff: tableWrap.scrollWidth - tableWrap.clientWidth
    });

    // Fix 4: tableWrap.style.overflowX = 'clip' (modern CSS for zero scrollbar and no scroll container)
    tableWrap.style.overflowX = 'clip';
    results.push({
      label: 'tableWrap overflowX: clip',
      clientWidth: tableWrap.clientWidth,
      scrollWidth: tableWrap.scrollWidth,
      diff: tableWrap.scrollWidth - tableWrap.clientWidth
    });

    return results;
  });

  console.log(JSON.stringify(testFixes, null, 2));
  await browser.close();
}

run().catch(console.error);
