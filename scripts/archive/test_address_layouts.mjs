import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function testLayouts() {
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
    photo_retake_eligible: true
  };

  await page.addInitScript((session) => {
    sessionStorage.setItem('topscore_session', JSON.stringify(session));
    sessionStorage.setItem('topscore_student_session', JSON.stringify(session));
  }, mockSession);

  await page.goto(`http://127.0.0.1:5500/dashboard.html?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Setup base Introduce Modal
  const setupModal = async () => {
    await page.evaluate(() => {
      const ids = [
        'introduce-setup-modal',
        'photo-setup-modal',
        'gender-setup-modal',
        'birthday-setup-modal',
        'education-setup-modal',
        'classes-selector-modal',
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

      const m = document.getElementById('introduce-setup-modal');
      if (m) {
        m.classList.remove('hidden');
        m.style.setProperty('display', 'flex', 'important');
      }

      const femaleCard = document.getElementById('opt-gender-female');
      if (femaleCard) {
        femaleCard.classList.add('selected', 'active');
        femaleCard.setAttribute('aria-pressed', 'true');
      }
      const maleCard = document.getElementById('opt-gender-male');
      if (maleCard) {
        maleCard.classList.remove('selected', 'active');
        maleCard.setAttribute('aria-pressed', 'false');
      }

      const dayInp = document.getElementById('intro-birth-day');
      if (dayInp) dayInp.value = '15';

      const monthSel = document.getElementById('intro-birth-month');
      if (monthSel) monthSel.value = '5';

      const yearInp = document.getElementById('intro-birth-year');
      if (yearInp) yearInp.value = '2002';

      const eduSel = document.getElementById('intro-education-level');
      if (eduSel) eduSel.value = 'bachelor';

      const btn = document.getElementById('btn-confirm-introduce');
      if (btn) btn.disabled = false;
    });
  };

  // --- TEST LAYOUT 1: Horizontal Row (Label on Left, Equal-Sized Dropdown on Right) ---
  await setupModal();
  await page.evaluate(() => {
    const addrSec = document.querySelector('.intro-section-address');
    if (addrSec) {
      addrSec.innerHTML = `
        <div class="intro-group-header">
          <span class="intro-group-title">ADDRESS</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <label style="width: 105px; flex-shrink: 0; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;" for="intro-province">PROVINCE</label>
            <select id="intro-province" class="form-control intro-select" style="flex: 1; height: 40px; margin: 0;">
              <option value="Jawa Barat" selected>Jawa Barat</option>
            </select>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <label style="width: 105px; flex-shrink: 0; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;" for="intro-city">CITY / DISTRICT</label>
            <select id="intro-city" class="form-control intro-select" style="flex: 1; height: 40px; margin: 0;">
              <option value="Kota Bandung" selected>Kota Bandung</option>
            </select>
          </div>
        </div>
      `;
    }
  });
  await page.waitForTimeout(300);
  const outLayout1 = path.join(ARTIFACT_DIR, 'test_address_layout1_inline_label.png');
  await page.screenshot({ path: outLayout1 });
  console.log('Saved Layout 1 (Inline Label):', outLayout1);

  // --- TEST LAYOUT 2: 2 Columns Grid (Province Left, City Right, Equal Size 50/50) ---
  await setupModal();
  await page.evaluate(() => {
    const addrSec = document.querySelector('.intro-section-address');
    if (addrSec) {
      addrSec.innerHTML = `
        <div class="intro-group-header">
          <span class="intro-group-title">ADDRESS</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div style="display: flex; flex-direction: column;">
            <label class="intro-field-label" style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;" for="intro-province">PROVINCE</label>
            <select id="intro-province" class="form-control intro-select" style="width: 100%; height: 40px; margin: 0;">
              <option value="Jawa Barat" selected>Jawa Barat</option>
            </select>
          </div>
          <div style="display: flex; flex-direction: column;">
            <label class="intro-field-label" style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;" for="intro-city">CITY / DISTRICT</label>
            <select id="intro-city" class="form-control intro-select" style="width: 100%; height: 40px; margin: 0;">
              <option value="Kota Bandung" selected>Kota Bandung</option>
            </select>
          </div>
        </div>
      `;
    }
  });
  await page.waitForTimeout(300);
  const outLayout2 = path.join(ARTIFACT_DIR, 'test_address_layout2_two_columns.png');
  await page.screenshot({ path: outLayout2 });
  console.log('Saved Layout 2 (Two Columns):', outLayout2);

  await browser.close();
}

testLayouts().catch(err => {
  console.error(err);
  process.exit(1);
});
