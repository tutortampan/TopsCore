import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece';

async function auditAllScreens() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });

  const screens = [
    { id: 'curriculum', url: 'http://127.0.0.1:5500/admin.html#curriculum', file: 'screen_curriculum.png' },
    { id: 'dashboard', url: 'http://127.0.0.1:5500/admin.html#dashboard', file: 'screen_dashboard.png' },
    { id: 'organization', url: 'http://127.0.0.1:5500/admin.html#organization', file: 'screen_organization.png' },
    { id: 'modules', url: 'http://127.0.0.1:5500/admin.html#modules', file: 'screen_modules.png' },
    { id: 'settings', url: 'http://127.0.0.1:5500/admin.html#settings', file: 'screen_settings.png' },
    { id: 'legacy_batches', url: 'http://127.0.0.1:5500/admin.html#batches', file: 'screen_legacy_batches.png' }
  ];

  for (const s of screens) {
    try {
      await page.goto(s.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      const tables = await page.locator('table').count();
      const headers = await page.locator('th').allInnerTexts();
      console.log(`[${s.id}] URL: ${s.url} | Tables: ${tables} | Headers count: ${headers.length}`);
      if (headers.length > 0) {
        console.log(`   Headers:`, headers.slice(0, 10).join(' | '));
      }
      await page.screenshot({ path: path.join(ARTIFACT_DIR, s.file) });
    } catch (e) {
      console.error(`Error on ${s.id}:`, e.message);
    }
  }

  await browser.close();
}

auditAllScreens();

