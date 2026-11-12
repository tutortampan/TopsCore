import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });

  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  await page.goto('http://127.0.0.1:5500/admin.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click on Class: Camp 2nd Vocabulary
  await page.locator('.sidebar-class-item').first().click();
  await page.waitForTimeout(2000);

  // Click on Attendance tab: [data-tab-id="attendance"]
  await page.locator('[data-tab-id="attendance"]').click();
  await page.waitForTimeout(3000);

  console.log('Errors after clicking attendance:', pageErrors);

  const rows = await page.locator('#class-attendance-grid tbody tr').count();
  console.log('Attendance Matrix rendered student rows:', rows);

  const tfootText = await page.locator('#class-attendance-grid tfoot').allInnerTexts();
  console.log('Attendance Matrix tfoot text:', tfootText);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_attendance_matrix_live.png') });
  await browser.close();
})();

