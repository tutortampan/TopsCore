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

  const result = await page.evaluate(() => {
    const tableWrap = document.querySelector('.table-wrap');
    const table = tableWrap.querySelector('table');
    const colgroup = table.querySelector('colgroup');
    const cols = Array.from(colgroup.querySelectorAll('col'));
    const ths = Array.from(table.querySelectorAll('thead tr:last-child th'));

    // Remove width from Name column (col index 3)
    cols[3].style.width = '';
    ths[3].style.width = '';

    return {
      nameColStyleWidth: cols[3].style.width,
      nameThStyleWidth: ths[3].style.width,
      nameThOffsetWidth: ths[3].offsetWidth,
      tableWrapClientWidth: tableWrap.clientWidth,
      tableWrapScrollWidth: tableWrap.scrollWidth,
      diff: tableWrap.scrollWidth - tableWrap.clientWidth,
      tableClientWidth: table.clientWidth,
      tableScrollWidth: table.scrollWidth,
    };
  });

  console.log('Result when Name column width is unset (auto flex):');
  console.log(JSON.stringify(result, null, 2));

  await browser.close();
}

run().catch(console.error);
