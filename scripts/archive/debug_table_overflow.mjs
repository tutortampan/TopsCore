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
  await page.waitForTimeout(4000);

  const dump = await page.evaluate(() => {
    const tableWrap = document.querySelector('.table-wrap');
    if (!tableWrap) return 'No .table-wrap found';

    const getMatchedRules = (el) => {
      const styles = window.getComputedStyle(el);
      return {
        overflow: styles.overflow,
        overflowX: styles.overflowX,
        overflowY: styles.overflowY,
        scrollbarWidth: styles.scrollbarWidth,
        width: styles.width,
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
      };
    };

    let curr = tableWrap;
    const hierarchy = [];
    while (curr && curr !== document.body) {
      hierarchy.push({
        tag: curr.tagName,
        id: curr.id,
        className: curr.className,
        styles: getMatchedRules(curr)
      });
      curr = curr.parentElement;
    }

    const table = tableWrap.querySelector('table');
    const tableInfo = table ? {
      width: window.getComputedStyle(table).width,
      tableLayout: window.getComputedStyle(table).tableLayout,
      borderCollapse: window.getComputedStyle(table).borderCollapse,
      borderSpacing: window.getComputedStyle(table).borderSpacing,
      clientWidth: table.clientWidth,
      scrollWidth: table.scrollWidth,
      offsetWidth: table.offsetWidth,
      colgroupWidths: Array.from(table.querySelectorAll('col')).map(c => c.style.width || c.width)
    } : null;

    return { hierarchy, tableInfo };
  });

  console.log(JSON.stringify(dump, null, 2));
  await browser.close();
}

run();
