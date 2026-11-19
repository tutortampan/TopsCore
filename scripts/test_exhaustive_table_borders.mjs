import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage();
  const adminCss = fs.readFileSync(path.resolve('css/admin.css'), 'utf8');

  const scenarios = [
    {
      name: 'Scenario 1: Empty state (No records found - 1 row, colspan, no tfoot)',
      html: `
        <div id="admin-console">
          <div class="table-wrap">
            <table class="datagrid-table">
              <thead class="datagrid-thead has-super-headers">
                <tr class="datagrid-super-header-row"><th class="super-hdr" colspan="2">G1</th><th class="super-hdr" colspan="2">G2</th></tr>
                <tr><th>A</th><th class="super-hdr-divider">B</th><th>C</th><th>D</th></tr>
              </thead>
              <tbody class="datagrid-tbody">
                <tr><td colspan="4" class="datagrid-empty">No records found.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `
    },
    {
      name: 'Scenario 2: DataGrid (Student Roster 3 rows, no tfoot)',
      html: `
        <div id="admin-console">
          <div id="student-grid-container">
            <div class="table-wrap">
              <table class="datagrid-table" id="student_roster_data_grid_v2">
                <thead class="datagrid-thead has-super-headers">
                  <tr class="datagrid-super-header-row"><th class="super-hdr" colspan="2">G1</th><th class="super-hdr" colspan="2">G2</th></tr>
                  <tr><th>A</th><th class="super-hdr-divider">B</th><th>C</th><th>D</th></tr>
                </thead>
                <tbody class="datagrid-tbody">
                  <tr><td>1</td><td class="super-hdr-divider">2</td><td>3</td><td>4</td></tr>
                  <tr><td>1</td><td class="super-hdr-divider">2</td><td>3</td><td>4</td></tr>
                  <tr><td>1</td><td class="super-hdr-divider">2</td><td>3</td><td>4</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `
    },
    {
      name: 'Scenario 3: Class Hub Attendance Matrix with tfoot summary row',
      html: `
        <div id="admin-console">
          <div class="table-wrap">
            <table class="datagrid-table" id="class-attendance-grid">
              <thead class="datagrid-thead has-super-headers">
                <tr class="datagrid-super-header-row"><th class="super-hdr" colspan="2">STUDENTS DATA</th><th class="super-hdr" colspan="2">OVERALL</th></tr>
                <tr><th class="col-sticky-1">BATCH</th><th class="col-sticky-2">NAME</th><th>RATE</th><th class="col-overall-grade">GRD</th></tr>
              </thead>
              <tbody class="datagrid-tbody">
                <tr><td class="col-sticky-1">B1</td><td class="col-sticky-2">John</td><td>80%</td><td class="col-overall-grade">B</td></tr>
              </tbody>
              <tfoot class="datagrid-tfoot">
                <tr class="datagrid-summary-row"><td class="col-sticky-1">AVG</td><td class="col-sticky-2">-</td><td>80%</td><td class="col-overall-grade">B</td></tr>
              </tfoot>
            </table>
          </div>
        </div>
      `
    },
    {
      name: 'Scenario 4: Single-tier header table (#vault-table)',
      html: `
        <div id="admin-console">
          <div class="table-wrap">
            <table class="datagrid-table" id="vault-table">
              <thead>
                <tr><th>WORD</th><th>IPA</th><th>POS</th><th>MEANING</th></tr>
              </thead>
              <tbody>
                <tr><td>Abate</td><td>/əˈbeɪt/</td><td>Verb</td><td>To lessen</td></tr>
                <tr><td>Banal</td><td>/bəˈnɑːl/</td><td>Adj</td><td>Trite</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `
    },
    {
      name: 'Scenario 5: Blueprint Matrix table (#blueprint-matrix-table)',
      html: `
        <div id="admin-console">
          <div class="table-wrap">
            <table class="datagrid-table" id="blueprint-matrix-table">
              <thead>
                <tr class="bp-super-header-row"><th class="bp-sh-topic" colspan="2">TOPIC</th><th class="bp-sh-vocab" colspan="2">VOCAB</th></tr>
                <tr><th>Code</th><th>Name</th><th>Words</th><th>Format</th></tr>
              </thead>
              <tbody>
                <tr><td>A1</td><td>Greetings</td><td>7</td><td>Multiple Choice</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `
    }
  ];

  let allPassed = true;

  for (const sc of scenarios) {
    await page.setContent(`<!DOCTYPE html><html><head><style>${adminCss}</style></head><body id="admin-console">${sc.html}</body></html>`);
    const res = await page.evaluate(() => {
      const table = document.querySelector('table');
      const theadRows = Array.from(table.querySelectorAll('thead tr'));
      const tbodyRows = Array.from(table.querySelectorAll('tbody tr'));
      const tfootRows = Array.from(table.querySelectorAll('tfoot tr'));
      const allRows = [...theadRows, ...tbodyRows, ...tfootRows];

      // Top: Row 1 of thead
      const expectedTop = '2px solid rgba(255, 255, 255, 0.28)';
      const topOk = Array.from(theadRows[0].cells).every(c => window.getComputedStyle(c).borderTop === expectedTop);

      // Left: First cell of all rows
      const expectedLeft = '2px solid rgba(255, 255, 255, 0.28)';
      const leftOk = allRows.every(r => window.getComputedStyle(r.cells[0]).borderLeft === expectedLeft);

      // Right: Last cell of all rows
      const expectedRight = '2px solid rgba(255, 255, 255, 0.28)';
      const rightOk = allRows.every(r => window.getComputedStyle(r.cells[r.cells.length - 1]).borderRight === expectedRight);

      // Bottom: Last row of the entire table (either last tfoot row or last tbody row)
      const bottomRow = tfootRows.length > 0 ? tfootRows[tfootRows.length - 1] : tbodyRows[tbodyRows.length - 1];
      const bottomCells = Array.from(bottomRow.cells);
      const expectedBottom = '2px solid rgba(255, 255, 255, 0.28)';
      const bottomOk = bottomCells.every(c => window.getComputedStyle(c).borderBottom === expectedBottom);

      return {
        topOk,
        leftOk,
        rightOk,
        bottomOk,
        bottomDetails: bottomCells.map(c => window.getComputedStyle(c).borderBottom)
      };
    });

    console.log(`\n▶ ${sc.name}:`);
    console.log(`  Top: ${res.topOk ? '✔' : '✖'} | Left: ${res.leftOk ? '✔' : '✖'} | Right: ${res.rightOk ? '✔' : '✖'} | Bottom: ${res.bottomOk ? '✔' : '✖'}`);
    
    if (!res.topOk || !res.leftOk || !res.rightOk || !res.bottomOk) {
      allPassed = false;
      console.log('  Failed details:', res);
    }
  }

  console.log(`\n========================================`);
  console.log(allPassed ? '🎉 ALL 5 TABLE SCENARIOS PASSED 100% UNBROKEN DIRECTLY FROM CSS!' : '❌ SOME SCENARIOS FAILED');
  console.log(`========================================`);

  await browser.close();
  if (!allPassed) process.exitCode = 1;
})();
