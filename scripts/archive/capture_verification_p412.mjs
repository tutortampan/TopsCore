import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });

  console.log('Navigating to Students Roster (#students)...');
  await page.goto('http://127.0.0.1:5500/admin.html#students', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);

  console.log('Capturing Enriched Student Roster (DOB, Education, Status & Excel Gridlines)...');
  await page.screenshot({ path: 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/verify_student_roster_enriched.png' });
  console.log('Saved verify_student_roster_enriched.png');

  console.log('Navigating to Organization/Programs table (#organization)...');
  await page.goto('http://127.0.0.1:5500/admin.html#organization', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  console.log('Capturing Organization table with Excel gridlines...');
  await page.screenshot({ path: 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/verify_excel_gridlines_all_tables.png' });
  console.log('Saved verify_excel_gridlines_all_tables.png');

  await browser.close();
  console.log('Done capturing verification screenshots!');
}

main().catch(console.error);

