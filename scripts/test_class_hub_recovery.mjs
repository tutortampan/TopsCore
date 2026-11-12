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
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('Browser console error:', msg.text());
  });

  await page.goto('http://127.0.0.1:5500/admin.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click on Class: Camp 2nd Vocabulary
  await page.locator('.sidebar-class-item').first().click();
  await page.waitForTimeout(3000);

  console.log('Class tests loaded. Console errors:', pageErrors);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_07_class_tests.png') });

  // Click on Attendance Matrix tab
  const tabBtnMatrix = page.locator('#admin-content-area button, #admin-content-area .btn, .class-tab').filter({ hasText: 'Students Grade' });
  if (await tabBtnMatrix.count() > 0) {
    await tabBtnMatrix.first().click();
    await page.waitForTimeout(3000);
    const rows = await page.locator('#class-attendance-grid tbody tr').count();
    console.log('Attendance Matrix rows count:', rows);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_08_attendance_matrix.png') });
  }

  await browser.close();
  console.log('Verification capture complete!');
})();

