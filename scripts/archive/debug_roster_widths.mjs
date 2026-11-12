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

  console.log('Navigating to admin student roster...');
  await page.goto('http://127.0.0.1:5500/admin.html?status=active#students', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Measure initial column widths
  const initialData = await page.evaluate(() => {
    const table = document.querySelector('.datagrid-table');
    const cols = Array.from(document.querySelectorAll('.datagrid-colgroup col'));
    const ths = Array.from(document.querySelectorAll('.datagrid-table thead tr:not(.datagrid-super-header-row) th'));
    const firstRowCells = Array.from(document.querySelectorAll('.datagrid-table tbody tr:first-child td'));
    const footerCells = Array.from(document.querySelectorAll('.datagrid-summary-row td'));

    const colWidths = cols.map(c => c.style.width || window.getComputedStyle(c).width);
    const thInfo = ths.map(th => ({
      key: th.dataset.key,
      text: th.innerText.trim(),
      styleWidth: th.style.width,
      offsetWidth: th.offsetWidth,
      rectWidth: th.getBoundingClientRect().width
    }));
    const cellInfo = firstRowCells.map(td => ({
      text: td.innerText.trim(),
      offsetWidth: td.offsetWidth,
      scrollWidth: td.scrollWidth
    }));
    const footerInfo = footerCells.map(td => ({
      text: td.innerText.trim(),
      offsetWidth: td.offsetWidth,
      scrollWidth: td.scrollWidth
    }));

    return {
      tableWidth: table ? table.offsetWidth : 0,
      tableScrollWidth: table ? table.scrollWidth : 0,
      containerWidth: table?.parentElement ? table.parentElement.clientWidth : 0,
      colWidths,
      thInfo,
      cellInfo,
      footerInfo
    };
  });

  console.log('=== INITIAL LOAD ===');
  console.log('Table offsetWidth:', initialData.tableWidth, 'scrollWidth:', initialData.tableScrollWidth, 'container clientWidth:', initialData.containerWidth);
  console.log('Col styles:', initialData.colWidths);
  console.log('TH widths:');
  initialData.thInfo.forEach(t => console.log(`  ${t.text} (${t.key}): style=${t.styleWidth}, offset=${t.offsetWidth}, rect=${t.rectWidth.toFixed(1)}`));
  console.log('First row cells:');
  initialData.cellInfo.forEach(c => console.log(`  ${c.text.substring(0, 20)}: offset=${c.offsetWidth}, scroll=${c.scrollWidth}`));
  console.log('Footer cells:');
  initialData.footerInfo.forEach(f => console.log(`  ${f.text.substring(0, 20)}: offset=${f.offsetWidth}, scroll=${f.scrollWidth}`));

  // Now click on NAME header (sort)
  console.log('\nClicking on NAME column header...');
  const nameTh = await page.locator('.datagrid-table thead th[data-key="sortName"]');
  if (await nameTh.count() > 0) {
    await nameTh.click();
    await page.waitForTimeout(500);

    const afterClickData = await page.evaluate(() => {
      const table = document.querySelector('.datagrid-table');
      const cols = Array.from(document.querySelectorAll('.datagrid-colgroup col'));
      const ths = Array.from(document.querySelectorAll('.datagrid-table thead tr:not(.datagrid-super-header-row) th'));
      const firstRowCells = Array.from(document.querySelectorAll('.datagrid-table tbody tr:first-child td'));
      const footerCells = Array.from(document.querySelectorAll('.datagrid-summary-row td'));

      return {
        tableWidth: table ? table.offsetWidth : 0,
        tableScrollWidth: table ? table.scrollWidth : 0,
        containerWidth: table?.parentElement ? table.parentElement.clientWidth : 0,
        colWidths: cols.map(c => c.style.width || window.getComputedStyle(c).width),
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
          scrollWidth: td.scrollWidth
        })),
        footerInfo: footerCells.map(td => ({
          text: td.innerText.trim(),
          offsetWidth: td.offsetWidth,
          scrollWidth: td.scrollWidth
        }))
      };
    });

    console.log('=== AFTER CLICKING NAME ===');
    console.log('Table offsetWidth:', afterClickData.tableWidth, 'scrollWidth:', afterClickData.tableScrollWidth, 'container clientWidth:', afterClickData.containerWidth);
    console.log('Col styles:', afterClickData.colWidths);
    console.log('TH widths:');
    afterClickData.thInfo.forEach(t => console.log(`  ${t.text} (${t.key}): style=${t.styleWidth}, offset=${t.offsetWidth}, rect=${t.rectWidth.toFixed(1)}`));
    console.log('First row cells:');
    afterClickData.cellInfo.forEach(c => console.log(`  ${c.text.substring(0, 20)}: offset=${c.offsetWidth}, scroll=${c.scrollWidth}`));
    console.log('Footer cells:');
    afterClickData.footerInfo.forEach(f => console.log(`  ${f.text.substring(0, 20)}: offset=${f.offsetWidth}, scroll=${f.scrollWidth}`));
  }

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
