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

  await page.goto('http://127.0.0.1:5500/admin.html#vocab_vault?tab=blueprint', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const codes = await page.locator('#blueprint-matrix-table tbody tr td:nth-child(2)').allInnerTexts();
  console.log('Test Blueprint Codes (first 10):', codes.slice(0, 10));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_table_test_blueprint.png') });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_blueprint_codes_fixed.png') });

  await browser.close();
})();

