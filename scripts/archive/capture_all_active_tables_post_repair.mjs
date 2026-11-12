import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece';

async function runVerificationAndCapture() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });

  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  console.log('--- 1. Theme Manager ---');
  await page.goto('http://127.0.0.1:5500/admin.html#vocab_vault?tab=theme_manager', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_table_theme_manager.png') });

  console.log('--- 2. Test Blueprint ---');
  await page.goto('http://127.0.0.1:5500/admin.html#vocab_vault?tab=blueprint', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_table_test_blueprint.png') });

  console.log('--- 3. Vocabulary Words ---');
  await page.goto('http://127.0.0.1:5500/admin.html#vocab_vault?tab=vocab', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_table_vocabulary_words.png') });

  console.log('--- 4. Phrases & Idioms ---');
  await page.goto('http://127.0.0.1:5500/admin.html#vocab_vault?tab=phrases', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_table_phrases_idioms.png') });

  console.log('--- 5. Organization ---');
  await page.goto('http://127.0.0.1:5500/admin.html#organization', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '10_table_organization.png') });

  console.log('--- 6. Batch Camp 134 ---');
  await page.goto('http://127.0.0.1:5500/admin.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.locator('.sidebar-program-item').first().click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '05_table_batch_camp134.png') });

  console.log('--- 7. Batch Evnikom EV-07 ---');
  await page.locator('.sidebar-program-item').nth(1).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_table_batch_evnikom.png') });

  console.log('--- 8. Class Hub: Camp 2nd Vocab (Class Tests) ---');
  await page.locator('.sidebar-class-item').first().click();
  await page.waitForTimeout(2500);
  const testsTab = page.locator('[data-tab-id="tests"]');
  if (await testsTab.count() > 0) {
    await testsTab.click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '07_table_class_tests_camp2nd.png') });

  console.log('--- 9. Class Hub: Camp 2nd Vocab (Attendance Matrix) ---');
  const attTab = page.locator('[data-tab-id="attendance"]');
  if (await attTab.count() > 0) {
    await attTab.click();
    await page.waitForTimeout(4000);
  }
  const attRows = await page.locator('#class-attendance-grid tbody tr').count();
  console.log('Attendance Matrix row count:', attRows);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '08_table_class_matrix_camp2nd.png') });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'table_audit_4_attendance_matrix.png') });

  await browser.close();

  console.log('All screenshots captured cleanly!');
  console.log('Total console/page errors encountered:', pageErrors.length, pageErrors);

  if (attRows === 0) {
    throw new Error('FAIL: Attendance matrix rendered 0 student rows!');
  }
  if (pageErrors.length > 0) {
    throw new Error('FAIL: JavaScript runtime errors detected during navigation!');
  }
}

runVerificationAndCapture().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
