import { chromium } from '@playwright/test';

async function main() {
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
  await page.goto('http://127.0.0.1:5500/admin.html?status=active#students', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const debug = await page.evaluate(() => {
    const ths = Array.from(document.querySelectorAll('.datagrid-table thead tr:not(.datagrid-super-header-row) th'));
    const nameThIdx = ths.findIndex(t => t.dataset.key === 'sortName');
    const tableEl = document.querySelector('.datagrid-table');
    const cells = Array.from(tableEl.querySelectorAll('tbody tr')).map(r => r.cells[nameThIdx]).filter(Boolean);

    const measurements = cells.map(cell => {
      const cellView = cell.querySelector('.student-cell-view');
      const input = cell.querySelector('input, select');
      let text = '';
      if (cellView && window.getComputedStyle(cellView).display !== 'none') {
        text = cellView.textContent.trim().replace(/\s+/g, ' ');
      } else if (input) {
        text = input.value || input.placeholder || '';
      } else {
        text = cell.textContent.trim().replace(/\s+/g, ' ');
      }
      return { text, cellLen: text.length };
    });

    return {
      nameThIdx,
      cellsCount: cells.length,
      measurements
    };
  });

  console.log('Name th idx:', debug.nameThIdx, 'cellsCount:', debug.cellsCount);
  console.log('Sample measurements:', debug.measurements.slice(0, 10));

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
