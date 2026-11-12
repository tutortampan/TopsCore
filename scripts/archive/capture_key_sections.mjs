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

  // 1. Click Camp 134 (Batch)
  console.log('Clicking Camp 134...');
  const camp134 = page.locator('.sidebar-program-item').first();
  if (await camp134.count() > 0) {
    await camp134.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'table_audit_batch_camp134.png') });
  }

  // 2. Click Evnikom EV-07 (Batch)
  console.log('Clicking Evnikom EV-07...');
  const evnikom = page.locator('.sidebar-program-item').nth(1);
  if (await evnikom.count() > 0) {
    await evnikom.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'table_audit_batch_evnikom.png') });
  }

  // 3. Click Camp 2nd Vocabulary
  console.log('Clicking Camp 2nd Vocabulary...');
  const camp2nd = page.locator('.sidebar-class-item').first();
  if (await camp2nd.count() > 0) {
    await camp2nd.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'table_audit_class_camp2nd.png') });
  }

  // 4. Click Evnikom 1st Vocabulary
  console.log('Clicking Evnikom 1st Vocabulary...');
  const evn1st = page.locator('.sidebar-class-item').nth(1);
  if (await evn1st.count() > 0) {
    await evn1st.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'table_audit_class_evnikom1st.png') });
  }

  // 5. Click Curriculum
  console.log('Clicking Curriculum...');
  const curr = page.locator('.admin-nav-item[data-sub="classes-hub"]');
  if (await curr.count() > 0) {
    await curr.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'table_audit_curriculum.png') });
  }

  await browser.close();
  console.log('Done captures!');
}

test().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});

