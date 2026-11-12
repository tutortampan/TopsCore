import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece';

async function capture() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });

  // 1. Vocabulary Vault - Theme Manager
  await page.goto('http://127.0.0.1:5500/admin.html#vocab_vault?tab=theme_manager', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_table_theme_manager.png') });

  // 2. Vocabulary Vault - Test Blueprint
  await page.goto('http://127.0.0.1:5500/admin.html#vocab_vault?tab=blueprint', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_table_test_blueprint.png') });

  // 3. Vocabulary Vault - Vocabulary Words
  await page.goto('http://127.0.0.1:5500/admin.html#vocab_vault?tab=vocab', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_table_vocabulary_words.png') });

  // 4. Vocabulary Vault - Phrases & Idioms
  await page.goto('http://127.0.0.1:5500/admin.html#vocab_vault?tab=phrases', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_table_phrases_idioms.png') });

  // 5. Batch - Camp 134
  await page.goto('http://127.0.0.1:5500/admin.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.locator('.sidebar-program-item').first().click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '05_table_batch_camp134.png') });

  // 6. Batch - Evnikom EV-07
  await page.locator('.sidebar-program-item').nth(1).click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_table_batch_evnikom.png') });

  // 7. Class Hub - Camp 2nd Vocabulary (Class Tests tab)
  await page.locator('.sidebar-class-item').first().click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '07_table_class_tests_camp2nd.png') });

  // 8. Class Hub - Attendance Matrix tab (click tab button)
  const tabBtnMatrix = page.locator('#admin-content-area button, #admin-content-area .btn, .class-tab').filter({ hasText: 'Students Grade' });
  if (await tabBtnMatrix.count() > 0) {
    await tabBtnMatrix.first().click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '08_table_class_matrix_camp2nd.png') });
  }

  // 9. Class Hub - Evnikom 1st Vocabulary (Attendance Matrix tab)
  await page.locator('.sidebar-class-item').nth(1).click();
  await page.waitForTimeout(3000);
  if (await tabBtnMatrix.count() > 0) {
    await tabBtnMatrix.first().click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '09_table_class_matrix_evnikom1st.png') });
  }

  // 10. Organization
  await page.goto('http://127.0.0.1:5500/admin.html#organization', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '10_table_organization.png') });

  // 11. Batches / Unified Blueprint Control
  await page.goto('http://127.0.0.1:5500/admin.html#batches', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '11_table_batches.png') });

  await browser.close();
  console.log('=== All 11 tables captured cleanly! ===');
}

capture().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});

