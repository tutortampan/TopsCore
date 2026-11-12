import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/db70e579-3b54-4473-9eed-e7677e0d8525';

async function run() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });

  console.log('Navigating to theme manager...');
  await page.goto('http://127.0.0.1:5500/admin.html#vocab_vault?tab=theme_manager', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  const shot1 = path.join(ARTIFACT_DIR, 'live_theme_manager_off.png');
  await page.screenshot({ path: shot1 });
  console.log('Saved:', shot1);

  // Toggle Edit mode to ON
  console.log('Toggling edit mode ON...');
  await page.evaluate(() => {
    const btn = document.getElementById('global-edit-mode-toggle');
    if (btn) {
      btn.click();
    } else if (typeof toggleGlobalEditMode === 'function') {
      toggleGlobalEditMode();
    } else {
      document.body.classList.add('global-edit-mode-on');
      document.body.classList.remove('global-edit-mode-off');
    }
  });
  await page.waitForTimeout(1000);

  const shot2 = path.join(ARTIFACT_DIR, 'live_theme_manager_on.png');
  await page.screenshot({ path: shot2 });
  console.log('Saved:', shot2);

  console.log('Navigating to vocab grid...');
  await page.goto('http://127.0.0.1:5500/admin.html#vocab_vault?tab=vocab', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const shot3 = path.join(ARTIFACT_DIR, 'live_vocab_grid_on.png');
  await page.screenshot({ path: shot3 });
  console.log('Saved:', shot3);

  // Toggle back to OFF
  console.log('Toggling edit mode OFF...');
  await page.evaluate(() => {
    const btn = document.getElementById('global-edit-mode-toggle');
    if (btn) {
      btn.click();
    } else if (typeof toggleGlobalEditMode === 'function') {
      toggleGlobalEditMode();
    } else {
      document.body.classList.remove('global-edit-mode-on');
      document.body.classList.add('global-edit-mode-off');
    }
  });
  await page.waitForTimeout(1000);

  const shot4 = path.join(ARTIFACT_DIR, 'live_vocab_grid_off.png');
  await page.screenshot({ path: shot4 });
  console.log('Saved:', shot4);

  await browser.close();
  console.log('Capture complete!');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
