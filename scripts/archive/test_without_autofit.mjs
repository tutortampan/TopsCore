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
    // Clear any saved column widths
    localStorage.removeItem('topscore_col_widths_student_roster_grid');
    localStorage.removeItem('topscore_col_widths_custom_table');
  });

  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5500/admin.html?status=active#students', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Evaluate what happens without autoFitColumns
  const res = await page.evaluate(() => {
    // Let's reset the column widths to the default columns defined in studentGrid
    const grid = document.querySelector('#student-grid-container')?._datagridInstance;
    if (grid) {
      grid.renderHeaders();
      grid.render();
    }

    const table = document.querySelector('.datagrid-table');
    const cols = Array.from(document.querySelectorAll('.datagrid-colgroup col'));
    const ths = Array.from(document.querySelectorAll('.datagrid-table thead tr:not(.datagrid-super-header-row) th'));
    const firstRowCells = Array.from(document.querySelectorAll('.datagrid-table tbody tr:first-child td'));
    const footerCells = Array.from(document.querySelectorAll('.datagrid-summary-row td'));

    return {
      tableWidth: table ? table.offsetWidth : 0,
      tableScrollWidth: table ? table.scrollWidth : 0,
      containerWidth: table?.parentElement ? table.parentElement.clientWidth : 0,
      colWidths: cols.map(c => c.style.width),
      thInfo: ths.map(th => ({
        key: th.dataset.key,
        text: th.innerText.trim(),
        styleWidth: th.style.width,
        offsetWidth: th.offsetWidth,
        rectWidth: th.getBoundingClientRect().width
      })),
      cellInfo: firstRowCells.map(td => ({
        text: td.innerText.trim(),
        offsetWidth: td.offsetWidth,
        scrollWidth: td.scrollWidth,
        isTruncated: td.scrollWidth > td.offsetWidth
      })),
      footerInfo: footerCells.map(td => ({
        text: td.innerText.trim(),
        offsetWidth: td.offsetWidth,
        scrollWidth: td.scrollWidth,
        isTruncated: td.scrollWidth > td.offsetWidth
      }))
    };
  });

  console.log('=== TEST WITH DEFAULT DEFINED WIDTHS (NO autoFitOnMount) ===');
  console.log('Table offsetWidth:', res.tableWidth, 'scrollWidth:', res.tableScrollWidth, 'container clientWidth:', res.containerWidth);
  console.log('Col styles:', res.colWidths);
  console.log('TH widths:');
  res.thInfo.forEach(t => console.log(`  ${t.text.replace(/\n/g, ' ')} (${t.key}): style=${t.styleWidth}, offset=${t.offsetWidth}`));
  console.log('First row cells:');
  res.cellInfo.forEach(c => console.log(`  ${c.text.substring(0, 20)}: offset=${c.offsetWidth}, scroll=${c.scrollWidth}, truncated=${c.isTruncated}`));
  console.log('Footer cells:');
  res.footerInfo.forEach(f => console.log(`  ${f.text.substring(0, 20)}: offset=${f.offsetWidth}, scroll=${f.scrollWidth}, truncated=${f.isTruncated}`));

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
