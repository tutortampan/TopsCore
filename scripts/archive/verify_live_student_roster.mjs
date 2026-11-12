import { chromium } from '@playwright/test';
import path from 'node:path';

const outDir = 'C:/Users/Top/.gemini/antigravity/brain/0cc055bc-6115-4880-89a3-5b72dafc9e68';

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

  console.log('Navigating to http://127.0.0.1:5500/admin.html?status=active#students ...');
  await page.goto('http://127.0.0.1:5500/admin.html?status=active#students', { waitUntil: 'networkidle', timeout: 20000 });

  // Wait for table to render
  await page.waitForTimeout(4000);

  // Take screenshot
  const shotPath = path.join(outDir, 'live_student_roster_check.png');
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log(`Screenshot saved to: ${shotPath}`);

  // Evaluate scroll and layout properties
  const metrics = await page.evaluate(() => {
    const tableWrap = document.querySelector('.table-wrap');
    const table = document.querySelector('.datagrid-table, .modern-table, table');
    const consoleEl = document.getElementById('admin-console');

    const results = {
      url: window.location.href,
      hasTableWrap: !!tableWrap,
      hasTable: !!table,
      tableWrap: tableWrap ? {
        clientWidth: tableWrap.clientWidth,
        scrollWidth: tableWrap.scrollWidth,
        scrollLeft: tableWrap.scrollLeft,
        hasHScroll: tableWrap.scrollWidth > tableWrap.clientWidth,
        diff: tableWrap.scrollWidth - tableWrap.clientWidth,
        overflowX: window.getComputedStyle(tableWrap).overflowX,
        overflowY: window.getComputedStyle(tableWrap).overflowY,
      } : null,
      table: table ? {
        clientWidth: table.clientWidth,
        scrollWidth: table.scrollWidth,
        tableLayout: window.getComputedStyle(table).tableLayout,
        width: window.getComputedStyle(table).width,
      } : null,
      consoleEl: consoleEl ? {
        clientWidth: consoleEl.clientWidth,
        scrollWidth: consoleEl.scrollWidth,
        clientHeight: consoleEl.clientHeight,
        scrollHeight: consoleEl.scrollHeight,
        hasHScroll: consoleEl.scrollWidth > consoleEl.clientWidth,
        hasVScroll: consoleEl.scrollHeight > consoleEl.clientHeight,
      } : null,
      columns: []
    };

    if (table) {
      const ths = table.querySelectorAll('thead tr:last-child th');
      ths.forEach((th, idx) => {
        const text = th.innerText.trim();
        const rect = th.getBoundingClientRect();
        results.columns.push({
          idx,
          text,
          width: Math.round(rect.width),
          styleWidth: th.style.width,
        });
      });

      const footerCells = table.querySelectorAll('tfoot tr td');
      results.footer = [];
      footerCells.forEach((td, idx) => {
        results.footer.push({
          idx,
          text: td.innerText.trim(),
          html: td.innerHTML.trim(),
          width: Math.round(td.getBoundingClientRect().width)
        });
      });
    }

    return results;
  });

  console.log('--- METRICS ---');
  console.log(JSON.stringify(metrics, null, 2));

  await browser.close();
}

run().catch(err => {
  console.error('Error running live check:', err);
  process.exit(1);
});
