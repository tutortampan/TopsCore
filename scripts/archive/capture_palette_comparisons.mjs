import { chromium } from '@playwright/test';
import path from 'node:path';

const artifactDir = 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece';

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Set authenticated admin session
  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_selected_class_id', '2ccf6468-1e03-41d1-b72b-1d84dcad85b2');
    localStorage.setItem('topscore_selected_class_name', 'Camp 2nd Vocabulary');
    localStorage.setItem('topscore_admin_class_hub_tab', 'attendance');
  });

  console.log('📸 1. Capturing Current State (Before): Student Roster...');
  await page.goto('http://localhost:5500/admin.html#students', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Take full screenshot of Roster (Current)
  await page.screenshot({ path: path.join(artifactDir, 'before_roster_green_elements.png') });
  console.log('✔ before_roster_green_elements.png captured');

  // Close-up of lower infobar
  const infobar = page.locator('#admin-bottom-infobar');
  if (await infobar.isVisible().catch(() => false)) {
    await infobar.screenshot({ path: path.join(artifactDir, 'before_next_btn_closeup.png') });
    console.log('✔ before_next_btn_closeup.png captured');
  }

  // 2. Modules Hub (Current)
  console.log('📸 2. Capturing Current State (Before): Modules Hub...');
  await page.goto('http://localhost:5500/admin.html#modules', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, 'before_modules_green_badge.png') });
  console.log('✔ before_modules_green_badge.png captured');

  // 3. Classes Hub (Current)
  console.log('📸 3. Capturing Current State (Before): Classes Hub...');
  await page.goto('http://localhost:5500/admin.html#classes', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, 'before_classes_tags.png') });
  console.log('✔ before_classes_tags.png captured');

  // 4. NOW SIMULATE PROPOSED "AFTER" SYSTEM PALETTE VIA RUNTIME INJECTION
  console.log('🎨 4. Simulating Proposed Palette (After) on Student Roster...');
  await page.goto('http://localhost:5500/admin.html#students', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Apply Proposed Palette transformations in-page
  await page.evaluate(() => {
    // 1. Promote button: Tactical Sky Blue (#0284c7 with #38bdf8 border and white text)
    const btn = document.getElementById('btn-promote-all-eligible');
    if (btn) {
      btn.style.background = '#0284c7';
      btn.style.borderColor = '#38bdf8';
      btn.style.color = '#ffffff';
      btn.style.boxShadow = '0 0 12px rgba(56, 189, 248, 0.35)';
    }

    // 2. Active Tab Val Color -> #38bdf8
    const activeTab = document.querySelector('.topbar-tab-card[data-tab-id="active"]');
    if (activeTab) {
      const num = activeTab.querySelector('strong') || activeTab.querySelector('span:last-child');
      if (num) num.style.color = '#38bdf8';
    }

    // 3. Status dots and success badges -> Tactical Cyan
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .badge-success {
        background: rgba(56, 189, 248, 0.12) !important;
        color: #38bdf8 !important;
        border-color: rgba(56, 189, 248, 0.3) !important;
      }
      .badge-tag-ongoing {
        background: rgba(56, 189, 248, 0.12) !important;
        color: #38bdf8 !important;
        border-color: rgba(56, 189, 248, 0.3) !important;
      }
      .status-dot.dot-active {
        background: #38bdf8 !important;
        box-shadow: 0 0 8px rgba(56, 189, 248, 0.7) !important;
      }
    `;
    document.head.appendChild(styleEl);
  });

  await page.screenshot({ path: path.join(artifactDir, 'after_roster_tactical_blue.png') });
  console.log('✔ after_roster_tactical_blue.png captured');

  const afterInfobar = page.locator('#admin-bottom-infobar');
  if (await afterInfobar.isVisible().catch(() => false)) {
    await afterInfobar.screenshot({ path: path.join(artifactDir, 'after_next_btn_closeup.png') });
    console.log('✔ after_next_btn_closeup.png captured');
  }

  // 5. Simulating Proposed Palette on Modules Hub
  console.log('🎨 5. Simulating Proposed Palette (After) on Modules Hub...');
  await page.goto('http://localhost:5500/admin.html#modules', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const badges = document.querySelectorAll('.workspace-lower-panel .badge, #modules-container .badge');
    badges.forEach(b => {
      if (b.textContent.includes('ACTIVE')) {
        b.style.background = 'rgba(56, 189, 248, 0.12)';
        b.style.color = '#38bdf8';
        b.style.borderColor = 'rgba(56, 189, 248, 0.3)';
        b.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.2)';
      }
    });
  });
  await page.screenshot({ path: path.join(artifactDir, 'after_modules_tactical_cyan.png') });
  console.log('✔ after_modules_tactical_cyan.png captured');

  await browser.close();
  console.log('🎉 All Authenticated Before & After Visual Comparisons successfully captured!');
}

run().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
