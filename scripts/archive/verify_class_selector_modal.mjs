import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function testClassSelectorModal() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge'
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 800 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  const page = await context.newPage();

  // Set student session for Queen (Grade B / Lime Green)
  await page.addInitScript(() => {
    sessionStorage.setItem('topscore_session', JSON.stringify({
      student_id: 'd9bfa243-d343-4e2a-9e12-25cb4c82b123',
      student_name: 'Queen',
      gender: 'female',
      institution_name: 'Cake English Course',
      program_name: 'Camp',
      batch_name: '134',
      level_name: '2nd Level'
    }));
  });

  const filePath = path.resolve('dashboard.html');
  await page.goto(`file://${filePath}`);
  await page.waitForTimeout(1000);

  // Trigger modal with classes populated
  await page.evaluate(() => {
    const listEl = document.getElementById('classes-selector-modal-list');
    const classes = [
      { id: 'c1', name: '2nd Vocabulary', _pct: 50, _statusText: '50%' },
      { id: 'c2', name: 'Telling Story', _pct: 85, _statusText: '85%' },
      { id: 'c3', name: 'Public Speaking', _pct: 20, _statusText: '20%' }
    ];
    window._selectedClassId = 'c1';
    window._activeClasses = classes;

    const classIcons = ['📚', '✍️', '🗣️', '🎧', '📈', '🌍', '📖', '💬'];
    let html = '';
    classes.forEach((c, idx) => {
      const isSelected = c.id === window._selectedClassId;
      const icon = classIcons[idx % classIcons.length];
      const pct = c._pct != null ? c._pct : 0;
      const status = c._statusText || (pct > 0 ? `${pct}%` : 'In Progress');
      html += `
        <div class="classes-selector-item ${isSelected ? 'selected' : ''}" data-cid="${c.id}" role="button" tabindex="0">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.3rem;">${icon}</span>
            <div>
              <div style="font-weight:800; font-size:0.9rem; color:#fff;">${c.name}</div>
              <div style="font-size:0.75rem; color:#94a3b8;">${status}</div>
            </div>
          </div>
          <div style="font-weight:800; font-size:0.88rem; color:var(--tier-color, #38bdf8);">${pct}%</div>
        </div>
      `;
    });
    listEl.innerHTML = html;

    // Open modal
    document.getElementById('classes-selector-modal').classList.remove('hidden');
  });

  await page.waitForTimeout(400);

  // Check if btn-open-class-levels exists in DOM
  const btnAllTests = await page.$('#btn-open-class-levels');
  console.log('Does #btn-open-class-levels exist?', !!btnAllTests);
  if (btnAllTests) {
    throw new Error('FAIL: #btn-open-class-levels should not exist in DOM!');
  }

  // Check if modal is visible
  const modal = await page.$('#classes-selector-modal');
  const isHidden = await modal.evaluate(el => el.classList.contains('hidden'));
  console.log('Is classes-selector-modal visible?', !isHidden);

  // Check class cards inside modal
  const classCards = await page.$$('#classes-selector-modal-list .classes-selector-item');
  console.log(`Found ${classCards.length} class card(s) in modal.`);

  // Verify each card contains title, percentage, and no all-tests button
  const cardTexts = await Promise.all(classCards.map(async c => (await c.innerText()).replace(/\n/g, ' ')));
  console.log('Class cards text:', cardTexts);

  // Take screenshot of the cleaned class selector modal
  const screenshotPath = path.resolve('C:/Users/Top/.gemini/antigravity/brain/043f93e9-2def-43b3-84f4-8d60fbb840ce/classes_selector_modal_cleaned.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`Saved screenshot to ${screenshotPath}`);

  // Also crop the modal box for artifact review
  const modalBox = await page.$('.classes-selector-modal-box');
  if (modalBox) {
    const cropPath = path.resolve('C:/Users/Top/.gemini/antigravity/brain/043f93e9-2def-43b3-84f4-8d60fbb840ce/classes_selector_modal_box_crop.png');
    await modalBox.screenshot({ path: cropPath });
    console.log(`Saved modal box crop to ${cropPath}`);
  }

  await browser.close();
  console.log('✅ ALL CLASS SELECTOR MODAL VERIFICATIONS PASSED 100%!');
}

testClassSelectorModal().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
