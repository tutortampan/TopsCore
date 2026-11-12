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
    localStorage.removeItem('topscore_col_widths_student_roster_grid');
    localStorage.removeItem('topscore_col_widths_custom_table');
  });

  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5500/admin.html?status=active#students', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Test the flex column pattern
  const res = await page.evaluate(() => {
    const grid = document.querySelector('#student-grid-container')?._datagridInstance;
    if (!grid) return { error: 'grid not found' };

    // Set precise calibrated widths on columns
    grid.columns.forEach(col => {
      if (col.key === 'levelName') { col.width = '46px'; col.minWidth = '42px'; }
      else if (col.key === 'photo_url') { col.width = '42px'; col.minWidth = '38px'; }
      else if (col.key === 'gender') { col.width = '68px'; col.minWidth = '65px'; }
      else if (col.key === 'sortName') { delete col.width; col.minWidth = '220px'; } // flex column!
      else if (col.key === 'birth_date') { col.width = '96px'; col.minWidth = '92px'; }
      else if (col.key === 'ageDisplay') { col.width = '62px'; col.minWidth = '58px'; }
      else if (col.key === 'education') { col.width = '94px'; col.minWidth = '90px'; }
      else if (col.key && col.key.includes('_cls_exam')) { col.width = '74px'; col.minWidth = '70px'; }
      else if (col.key === 'program_status') { col.width = '84px'; col.minWidth = '80px'; }
    });

    grid.autoFitOnMount = false;
    grid.renderHeaders();
    grid.render();

    const table = document.querySelector('.datagrid-table');
    const cols = Array.from(document.querySelectorAll('.datagrid-colgroup col'));
    const ths = Array.from(document.querySelectorAll('.datagrid-table thead tr:not(.datagrid-super-header-row) th'));
    const rows = Array.from(document.querySelectorAll('.datagrid-table tbody tr'));
    const footerCells = Array.from(document.querySelectorAll('.datagrid-summary-row td'));

    // Check truncation on all rows
    let truncatedCount = 0;
    const truncatedCells = [];
    rows.forEach((r, rIdx) => {
      Array.from(r.cells).forEach((td, cIdx) => {
        const textEl = td.querySelector('.student-cell-view, span, div') || td;
        if (textEl.scrollWidth > textEl.clientWidth + 1) {
          truncatedCount++;
          truncatedCells.push({ row: rIdx, col: ths[cIdx]?.innerText.trim(), text: textEl.innerText.trim(), scroll: textEl.scrollWidth, client: textEl.clientWidth });
        }
      });
    });

    const footerTruncated = [];
    footerCells.forEach((td, cIdx) => {
      if (td.scrollWidth > td.clientWidth + 1) {
        footerTruncated.push({ col: ths[cIdx]?.innerText.trim(), text: td.innerText.trim(), scroll: td.scrollWidth, client: td.clientWidth });
      }
    });

    return {
      tableWidth: table.offsetWidth,
      tableScrollWidth: table.scrollWidth,
      containerWidth: table.parentElement.clientWidth,
      colStyles: cols.map(c => c.style.width || 'flex'),
      thOffsets: ths.map(t => ({ name: t.innerText.trim().replace(/\n/g, ' '), width: t.offsetWidth })),
      truncatedCount,
      truncatedCells: truncatedCells.slice(0, 5),
      footerTruncated
    };
  });

  console.log('=== FLEX COLUMN EVALUATION ===');
  console.log('Table offsetWidth:', res.tableWidth, 'scrollWidth:', res.tableScrollWidth, 'container clientWidth:', res.containerWidth);
  console.log('Col styles:', res.colStyles);
  console.log('TH widths:');
  res.thOffsets?.forEach(t => console.log(`  ${t.name}: ${t.width}px`));
  console.log('Truncated cells in body:', res.truncatedCount, res.truncatedCells);
  console.log('Truncated in footer:', res.footerTruncated);

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
