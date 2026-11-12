import { chromium } from '@playwright/test';
import path from 'node:path';

const artifactDir = 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece';

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('📸 1. Navigating to Student Gate (index.html)...');
  await page.goto('http://localhost:5500/index.html');
  await page.waitForLoadState('networkidle');

  // Select Institution
  const firstInst = page.locator('#list-institution .opt-card').first();
  if (await firstInst.isVisible({ timeout: 5000 }).catch(() => false)) {
    await firstInst.click();
    await page.waitForTimeout(500);
  }

  // Select Program
  const firstProg = page.locator('#list-program .opt-card').first();
  if (await firstProg.isVisible({ timeout: 5000 }).catch(() => false)) {
    await firstProg.click();
    await page.waitForTimeout(500);
  }

  // Select Batch
  const firstBatch = page.locator('#list-batch .opt-card').first();
  if (await firstBatch.isVisible({ timeout: 5000 }).catch(() => false)) {
    await firstBatch.click();
    await page.waitForTimeout(500);
  }

  // Select Student Name
  const firstName = page.locator('#list-name .opt-card').first();
  if (await firstName.isVisible({ timeout: 5000 }).catch(() => false)) {
    await firstName.click();
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: path.join(artifactDir, 'verify_student_gate_no_pink.png') });
  console.log('✔ verify_student_gate_no_pink.png captured');

  // 2. Admin Console
  console.log('📸 2. Navigating to Admin Console (admin.html#classes)...');
  await page.goto('http://localhost:5500/admin.html#classes');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactDir, 'verify_admin_classes_no_pink.png') });
  console.log('✔ verify_admin_classes_no_pink.png captured');

  await browser.close();
  console.log('🎉 Playwright visual captures complete!');
}

run().catch(err => {
  console.error('Playwright error:', err);
  process.exit(1);
});
