import { chromium } from '@playwright/test';

async function test() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGEERROR] ${err.message}`));

  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });

  await page.goto('http://127.0.0.1:5500/admin.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Click Camp 2nd Vocabulary
  await page.locator('.sidebar-class-item').first().click();
  await page.waitForTimeout(3000);

  // Click Students Grade and Score tab explicitly
  const btn = page.locator('button:has-text("Students Grade and Score")');
  console.log('Students Grade tab count:', await btn.count());
  if (await btn.count() > 0) {
    await btn.first().click();
    await page.waitForTimeout(4000);
  }

  // Inspect DOM of #class-attendance-grid
  const gridState = await page.evaluate(() => {
    const grid = document.getElementById('class-attendance-grid');
    if (!grid) return { found: false };
    const tbody = grid.querySelector('tbody');
    const tfoot = grid.querySelector('tfoot');
    return {
      found: true,
      gridDisplay: getComputedStyle(grid).display,
      gridHeight: getComputedStyle(grid).height,
      tbodyRows: tbody ? tbody.children.length : 0,
      tfootRows: tfoot ? tfoot.children.length : 0,
      tfootText: tfoot ? tfoot.innerText.trim().slice(0, 100) : null,
      firstStudentText: tbody?.querySelector('tr')?.innerText?.trim()?.slice(0, 100),
      tableWrapDisplay: grid.querySelector('.table-wrap') ? getComputedStyle(grid.querySelector('.table-wrap')).display : null
    };
  });
  console.log('Grid state:', JSON.stringify(gridState, null, 2));
  console.log('Errors:', logs.filter(l => l.includes('error') || l.includes('PAGEERROR')));
  await browser.close();
}
test().catch(console.error);

