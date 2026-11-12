import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_selected_class_id', '2ccf6468-1e03-41d1-b72b-1d84dcad85b2');
    localStorage.setItem('topscore_selected_class_name', 'Camp 2nd Vocabulary');
    localStorage.setItem('topscore_admin_class_hub_tab', 'attendance');
  });

  console.log('Navigating to Camp 2nd Vocabulary Class Hub (#class-hub)...');
  await page.goto('http://127.0.0.1:5500/admin.html#class-hub', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);

  // Enable Edit Mode
  console.log('Enabling Edit Mode...');
  await page.evaluate(() => {
    document.body.classList.add('global-edit-mode-on');
    if (typeof window.setGlobalEditMode === 'function') window.setGlobalEditMode(true);
    window.dispatchEvent(new CustomEvent('topscore:editmode', { detail: { enabled: true } }));
  });
  await page.waitForTimeout(1500);

  console.log('Capturing Camp 2nd Vocabulary Matrix in Edit Mode...');
  await page.screenshot({ path: 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/verify_camp_2nd_matrix_edit_mode.png' });
  console.log('Saved verify_camp_2nd_matrix_edit_mode.png');

  await browser.close();
}

main().catch(console.error);
