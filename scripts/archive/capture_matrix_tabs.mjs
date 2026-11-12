import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece';

async function test() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });
  await page.goto('http://127.0.0.1:5500/admin.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Click Evnikom 1st Vocabulary
  console.log('Clicking Evnikom 1st Vocabulary...');
  await page.locator('.sidebar-class-item').nth(1).click();
  await page.waitForTimeout(3000);

  // Click Students Grade and Score tab
  console.log('Clicking Students Grade and Score tab...');
  const gradeTab = page.locator('#tab-btn-matrix, [data-tab="matrix"], .class-nav-tab:has-text("Students Grade")');
  if (await gradeTab.count() > 0) {
    await gradeTab.first().click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'table_audit_evnikom_matrix_tab.png') });
  }

  // Click Camp 2nd Vocabulary then click Students Grade and Score tab
  console.log('Clicking Camp 2nd Vocabulary...');
  await page.locator('.sidebar-class-item').first().click();
  await page.waitForTimeout(3000);
  const gradeTab2 = page.locator('#tab-btn-matrix, [data-tab="matrix"], .class-nav-tab:has-text("Students Grade")');
  if (await gradeTab2.count() > 0) {
    await gradeTab2.first().click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'table_audit_camp_matrix_tab.png') });
  }

  // Also check Vocabulary Words tab inside Vocabulary Vault
  console.log('Clicking Vocabulary Vault -> Words tab...');
  await page.goto('http://127.0.0.1:5500/admin.html#vocab_vault?tab=words', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'table_audit_vault_words.png') });

  // Also check Phrases & Idioms tab
  console.log('Clicking Phrases & Idioms tab...');
  await page.goto('http://127.0.0.1:5500/admin.html#vocab_vault?tab=phrases', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'table_audit_vault_phrases.png') });

  await browser.close();
  console.log('Done captures 2!');
}

test().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});

