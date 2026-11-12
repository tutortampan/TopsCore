import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR LOG:', msg.text());
  });
  page.on('pageerror', err => console.log('PAGE UNCAUGHT ERROR:', err.message));

  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_selected_class_id', '2ccf6468-1e03-41d1-b72b-1d84dcad85b2');
    localStorage.setItem('topscore_selected_class_name', 'Camp 2nd Vocabulary');
    localStorage.setItem('topscore_admin_class_hub_tab', 'attendance');
  });

  console.log('1. Navigating to Class Attendance Matrix (#class-hub)...');
  await page.goto('http://127.0.0.1:5500/admin.html#class-hub', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);

  console.log('2. Enabling Master Edit Mode (EDIT: ON)...');
  await page.evaluate(() => {
    document.body.classList.add('global-edit-mode-on');
    if (typeof window.setGlobalEditMode === 'function') window.setGlobalEditMode(true);
    window.dispatchEvent(new CustomEvent('topscore:editmode', { detail: { enabled: true } }));
  });
  await page.waitForTimeout(1000);

  // Inspect BATCH column cells in Edit Mode
  const batchCellAudit = await page.evaluate(() => {
    const table = document.querySelector('#class-attendance-grid');
    if (!table) return { error: 'table #class-attendance-grid not found' };

    const batchHeader = table.querySelector('thead th.col-sticky-1');
    const headerInfo = batchHeader ? {
      text: batchHeader.innerText.trim(),
      transform: getComputedStyle(batchHeader).textTransform,
      weight: getComputedStyle(batchHeader).fontWeight,
      size: getComputedStyle(batchHeader).fontSize
    } : null;

    const rows = Array.from(table.querySelectorAll('tbody tr:not(.table-spacer-row)')).slice(0, 10);
    const cellDetails = rows.map((r, idx) => {
      const td = r.querySelector('td.col-sticky-1') || r.querySelectorAll('td')[0];
      const span = td ? td.querySelector('span') : null;
      const target = span || td;
      const cs = target ? getComputedStyle(target) : {};
      return {
        row: idx + 1,
        text: target ? target.innerText.trim() : '',
        hasBadgeClass: span ? span.classList.contains('badge') : false,
        borderRadius: cs.borderRadius,
        border: cs.border,
        background: cs.backgroundColor,
        color: cs.color,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight
      };
    });

    return { headerInfo, cellDetails };
  });

  console.log('BATCH Column Audit (Edit Mode):', JSON.stringify(batchCellAudit, null, 2));

  console.log('3. Capturing Edit Mode Screenshot...');
  await page.screenshot({ path: 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/verify_batch_column_no_capsule_edit_mode.png' });
  console.log('Saved verify_batch_column_no_capsule_edit_mode.png');

  console.log('4. Toggling Edit Mode OFF to verify View Mode...');
  await page.evaluate(() => {
    document.body.classList.remove('global-edit-mode-on');
    if (typeof window.setGlobalEditMode === 'function') window.setGlobalEditMode(false);
    window.dispatchEvent(new CustomEvent('topscore:editmode', { detail: { enabled: false } }));
  });
  await page.waitForTimeout(800);

  await page.screenshot({ path: 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/verify_batch_column_no_capsule_view_mode.png' });
  console.log('Saved verify_batch_column_no_capsule_view_mode.png');

  await browser.close();
  console.log('Verification finished successfully.');
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

