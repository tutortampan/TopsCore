import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function verifyPopup03() {
  const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    serviceWorkers: 'block'
  });

  const page = await context.newPage();

  const mockSession = {
    student_id: '11111111-2222-3333-4444-555555555555',
    student_name: 'Jessica Pratama',
    name: 'Jessica Pratama',
    institution_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    institution_name: 'Oxford English Academy',
    program_id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
    program_name: 'General English',
    batch_id: 'cccccccc-dddd-eeee-ffff-000000000000',
    batch_name: 'Batch Alpha 2026',
    gender: 'female',
    dob: '2002-05-15',
    birth_date: '2002-05-15',
    education: 'bachelor',
    province: 'Jawa Barat',
    city: 'Kota Bandung',
    photo_retake_eligible: true
  };

  await page.addInitScript((session) => {
    sessionStorage.setItem('topscore_session', JSON.stringify(session));
    sessionStorage.setItem('topscore_student_session', JSON.stringify(session));
  }, mockSession);

  await page.goto(`http://127.0.0.1:5500/dashboard.html?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const mockClasses = [
    { id: 'c1', name: 'Active Communication', _pct: 85, _statusText: '85% Progress' },
    { id: 'c2', name: 'Grammar & Structure', _pct: 60, _statusText: '60% Progress' },
    { id: 'c3', name: 'Vocabulary Mastery', _pct: 100, _statusText: '100% Completed' },
    { id: 'c4', name: 'Pronunciation & Accent', _pct: 45, _statusText: '45% Progress' },
    { id: 'c5', name: 'Business Presentation', _pct: 0, _statusText: 'Not Started' }
  ];

  await page.evaluate((classes) => {
    // Hide onboarding modals if triggered
    const ids = ['introduce-setup-modal', 'photo-setup-modal', 'gender-setup-modal', 'birthday-setup-modal', 'education-setup-modal', 'component-selector-modal', 'level-modal', 'profile-modal', 'custom-confirm-modal'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.add('hidden'); el.style.setProperty('display', 'none', 'important'); }
    });

    window._activeClasses = classes;
    window._selectedClassId = 'c1';
    window._candidateClassId = 'c1';

    const modal = document.getElementById('classes-selector-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.setProperty('display', 'flex', 'important');
    }

    // Trigger dashboard's real populate function
    if (typeof window.location !== 'undefined') {
      window.location.hash = '#select-class';
    }
  }, mockClasses);

  await page.waitForTimeout(1000);

  const outPath = path.join(ARTIFACT_DIR, 'mobile_popup_03_classes_selector.png');
  await page.screenshot({ path: outPath });
  console.log('Saved live verification screenshot:', outPath);

  const measurements = await page.evaluate(() => {
    const box = document.querySelector('.classes-selector-modal-box');
    const footer = document.querySelector('.classes-selector-modal-footer');
    const btn = document.querySelector('#btn-confirm-class-selection');
    const list = document.querySelector('#classes-selector-modal-list');
    const items = document.querySelectorAll('.classes-selector-item');
    const rBox = box ? box.getBoundingClientRect() : null;
    const rFooter = footer ? footer.getBoundingClientRect() : null;
    const rBtn = btn ? btn.getBoundingClientRect() : null;
    const rList = list ? list.getBoundingClientRect() : null;

    return {
      modalBox: rBox ? { width: Math.round(rBox.width), height: Math.round(rBox.height), left: Math.round(rBox.left), right: Math.round(rBox.right) } : null,
      footer: rFooter ? { width: Math.round(rFooter.width), height: Math.round(rFooter.height) } : null,
      button: rBtn && rFooter ? { width: Math.round(rBtn.width), height: Math.round(rBtn.height), topOffset: Math.round(rBtn.top - rFooter.top) } : null,
      itemCount: items.length,
      firstItemHeight: items[0] ? Math.round(items[0].getBoundingClientRect().height) : null
    };
  });
  console.log('Live Measurements:', measurements);

  // Test interaction: click second item (c2)
  await page.click('.classes-selector-item[data-cid="c2"]');
  await page.waitForTimeout(300);

  const isSelectedC2 = await page.evaluate(() => {
    const el = document.querySelector('.classes-selector-item[data-cid="c2"]');
    return el && el.classList.contains('selected');
  });
  console.log('Interaction test - item c2 selected on click:', isSelectedC2);

  // Test confirm button click
  await page.click('#btn-confirm-class-selection');
  await page.waitForTimeout(300);

  const isModalHidden = await page.evaluate(() => {
    const modal = document.getElementById('classes-selector-modal');
    return modal ? modal.classList.contains('hidden') : null;
  });
  console.log('Confirm button clicked - modal closed:', isModalHidden);

  await browser.close();
}

verifyPopup03().catch(err => {
  console.error(err);
  process.exit(1);
});
