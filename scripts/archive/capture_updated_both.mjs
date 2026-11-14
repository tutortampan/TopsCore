import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function captureUpdated() {
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

  const hideAll = async () => {
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
          el.style.display = 'none';
        }
      });
    });
  };

  // 1. Pop-up 01 Liveview State (Button 50x50)
  await hideAll();
  await page.evaluate(() => {
    const m = document.getElementById('photo-setup-modal');
    if (m) {
      m.classList.remove('hidden');
      m.style.display = 'flex';
    }
    const nameEl = document.getElementById('photo-student-name');
    if (nameEl) nameEl.textContent = 'Jessica Pratama';

    const snap = document.getElementById('webcam-snapshot');
    const video = document.getElementById('webcam-stream');
    const overlay = document.getElementById('camera-loading-overlay');
    if (overlay) overlay.classList.add('hidden');
    if (video) video.classList.add('hidden');
    if (snap) {
      snap.classList.remove('hidden');
      snap.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
    }

    const photoCard = document.getElementById('card-status-photo');
    const photoBadge = document.getElementById('badge-status-photo');
    if (photoCard && photoBadge) {
      photoCard.className = 'verification-card card-success';
      photoBadge.className = 'verification-status-badge status-success';
      photoBadge.innerHTML = '<span class="status-symbol">✓</span>';
    }

    const micCard = document.getElementById('card-status-mic');
    const micBadge = document.getElementById('badge-status-mic');
    if (micCard && micBadge) {
      micCard.className = 'verification-card card-success';
      micBadge.className = 'verification-status-badge status-success';
      micBadge.innerHTML = '<span class="status-symbol">✓</span>';
    }

    const confirmBtn = document.getElementById('btn-confirm-photo-setup');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = 'SAVE &amp; CONTINUE &rarr;';
    }

    const camBtn = document.getElementById('btn-camera-action');
    if (camBtn) {
      camBtn.style.width = '50px';
      camBtn.style.height = '50px';
    }
  });
  await page.waitForTimeout(400);

  const m1_50 = await page.evaluate(() => {
    const box = document.querySelector('.photo-setup-box').getBoundingClientRect();
    const vp = document.querySelector('.webcam-viewport').getBoundingClientRect();
    const btn = document.getElementById('btn-camera-action').getBoundingClientRect();
    const nameEl = document.getElementById('photo-student-name');
    const nameStyle = nameEl ? window.getComputedStyle(nameEl) : null;
    const titleEl = document.getElementById('photo-setup-title');
    const titleStyle = titleEl ? window.getComputedStyle(titleEl) : null;
    const footerEl = document.querySelector('.photo-setup-box .setup-modal-footer');
    const footerRect = footerEl ? footerEl.getBoundingClientRect() : null;
    const confirmBtnEl = document.getElementById('btn-confirm-photo-setup');
    const confirmBtnRect = confirmBtnEl ? confirmBtnEl.getBoundingClientRect() : null;
    return {
      modalBox: { width: Math.round(box.width), height: Math.round(box.height), left: Math.round(box.left), right: Math.round(box.right) },
      viewport: { width: Math.round(vp.width), height: Math.round(vp.height) },
      cameraBtn: { width: Math.round(btn.width), height: Math.round(btn.height) },
      footer: footerRect ? { width: Math.round(footerRect.width), height: Math.round(footerRect.height) } : null,
      confirmBtn: confirmBtnRect ? { width: Math.round(confirmBtnRect.width), height: Math.round(confirmBtnRect.height) } : null,
      welcomeTitle: titleStyle ? { fontSize: titleStyle.fontSize, fontWeight: titleStyle.fontWeight, textTransform: titleStyle.textTransform, color: titleStyle.color } : null,
      studentName: nameStyle ? { fontSize: nameStyle.fontSize, fontWeight: nameStyle.fontWeight, textTransform: nameStyle.textTransform, color: nameStyle.color } : null
    };
  });
  console.log('Pop-up 01 (50x50 btn) Measurements:', m1_50);

  const out50 = path.join(ARTIFACT_DIR, 'test_p01_camera50.png');
  await page.screenshot({ path: out50 });
  const outPhoto = path.join(ARTIFACT_DIR, 'mobile_popup_01_welcome_photo_setup.png');
  await page.screenshot({ path: outPhoto });
  console.log('Saved 50x50 camera button setup');

  // 1b. Pop-up 01 with 60x60 Button
  await page.evaluate(() => {
    const camBtn = document.getElementById('btn-camera-action');
    if (camBtn) {
      camBtn.style.setProperty('width', '60px', 'important');
      camBtn.style.setProperty('height', '60px', 'important');
      const icon = camBtn.querySelector('.camera-btn-icon');
      if (icon) icon.style.setProperty('font-size', '28px', 'important');
    }
  });
  await page.waitForTimeout(400);

  const m1_60 = await page.evaluate(() => {
    const btn = document.getElementById('btn-camera-action').getBoundingClientRect();
    return { cameraBtn: { width: Math.round(btn.width), height: Math.round(btn.height) } };
  });
  console.log('Pop-up 01 (60x60 btn) Measurements:', m1_60);

  const out60 = path.join(ARTIFACT_DIR, 'test_p01_camera60.png');
  await page.screenshot({ path: out60 });
  console.log('Saved 60x60 camera button setup');

  // Reset cam button for liveview capture
  await page.evaluate(() => {
    const camBtn = document.getElementById('btn-camera-action');
    if (camBtn) {
      camBtn.style.width = '';
      camBtn.style.height = '';
    }
    const snap = document.getElementById('webcam-snapshot');
    const video = document.getElementById('webcam-stream');
    const overlay = document.getElementById('camera-loading-overlay');
    if (snap) snap.classList.add('hidden');
    if (video) video.classList.remove('hidden');
    if (overlay) overlay.classList.add('hidden');

    const photoCard = document.getElementById('card-status-photo');
    const photoBadge = document.getElementById('badge-status-photo');
    if (photoCard && photoBadge) {
      photoCard.className = 'verification-card card-fail';
      photoBadge.className = 'verification-status-badge status-fail';
      photoBadge.innerHTML = '<span class="status-symbol">✕</span>';
    }

    const confirmBtn = document.getElementById('btn-confirm-photo-setup');
    if (confirmBtn) {
      confirmBtn.disabled = true;
    }
  });
  await page.waitForTimeout(400);
  const outLive = path.join(ARTIFACT_DIR, 'mobile_popup_01_welcome_liveview.png');
  await page.screenshot({ path: outLive });
  console.log('Saved liveview:', outLive);

  // 3. Pop-up 02 ABOUT YOU State
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

    const provSel = document.getElementById('intro-province');
    const citySel = document.getElementById('intro-city');
    if (provSel && window.INDONESIA_REGIONS) {
      provSel.innerHTML = '<option value="" disabled>Select province…</option>' +
        Object.keys(window.INDONESIA_REGIONS).map(p => `<option value="${p}">${p}</option>`).join('');
      provSel.value = 'Jawa Barat';

      const cities = window.INDONESIA_REGIONS['Jawa Barat'] || [];
      if (citySel) {
        citySel.disabled = false;
        citySel.innerHTML = '<option value="" disabled>Select city / district…</option>' +
          cities.map(c => `<option value="${c}">${c}</option>`).join('');
        citySel.value = 'Kota Bandung';
      }
    }

    const btn = document.getElementById('btn-confirm-introduce');
    if (btn) btn.disabled = false;
  });
  await page.waitForTimeout(400);

  const measurements = await page.evaluate(() => {
    const getBox = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        width: Math.round(r.width * 10) / 10,
        height: Math.round(r.height * 10) / 10,
        left: Math.round(r.left * 10) / 10,
        right: Math.round(r.right * 10) / 10
      };
    };
    const prov = document.getElementById('intro-province');
    const city = document.getElementById('intro-city');
    const rows = document.querySelectorAll('.intro-address-row');
    const labels = document.querySelectorAll('.intro-address-label');
    return {
      modalBox: getBox('.introduce-setup-box'),
      cardMale: getBox('#opt-gender-male'),
      cardFemale: getBox('#opt-gender-female'),
      row1: rows[0] ? getBox('.intro-address-row') : null,
      labelProv: labels[0] ? getBox('.intro-address-label') : null,
      provinceBox: getBox('#intro-province'),
      cityBox: getBox('#intro-city'),
      footer: getBox('.introduce-setup-box .setup-modal-footer'),
      confirmBtn: getBox('#btn-confirm-introduce'),
      provOptionsCount: prov ? prov.options.length : 0,
      cityOptionsCount: city ? city.options.length : 0,
      selectedProvince: prov ? prov.value : null,
      selectedCity: city ? city.value : null
    };
  });
  console.log('Pop-up 02 Measurements & Cascading:', measurements);

  const outIntro = path.join(ARTIFACT_DIR, 'mobile_popup_02_introduce_yourself.png');
  await page.screenshot({ path: outIntro });
  console.log('Saved introduce_yourself:', outIntro);

  await browser.close();
}

captureUpdated().catch(err => {
  console.error(err);
  process.exit(1);
});
