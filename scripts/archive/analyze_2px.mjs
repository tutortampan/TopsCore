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

  const analysis = await page.evaluate(() => {
    const tableWrap = document.querySelector('.table-wrap');
    const table = tableWrap.querySelector('table');
    
    // Check computed styles of tableWrap
    const wrapStyle = window.getComputedStyle(tableWrap);
    const tableStyle = window.getComputedStyle(table);

    // Check cells
    const headerRow = table.querySelector('thead tr:last-child');
    const ths = Array.from(headerRow.querySelectorAll('th'));
    let sumThOffset = 0;
    const thDetails = ths.map(th => {
      const w = th.offsetWidth;
      const rect = th.getBoundingClientRect();
      const style = window.getComputedStyle(th);
      sumThOffset += w;
      return {
        text: th.innerText.trim(),
        offsetWidth: w,
        rectWidth: rect.width,
        borderLeft: style.borderLeftWidth,
        borderRight: style.borderRightWidth,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
      };
    });

    return {
      tableWrap: {
        borderLeft: wrapStyle.borderLeftWidth,
        borderRight: wrapStyle.borderRightWidth,
        paddingLeft: wrapStyle.paddingLeft,
        paddingRight: wrapStyle.paddingRight,
        clientWidth: tableWrap.clientWidth,
        offsetWidth: tableWrap.offsetWidth,
        scrollWidth: tableWrap.scrollWidth,
      },
      table: {
        widthStyle: table.style.width,
        computedWidth: tableStyle.width,
        clientWidth: table.clientWidth,
        offsetWidth: table.offsetWidth,
        scrollWidth: table.scrollWidth,
        borderCollapse: tableStyle.borderCollapse,
      },
      sumThOffset,
      thDetails
    };
  });

  console.log(JSON.stringify(analysis, null, 2));
  await browser.close();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
