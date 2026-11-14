import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function captureComparison() {
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

  // 1. CAPTURE BEFORE (CURRENT STATE)
  await page.evaluate((classes) => {
    const ids = ['introduce-setup-modal', 'photo-setup-modal', 'gender-setup-modal', 'birthday-setup-modal', 'education-setup-modal', 'component-selector-modal', 'level-modal', 'profile-modal', 'custom-confirm-modal'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.add('hidden'); el.style.setProperty('display', 'none', 'important'); }
    });

    const modal = document.getElementById('classes-selector-modal');
    if (modal) { modal.classList.remove('hidden'); modal.style.setProperty('display', 'flex', 'important'); }

    const listEl = document.getElementById('classes-selector-modal-list');
    if (listEl) {
      const classIcons = ['📚', '✍️', '🗣️', '🎧', '📈'];
      let html = '';
      classes.forEach((c, idx) => {
        const isSelected = c.id === 'c1';
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

  await page.waitForTimeout(300);
  const outBefore = path.join(ARTIFACT_DIR, 'mobile_popup_03_before.png');
  await page.screenshot({ path: outBefore });
  console.log('Saved Before screenshot:', outBefore);

  // 2. CAPTURE AFTER (STANDARDIZED WITH 60px FOOTER, ZERO EMOJIS, 20px MARGIN, DYNAMIC COLORS)
  await page.evaluate((classes) => {
    const modal = document.getElementById('classes-selector-modal');
    modal.style.padding = '20px';

    const box = document.querySelector('.classes-selector-modal-box');
    box.style.cssText = 'width: 100% !important; max-width: 350px !important; padding: 0 !important; border-radius: 20px !important; overflow: hidden !important; background: #0f172a !important; border: 1px solid rgba(255, 255, 255, 0.12) !important; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6) !important; display: flex !important; flex-direction: column !important;';

    // SVG icons for classes (Zero Emojis!)
    const svgIcons = [
      // Speech / Communication
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
      // Pen / Structure
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>`,
      // Book / Vault
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
      // Soundwave / Accent
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`,
      // Presentation / Briefing
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`
    ];

    const getGradeColor = (p) => {
      if (p === 100) return '#ff2d87'; // Star Pink
      if (p >= 90) return '#00c000';  // Grade A Green
      if (p >= 80) return '#95ff00';  // Grade B Lime
      if (p >= 60) return '#ffff00';  // Grade C Yellow
      if (p >= 30) return '#ff8c00';  // Grade D Orange
      return '#ff0000';              // Grade E Red
    };

    box.innerHTML = `
      <div style="padding: 16px 16px 10px 16px; box-sizing: border-box; width: 100%;">
        <!-- Header Zone with Cyan Title and Divider -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.12);">
          <div>
            <h3 style="font-size: 20px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #38bdf8; margin: 0; line-height: 1.2;">LOBBY</h3>
            <p style="font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin: 4px 0 0 0;">SELECT CLASS TO ENTER</p>
          </div>
          <button style="background: none; border: none; color: #94a3b8; font-size: 16px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 6px; padding: 0;">✕</button>
        </div>

        <!-- Class Cards List (10px Container Gap, 16px Class Name, 12px Subtitle, Dynamic Grade Colors) -->
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${classes.map((c, idx) => {
            const isSelected = c.id === 'c1';
            const iconSvg = svgIcons[idx % svgIcons.length];
            const pct = c._pct != null ? c._pct : 0;
            const pctColor = getGradeColor(pct);
            const scoreLabel = pct === 100 ? '100% ★' : `${pct}%`;
            return `
              <div style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 14px;
                border-radius: 12px;
                background: ${isSelected ? 'rgba(56, 189, 248, 0.12)' : '#151D2F'};
                border: 1.5px solid ${isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)'};
                box-shadow: ${isSelected ? '0 0 16px rgba(56, 189, 248, 0.25)' : 'none'};
                cursor: pointer;
                box-sizing: border-box;
                height: 52px;
              ">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: ${isSelected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                  ">
                    ${iconSvg}
                  </div>
                  <div style="text-align: left;">
                    <div style="font-size: 16px; font-weight: 700; color: #f8fafc; line-height: 1.2;">${c.name}</div>
                    <div style="font-size: 12px; font-weight: 600; color: #94a3b8; line-height: 1.2;">${c._statusText}</div>
                  </div>
                </div>
                <div style="font-size: 16px; font-weight: 800; color: ${pctColor}; flex-shrink: 0;">${scoreLabel}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Ergonomic 60px Modal Footer Invariant -->
      <div style="
        height: 60px !important;
        min-height: 60px !important;
        max-height: 60px !important;
        padding: 10px 16px !important;
        box-sizing: border-box !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
        background: rgba(15, 23, 42, 0.6) !important;
        width: 100% !important;
        flex-shrink: 0 !important;
      ">
        <button style="
          height: 40px !important;
          line-height: 40px !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 16px !important;
          font-size: 16px !important;
          font-weight: 700 !important;
          border-radius: 10px !important;
          background: #0284c7;
          border: 1px solid #38bdf8;
          color: #fff;
          cursor: pointer;
        ">ENTER CLASS &rarr;</button>
      </div>
    `;
  }, mockClasses);

  await page.waitForTimeout(300);
  const outAfter = path.join(ARTIFACT_DIR, 'mobile_popup_03_after.png');
  await page.screenshot({ path: outAfter });
  console.log('Saved After screenshot:', outAfter);

  const measurementsAfter = await page.evaluate(() => {
    const box = document.querySelector('.classes-selector-modal-box');
    if (!box) return null;
    const rBox = box.getBoundingClientRect();
    const footer = box.lastElementChild;
    const rFooter = footer ? footer.getBoundingClientRect() : null;
    const btn = footer ? footer.querySelector('button') : null;
    const rBtn = btn ? btn.getBoundingClientRect() : null;
    return {
      modalBox: { width: Math.round(rBox.width), height: Math.round(rBox.height), left: Math.round(rBox.left), right: Math.round(rBox.right) },
      footer: rFooter ? { width: Math.round(rFooter.width), height: Math.round(rFooter.height) } : null,
      button: rBtn && rFooter ? { width: Math.round(rBtn.width), height: Math.round(rBtn.height), topOffset: Math.round(rBtn.top - rFooter.top) } : null
    };
  });
  console.log('Pop-up 03 After Measurements:', measurementsAfter);

  await browser.close();
}

captureComparison().catch(err => {
  console.error(err);
  process.exit(1);
});
