import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function testFooter() {
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

  // Inject 60px footer into Pop-up 01 and Pop-up 02 to test
  const res = await page.evaluate(() => {
    // 1. Structure Pop-up 01
    const p1Box = document.querySelector('.photo-setup-box');
    const p1Btn = document.getElementById('btn-confirm-photo-setup');
    const p1P6 = p1Box ? p1Box.querySelector('.p-6') : null;

    if (p1Box && p1Btn && p1P6) {
      p1Box.style.padding = '0';
      p1Box.style.overflow = 'hidden';
      p1P6.className = 'setup-modal-body';
      p1P6.style.padding = '16px 16px 14px 16px';
      
      const footer1 = document.createElement('div');
      footer1.className = 'modal-footer setup-modal-footer';
      footer1.style.cssText = 'height: 60px !important; min-height: 60px !important; max-height: 60px !important; padding: 10px 16px !important; box-sizing: border-box !important; display: flex !important; align-items: center !important; justify-content: center !important; border-top: 1px solid rgba(255, 255, 255, 0.08) !important; background: rgba(15, 23, 42, 0.6) !important; width: 100% !important; flex-shrink: 0 !important;';
      
      p1Btn.style.margin = '0';
      p1Btn.style.height = '40px';
      footer1.appendChild(p1Btn);
      p1Box.appendChild(footer1);
    }

    // 2. Structure Pop-up 02
    const p2Box = document.querySelector('.introduce-setup-box');
    const p2Btn = document.getElementById('btn-confirm-introduce');
    const p2P6 = p2Box ? p2Box.querySelector('.p-6') : null;

    if (p2Box && p2Btn && p2P6) {
      p2Box.style.padding = '0';
      p2Box.style.overflow = 'hidden';
      p2P6.className = 'setup-modal-body';
      p2P6.style.padding = '16px 16px 14px 16px';
      
      const footer2 = document.createElement('div');
      footer2.className = 'modal-footer setup-modal-footer';
      footer2.style.cssText = 'height: 60px !important; min-height: 60px !important; max-height: 60px !important; padding: 10px 16px !important; box-sizing: border-box !important; display: flex !important; align-items: center !important; justify-content: center !important; border-top: 1px solid rgba(255, 255, 255, 0.08) !important; background: rgba(15, 23, 42, 0.6) !important; width: 100% !important; flex-shrink: 0 !important;';
      
      p2Btn.style.margin = '0';
      p2Btn.style.height = '40px';
      footer2.appendChild(p2Btn);
      p2Box.appendChild(footer2);
    }

    // Hide others, show P1
    const ids = ['photo-setup-modal', 'introduce-setup-modal'];
    document.getElementById('introduce-setup-modal').style.display = 'none';
    const m1 = document.getElementById('photo-setup-modal');
    m1.classList.remove('hidden');
    m1.style.display = 'flex';

    // Populate mock P1 state
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
    p1Btn.disabled = false;

    const f1Rect = document.querySelector('.photo-setup-box .setup-modal-footer').getBoundingClientRect();
    const b1Rect = p1Btn.getBoundingClientRect();
    const box1Rect = p1Box.getBoundingClientRect();

    return {
      modalBox1: { width: Math.round(box1Rect.width), height: Math.round(box1Rect.height) },
      footer1: { width: Math.round(f1Rect.width), height: Math.round(f1Rect.height) },
      button1: { width: Math.round(b1Rect.width), height: Math.round(b1Rect.height), topOffset: Math.round(b1Rect.top - f1Rect.top) }
    };
  });

  console.log('Pop-up 01 with 60px Footer Audit:', res);
  const outP1 = path.join(ARTIFACT_DIR, 'test_p01_with_60px_footer.png');
  await page.screenshot({ path: outP1 });

  // Now show P2
  await page.evaluate(() => {
    document.getElementById('photo-setup-modal').style.display = 'none';
    const m2 = document.getElementById('introduce-setup-modal');
    m2.classList.remove('hidden');
    m2.style.display = 'flex';

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
    const p2Btn = document.getElementById('btn-confirm-introduce');
    if (p2Btn) p2Btn.disabled = false;
  });

  const res2 = await page.evaluate(() => {
    const p2Box = document.querySelector('.introduce-setup-box');
    const p2Btn = document.getElementById('btn-confirm-introduce');
    const f2Rect = document.querySelector('.introduce-setup-box .setup-modal-footer').getBoundingClientRect();
    const b2Rect = p2Btn.getBoundingClientRect();
    const box2Rect = p2Box.getBoundingClientRect();
    return {
      modalBox2: { width: Math.round(box2Rect.width), height: Math.round(box2Rect.height) },
      footer2: { width: Math.round(f2Rect.width), height: Math.round(f2Rect.height) },
      button2: { width: Math.round(b2Rect.width), height: Math.round(b2Rect.height), topOffset: Math.round(b2Rect.top - f2Rect.top) }
    };
  });
  console.log('Pop-up 02 with 60px Footer Audit:', res2);
  const outP2 = path.join(ARTIFACT_DIR, 'test_p02_with_60px_footer.png');
  await page.screenshot({ path: outP2 });

  await browser.close();
}

testFooter().catch(err => {
  console.error(err);
  process.exit(1);
});
