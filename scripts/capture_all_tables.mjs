import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = process.env.ARTIFACT_DIR || 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece';

async function run() {
  console.log('=== Capturing All Tables Across TopsCore Admin ===');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });

  // 1. Theme Manager Table
  console.log('1. Capturing Theme Manager...');
  await page.goto('http://127.0.0.1:5500/admin.html#vocab_vault?tab=theme_manager', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'table_audit_1_theme_manager.png'), fullPage: false });

  // 2. Vocabulary Words Table
  console.log('2. Capturing Vocabulary Words...');
  const wordsTab = page.locator('#tab-btn-words, [data-tab="words"]');
  if (await wordsTab.count() > 0) {
    await wordsTab.first().click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'table_audit_2_vocab_words.png'), fullPage: false });
  }

  // 3. Student Roster / Students
  console.log('3. Capturing Student Management...');
  await page.goto('http://127.0.0.1:5500/admin.html#students', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'table_audit_3_student_roster.png'), fullPage: false });

  // 4. Attendance Matrix / Class Hub
  console.log('4. Capturing Class Hub / Attendance Matrix...');
  // Look for a class in the sidebar or click first class item
  const classItem = page.locator('.sidebar-class-item, [data-sub="class"], [data-class-id]').first();
  if (await classItem.count() > 0) {
    await classItem.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'table_audit_4_attendance_matrix.png'), fullPage: false });
  } else {
    console.log('Trying direct navigation to a batch or class...');
    await page.goto('http://127.0.0.1:5500/admin.html#classes', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'table_audit_4_classes_overview.png'), fullPage: false });
  }

  // 5. Batches / Board
  console.log('5. Capturing Batches...');
  await page.goto('http://127.0.0.1:5500/admin.html#batches', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'table_audit_5_batches.png'), fullPage: false });

  await browser.close();
  console.log('=== All screenshots captured to artifact directory! ===');
}

run().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});

