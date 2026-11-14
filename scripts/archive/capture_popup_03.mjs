import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function capturePopup03() {
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
    { id: 'c1', name: 'Active Communication', _pct: 85, _statusText: '85%' },
    { id: 'c2', name: 'Grammar & Structure', _pct: 60, _statusText: '60%' },
    { id: 'c3', name: 'Vocabulary Mastery', _pct: 100, _statusText: '100% ★' },
    { id: 'c4', name: 'Pronunciation & Accent', _pct: 45, _statusText: '45%' },
    { id: 'c5', name: 'Business Presentation', _pct: 0, _statusText: 'In Progress' }
  ];

  await page.evaluate((classes) => {
    // Hide all other modals
    const ids = [
      'introduce-setup-modal',
      'photo-setup-modal',
      'gender-setup-modal',
      'birthday-setup-modal',
      'education-setup-modal',
      'component-selector-modal',
      'level-modal',
      'profile-modal',
      'custom-confirm-modal'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('hidden');
        el.style.setProperty('display', 'none', 'important');
      }
    });

    window._selectedClassId = 'c1';
    window._activeClasses = classes;

    const modal = document.getElementById('classes-selector-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.setProperty('display', 'flex', 'important');
    }

    const listEl = document.getElementById('classes-selector-modal-list');
    if (listEl) {
      const classIcons = ['📚', '✍️', '🗣️', '🎧', '📈'];
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
    }
  }, mockClasses);

  await page.waitForTimeout(400);

  const measurements = await page.evaluate(() => {
    const box = document.querySelector('.classes-selector-modal-box');
    const header = document.querySelector('.classes-selector-modal-box .modal-header');
    const list = document.getElementById('classes-selector-modal-list');
    const firstItem = document.querySelector('.classes-selector-item');
    const getRect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        width: Math.round(r.width * 10) / 10,
        height: Math.round(r.height * 10) / 10,
        left: Math.round(r.left * 10) / 10,
        right: Math.round(r.right * 10) / 10
      };
    };
    return {
      modalBox: getRect(box),
      header: getRect(header),
      list: getRect(list),
      firstItem: getRect(firstItem)
    };
  });

  console.log('Pop-up 03 (Classes Selector) Current Live Measurements:', measurements);

  const outPath = path.join(ARTIFACT_DIR, 'mobile_popup_03_classes_selector.png');
  await page.screenshot({ path: outPath });
  console.log('Saved screenshot:', outPath);

  await browser.close();
}

capturePopup03().catch(err => {
  console.error(err);
  process.exit(1);
});
